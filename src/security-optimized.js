import { ValidationError } from './errors.js';

// Security levels
export const SECURITY_LEVELS = {
  STRICT: 'strict',
  MODERATE: 'moderate', 
  BASIC: 'basic',
  DISABLED: 'disabled'
};

// Granular security configuration with individual feature flags
function getSecurityConfig() {
  return {
    LEVEL: process.env.SECURITY_LEVEL || SECURITY_LEVELS.MODERATE,
    
    // Content filtering options
    BLOCK_EXPLICIT_CONTENT: process.env.BLOCK_EXPLICIT_CONTENT !== 'false',
    BLOCK_VIOLENCE: process.env.BLOCK_VIOLENCE !== 'false',
    BLOCK_ILLEGAL_ACTIVITIES: process.env.BLOCK_ILLEGAL_ACTIVITIES !== 'false',
    BLOCK_ADULT_CONTENT: process.env.BLOCK_ADULT_CONTENT !== 'false',
    
    // Injection detection options
    DETECT_PROMPT_INJECTION: process.env.DETECT_PROMPT_INJECTION !== 'false',
    DETECT_SYSTEM_PROMPTS: process.env.DETECT_SYSTEM_PROMPTS !== 'false',
    DETECT_INSTRUCTION_OVERRIDE: process.env.DETECT_INSTRUCTION_OVERRIDE !== 'false',
    
    // Sanitization options
    SANITIZE_INPUT: process.env.SANITIZE_INPUT !== 'false',
    REMOVE_SCRIPTS: process.env.REMOVE_SCRIPTS !== 'false',
    LIMIT_REPEATED_CHARS: process.env.LIMIT_REPEATED_CHARS !== 'false',
    
    // Performance options
    ENABLE_PATTERN_CACHING: process.env.ENABLE_PATTERN_CACHING !== 'false',
    MAX_PROMPT_LENGTH_FOR_DEEP_SCAN: parseInt(process.env.MAX_PROMPT_LENGTH_FOR_DEEP_SCAN) || 1000,
    
    // Strictness overrides
    ALLOW_EDUCATIONAL_CONTENT: process.env.ALLOW_EDUCATIONAL_CONTENT === 'true',
    WHITELIST_PATTERNS: (process.env.WHITELIST_PATTERNS || '').split(',').filter(Boolean)
  };
}

// Cached compiled patterns for better performance
class PatternCache {
  constructor() {
    this.cache = new Map();
    this.lastConfigHash = null;
    this.compiledPatterns = null;
  }

  getCompiledPatterns() {
    const config = getSecurityConfig();
    const configHash = JSON.stringify(config);
    
    if (this.lastConfigHash === configHash && this.compiledPatterns) {
      return this.compiledPatterns;
    }

    this.compiledPatterns = this.compilePatterns(config);
    this.lastConfigHash = configHash;
    return this.compiledPatterns;
  }

  compilePatterns(config) {
    const patterns = {
      injection: [],
      suspicious: [],
      explicit: [],
      whitelist: []
    };

    // Base injection patterns - only include if detection is enabled
    if (config.DETECT_PROMPT_INJECTION) {
      if (config.DETECT_INSTRUCTION_OVERRIDE) {
        patterns.injection.push({
          regex: /ignore\s+(previous|above|all|prior)\s.*?(instructions|commands|rules)/i,
          severity: 'high',
          type: 'instruction_override'
        });
      }
      
      if (config.DETECT_SYSTEM_PROMPTS) {
        patterns.injection.push({
          regex: /system\s*:\s*(you\s+are|act\s+as|pretend|forget|return)/i,
          severity: 'high',
          type: 'system_injection'
        });
      }

      // Always include these critical patterns
      patterns.injection.push(
        {
          regex: /\{\{[^}]*\}\}|<\|[^|]*\|>|<system>|<\/system>/i,
          severity: 'high',
          type: 'template_injection'
        },
        {
          regex: /\[INST\]|\[\/INST\]|<s>|<\/s>/i,
          severity: 'high',
          type: 'format_injection'
        },
        {
          regex: /stop\.\s*new\s+(instruction|command)/i,
          severity: 'high',
          type: 'instruction_break'
        }
      );
    }

    // Suspicious patterns - lighter weight detection
    if (config.LEVEL !== SECURITY_LEVELS.DISABLED) {
      patterns.suspicious.push(
        {
          regex: /what\s+(are\s+your|is\s+the)\s+(instructions|system\s+prompt)/i,
          severity: 'medium',
          type: 'prompt_probing'
        },
        {
          regex: /(admin|root|developer)\s+(access|mode|privileges)/i,
          severity: 'medium',
          type: 'privilege_escalation'
        }
      );
    }

