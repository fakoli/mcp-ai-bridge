import { RateLimitError } from './errors.js';
import { DEFAULTS, ERROR_MESSAGES } from './constants.js';

export class RateLimiter {
  constructor(maxRequests = DEFAULTS.RATE_LIMIT.MAX_REQUESTS, windowMs = DEFAULTS.RATE_LIMIT.WINDOW_MS) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  checkLimit(identifier = 'global') {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => now - timestamp < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      const oldestRequest = validRequests[0];
      const resetTime = new Date(oldestRequest + this.windowMs);
      throw new RateLimitError(
        `${ERROR_MESSAGES.RATE_LIMIT_EXCEEDED} Reset at ${resetTime.toISOString()}`
      );
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return {
      remaining: this.maxRequests - validRequests.length,
      reset: new Date(validRequests[0] + this.windowMs)
    };
  }

  reset(identifier) {
    if (identifier) {
      this.requests.delete(identifier);
    } else {
      this.requests.clear();
    }
  }
}