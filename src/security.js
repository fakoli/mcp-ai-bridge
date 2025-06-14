import { ValidationError } from './errors.js';

// Configurable security levels
export const SECURITY_LEVELS = {
  STRICT: 'strict',
  MODERATE: 'moderate', 
  BASIC: 'basic'
};

// Security configuration - dynamic to allow test overrides
function getSecurityConfig() {
  return {
    LEVEL: process.env.SECURITY_LEVEL || SECURITY_LEVELS.MODERATE,
    BLOCK_EXPLICIT_CONTENT: process.env.BLOCK_EXPLICIT_CONTENT !== 'false',
    DETECT_PROMPT_INJECTION: process.env.DETECT_PROMPT_INJECTION !== 'false',
    SANITIZE_INPUT: process.env.SANITIZE_INPUT !== 'false'
  };
}

// Explicit content patterns (basic detection)
const EXPLICIT_PATTERNS = [
  /\b(kill|murder|suicide|self-harm|violence)\b/i,
  /how\s+to\s+(kill|murder|harm)/i,
  /\b(hack|exploit|bypass|jailbreak)\s+(system|security|filter|safety)\b/i,
  /how\s+to\s+hack/i,
  /\b(illegal|criminal|fraud|scam|terrorism)\b/i,
  /\b(drug|cocaine|heroin|meth)\s+(trafficking|dealing)/i,
  /\b(child|minor|underage)\s+(abuse|exploitation|inappropriate)\b/i,
  /\b(hate\s+speech|racial\s+slur|nazi|terrorism)\b/i
];

// Prompt injection patterns  
const INJECTION_PATTERNS = [
  /ignore\s+(previous|above|all|prior)\s.*?(instructions|commands|rules)/i,
  /system\s*:\s*(you\s+are|act\s+as|pretend|forget|return)/i,
  /new\s+(instruction|command|task|role)\s*:/i,
  /(override|bypass|disable)\s+(safety|security|filter)/i,
  /\{\{[^}]*\}\}|<\|[^|]*\|>|<system>|<\/system>/i,
  /\[INST\]|\[\/INST\]|<s>|<\/s>/i,
  /(human|assistant|user)\s*:\s*$/im,
  /role\s*:\s*(system|admin|root)/i,
  /forget\s+(everything|all|previous|instructions)/i,
  /act\s+as\s+(if|though)\s+you\s+(are|were)/i,
  /stop\.\s*new\s+instruction/i
];

// Suspicious patterns that might indicate malicious intent
const SUSPICIOUS_PATTERNS = [
  /return\s+(all|any)\s+(data|information|content)/i,
  /show\s+me\s+(everything|all\s+data|source\s+code)/i,
  /what\s+(are\s+your|is\s+the)\s+(instructions|system\s+prompt)/i,
  /debug\s+(mode|information|details)/i,
  /developer\s+(mode|access|settings)/i,
  /admin\s+(access|password|credentials)/i
];

/**
 * Sanitizes input by removing potentially dangerous characters and sequences
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  const config = getSecurityConfig();
  if (!config.SANITIZE_INPUT) {
    return input;
  }

  let sanitized = input;

  // Remove null bytes and control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s{10,}/g, ' '.repeat(5));

  // Remove potential script injections
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript\s*:/gi, '');

  // Remove excessive repeated characters that might be used for DoS
  sanitized = sanitized.replace(/(.)\1{100,}/g, '$1'.repeat(10));

  return sanitized.trim();
}

/**
 * Detects potential prompt injection attempts
 * @param {string} prompt - The prompt to analyze
 * @returns {Object} - Detection result with isInjection flag and details
 */