    // Content filtering patterns - modular based on config
    if (config.BLOCK_EXPLICIT_CONTENT) {
      if (config.BLOCK_VIOLENCE) {
        patterns.explicit.push({
          regex: /how\s+to\s+(kill|murder|harm)\s+/i,
          severity: 'high',
          type: 'violence'
        });
      }
      
      if (config.BLOCK_ILLEGAL_ACTIVITIES) {
        patterns.explicit.push({
          regex: /how\s+to\s+(hack|steal|fraud)/i,
          severity: 'high',
          type: 'illegal_activity'
        });
      }
    }

    // Whitelist patterns for educational content
    if (config.ALLOW_EDUCATIONAL_CONTENT) {
      patterns.whitelist.push(
        {
          regex: /(educational|academic|research|study|learn about)/i,
          type: 'educational'
        },
        {
          regex: /(information about|explain|describe|what is)/i,
          type: 'informational'
        }
      );
    }

    // Custom whitelist patterns
    config.WHITELIST_PATTERNS.forEach(pattern => {
      try {
        patterns.whitelist.push({
          regex: new RegExp(pattern, 'i'),
          type: 'custom_whitelist'
        });
      } catch (e) {
        console.warn('Invalid whitelist pattern:', pattern);
      }
    });

    return patterns;
  }
}

const patternCache = new PatternCache();

/**
 * Optimized input sanitization with configurable options
 */
export function sanitizeInput(input) {
  const config = getSecurityConfig();
  if (!config.SANITIZE_INPUT || config.LEVEL === SECURITY_LEVELS.DISABLED) {
    return input;
  }

  let sanitized = input;

  // Remove control characters (always safe)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Optional script removal
  if (config.REMOVE_SCRIPTS) {
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript\s*:/gi, '');
  }

  // Optional repeated character limiting  
  if (config.LIMIT_REPEATED_CHARS) {
    sanitized = sanitized.replace(/(.)\1{100,}/g, '$1'.repeat(10));
  }

  // Limit excessive whitespace
  sanitized = sanitized.replace(/\s{10,}/g, ' '.repeat(5));

  // Handle escape sequences properly
  sanitized = sanitized.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

  return sanitized.trim();
}

/**
 * Fast pattern matching with early termination
 */
function fastPatternMatch(text, patterns, maxMatches = 3) {
  const matches = [];
  const lowerText = text.toLowerCase();
  
  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      matches.push(pattern);
      if (matches.length >= maxMatches) {
        break; // Early termination for performance
      }
    }
  }
  
  return matches;
}

/**
 * Optimized security validation with performance considerations
 */
