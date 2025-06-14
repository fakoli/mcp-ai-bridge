export class AIBridgeError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = 'AIBridgeError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AIBridgeError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends AIBridgeError {
  constructor(message) {
    super(message, 'CONFIGURATION_ERROR', 500);
    this.name = 'ConfigurationError';
  }
}

export class RateLimitError extends AIBridgeError {
  constructor(message) {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

export class APIError extends AIBridgeError {
  constructor(message, service) {
    super(message, 'API_ERROR', 502);
    this.name = 'APIError';
    this.service = service;
  }
}