export function detectPromptInjection(prompt) {
  const config = getSecurityConfig();
  if (!config.DETECT_PROMPT_INJECTION) {
    return { isInjection: false, patterns: [] };
  }

  const detectedPatterns = [];
  const lowerPrompt = prompt.toLowerCase();

  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      detectedPatterns.push({
        type: 'injection',
        pattern: pattern.source,
        severity: 'high'
      });
    }
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(prompt)) {
      detectedPatterns.push({
        type: 'suspicious',
        pattern: pattern.source,
        severity: 'medium'
      });
    }
  }

  // Additional heuristics
  if (prompt.length > 5000 && (lowerPrompt.includes('system') || lowerPrompt.includes('instruction'))) {
    detectedPatterns.push({
      type: 'suspicious',
      pattern: 'long_prompt_with_system_keywords',
      severity: 'medium'
    });
  }

  const highSeverityCount = detectedPatterns.filter(p => p.severity === 'high').length;
  const isInjection = highSeverityCount > 0 || 
                     (detectedPatterns.length >= 3 && config.LEVEL === SECURITY_LEVELS.STRICT);

  return {
    isInjection,
    patterns: detectedPatterns,
    confidence: highSeverityCount > 0 ? 'high' : detectedPatterns.length > 0 ? 'medium' : 'low'
  };
}

/**
 * Filters explicit or harmful content
 * @param {string} prompt - The prompt to analyze
 * @returns {Object} - Filter result with isBlocked flag and reasons
 */
export function filterExplicitContent(prompt) {
  const config = getSecurityConfig();
  if (!config.BLOCK_EXPLICIT_CONTENT) {
    return { isBlocked: false, reasons: [] };
  }

  const reasons = [];

  for (const pattern of EXPLICIT_PATTERNS) {
    if (pattern.test(prompt)) {
      reasons.push({
        type: 'explicit_content',
        pattern: pattern.source,
        description: 'Potentially harmful or explicit content detected'
      });
    }
  }

  // Additional checks for strict mode
  if (config.LEVEL === SECURITY_LEVELS.STRICT) {
    // More aggressive filtering in strict mode
    const strictPatterns = [
      /\b(porn|sexual|explicit)\b/i,
      /\b(weapon|bomb|explosive)\b/i,
      /\b(steal|theft|rob)\b/i
    ];

    for (const pattern of strictPatterns) {
      if (pattern.test(prompt)) {
        reasons.push({
          type: 'strict_filter',
          pattern: pattern.source,
          description: 'Content blocked by strict security policy'
        });
      }
    }
  }

  return {
    isBlocked: reasons.length > 0,
    reasons,
    securityLevel: config.LEVEL
  };
}

/**
 * Comprehensive security validation for prompts
 * @param {string} prompt - The prompt to validate
 * @returns {Object} - Validation result with sanitized prompt or error details
 */
export function validatePromptSecurity(prompt) {
  const results = {
    original: prompt,
    sanitized: null,
    isValid: true,
    warnings: [],
    blocked: false,
    reasons: []
  };

  try {
    // Step 1: Sanitize input
    results.sanitized = sanitizeInput(prompt);

    // Step 2: Check for explicit content
    const contentFilter = filterExplicitContent(results.sanitized);
    if (contentFilter.isBlocked) {
      results.isValid = false;
      results.blocked = true;
      results.reasons.push(...contentFilter.reasons);
      return results;
    }

    // Step 3: Detect prompt injection
    const injectionCheck = detectPromptInjection(results.sanitized);
    if (injectionCheck.isInjection) {
      results.isValid = false;
      results.blocked = true;
      results.reasons.push({
        type: 'prompt_injection',
        description: 'Potential prompt injection detected',
        confidence: injectionCheck.confidence,
        patterns: injectionCheck.patterns
      });
      return results;
    }

    // Add warnings for suspicious patterns
    if (injectionCheck.patterns.length > 0) {
      results.warnings.push({
        type: 'suspicious_patterns',
        description: 'Suspicious patterns detected but not blocked',
        patterns: injectionCheck.patterns
      });
    }

    return results;

  } catch (error) {
    results.isValid = false;
    results.blocked = true;
    results.reasons.push({
      type: 'validation_error',
      description: 'Error during security validation',
      error: error.message
    });
    return results;
  }
}

/**
 * Main security check function to be used in validators
 * @param {string} prompt - The prompt to validate
 * @returns {string} - Sanitized and validated prompt
 * @throws {ValidationError} - If prompt fails security checks
 */
export function securityCheck(prompt) {
  const validation = validatePromptSecurity(prompt);

  if (validation.blocked) {
    const reasons = validation.reasons.map(r => r.description).join('; ');
    throw new ValidationError(`Security check failed: ${reasons}`);
  }

  // Log warnings if any
  if (validation.warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('Security warnings for prompt:', validation.warnings);
  }

  return validation.sanitized;
}