export function validatePromptSecurity(prompt) {
  const config = getSecurityConfig();
  const results = {
    original: prompt,
    sanitized: null,
    isValid: true,
    warnings: [],
    blocked: false,
    reasons: [],
    performance: {
      startTime: Date.now(),
      checks: []
    }
  };

  // Quick exit for disabled security
  if (config.LEVEL === SECURITY_LEVELS.DISABLED) {
    results.sanitized = prompt;
    results.performance.totalTime = Date.now() - results.performance.startTime;
    return results;
  }

  try {
    const checkStart = Date.now();
    
    // Step 1: Sanitize input
    results.sanitized = sanitizeInput(prompt);
    results.performance.checks.push({
      name: 'sanitization',
      time: Date.now() - checkStart
    });

    // Step 2: Check prompt length for deep scanning
    const isLongPrompt = results.sanitized.length > config.MAX_PROMPT_LENGTH_FOR_DEEP_SCAN;
    const patterns = patternCache.getCompiledPatterns();

    // Step 3: Whitelist check first (performance optimization)
    if (patterns.whitelist.length > 0) {
      const whitelistStart = Date.now();
      const whitelistMatches = fastPatternMatch(results.sanitized, patterns.whitelist, 1);
      results.performance.checks.push({
        name: 'whitelist',
        time: Date.now() - whitelistStart
      });
      
      if (whitelistMatches.length > 0) {
        // Allow whitelisted content with reduced scrutiny
        results.warnings.push({
          type: 'whitelisted_content',
          description: 'Content allowed due to whitelist match',
          match: whitelistMatches[0].type
        });
        results.performance.totalTime = Date.now() - results.performance.startTime;
        return results;
      }
    }

    // Step 4: Fast injection detection
    if (config.DETECT_PROMPT_INJECTION && patterns.injection.length > 0) {
      const injectionStart = Date.now();
      const injectionMatches = fastPatternMatch(
        results.sanitized, 
        patterns.injection, 
        isLongPrompt ? 1 : 3 // Reduce checks for long prompts
      );
      results.performance.checks.push({
        name: 'injection',
        time: Date.now() - injectionStart
      });

      const highSeverityInjections = injectionMatches.filter(m => m.severity === 'high');
      if (highSeverityInjections.length > 0) {
        results.isValid = false;
        results.blocked = true;
        results.reasons.push({
          type: 'prompt_injection',
          description: 'Potential prompt injection detected',
          patterns: highSeverityInjections
        });
        results.performance.totalTime = Date.now() - results.performance.startTime;
        return results;
      }
      
      // Store injection matches for later aggregation
      if (injectionMatches.length > 0) {
        results.warnings.push({
          type: 'potential_injection',
          description: 'Potential injection patterns detected',
          patterns: injectionMatches
        });
      }
    }

    // Step 5: Content filtering (skip for very long prompts in basic mode)
    if (config.BLOCK_EXPLICIT_CONTENT && 
        patterns.explicit.length > 0 && 
        !(isLongPrompt && config.LEVEL === SECURITY_LEVELS.BASIC)) {
      
      const contentStart = Date.now();
      const contentMatches = fastPatternMatch(results.sanitized, patterns.explicit, 2);
      results.performance.checks.push({
        name: 'content_filter',
        time: Date.now() - contentStart
      });

      if (contentMatches.length > 0) {
        results.isValid = false;
        results.blocked = true;
        results.reasons.push({
          type: 'explicit_content',
          description: 'Explicit or harmful content detected',
          patterns: contentMatches
        });
        results.performance.totalTime = Date.now() - results.performance.startTime;
        return results;
      }
    }

    // Step 6: Suspicious pattern detection (warnings only)
    if (patterns.suspicious.length > 0 && !isLongPrompt) {
      const suspiciousStart = Date.now();
      const suspiciousMatches = fastPatternMatch(results.sanitized, patterns.suspicious, 1);
      results.performance.checks.push({
        name: 'suspicious',
        time: Date.now() - suspiciousStart
      });

      if (suspiciousMatches.length > 0) {
        results.warnings.push({
          type: 'suspicious_patterns',
          description: 'Suspicious patterns detected but not blocked',
          patterns: suspiciousMatches
        });
      }
    }

    results.performance.totalTime = Date.now() - results.performance.startTime;
    return results;

  } catch (error) {
    results.isValid = false;
    results.blocked = true;
    results.reasons.push({
      type: 'validation_error',
      description: 'Error during security validation',
      error: error.message
    });
    results.performance.totalTime = Date.now() - results.performance.startTime;
    return results;
  }
}

/**
 * Simplified security check for production use
 */
export function securityCheck(prompt) {
  // Graceful handling of null/undefined
  if (prompt == null) {
    throw new ValidationError('Invalid prompt: cannot be null or undefined');
  }
  
  if (typeof prompt !== 'string') {
    throw new ValidationError('Invalid prompt: must be a string');
  }

  const validation = validatePromptSecurity(prompt);

  // Log performance metrics in debug mode
  if (process.env.NODE_ENV !== 'test' && process.env.LOG_LEVEL === 'debug') {
    console.debug('Security validation performance:', validation.performance);
  }

  if (validation.blocked) {
    const reasons = validation.reasons.map(r => r.description).join('; ');
    throw new ValidationError(`Security check failed: ${reasons}`);
  }

  // Log warnings in non-test environments
  if (validation.warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('Security warnings for prompt:', validation.warnings);
  }

  return validation.sanitized;
}

/**
 * Performance monitoring utilities
 */
export function getSecurityStats() {
  return {
    cacheStats: {
      hasCompiledPatterns: !!patternCache.compiledPatterns,
      lastConfigUpdate: patternCache.lastConfigHash ? 'cached' : 'not_cached'
    },
    config: getSecurityConfig()
  };
}

/**
 * Reset pattern cache (useful for testing or config changes)
 */
export function resetPatternCache() {
  patternCache.cache.clear();
  patternCache.lastConfigHash = null;
  patternCache.compiledPatterns = null;
}

// Export for backward compatibility
export const SECURITY_CONFIG = getSecurityConfig();
export { detectPromptInjection, filterExplicitContent } from './security.js';