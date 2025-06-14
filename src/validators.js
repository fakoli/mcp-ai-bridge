import { ValidationError } from './errors.js';
import { DEFAULTS, ERROR_MESSAGES, MODELS } from './constants.js';
import { securityCheck } from './security.js';

export function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    throw new ValidationError(ERROR_MESSAGES.INVALID_PROMPT);
  }
  
  const trimmedPrompt = prompt.trim();
  
  if (trimmedPrompt.length === 0) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_PROMPT);
  }
  
  if (trimmedPrompt.length > DEFAULTS.PROMPT.MAX_LENGTH) {
    throw new ValidationError(ERROR_MESSAGES.PROMPT_TOO_LONG);
  }
  
  // Apply security checks (sanitization, content filtering, injection detection)
  const securePrompt = securityCheck(trimmedPrompt);
  
  return securePrompt;
}

export function validateTemperature(temperature, service = 'OPENAI') {
  if (temperature === undefined || temperature === null) {
    return DEFAULTS[service].TEMPERATURE;
  }
  
  // Check if input is a valid number type (not array, object, etc.)
  if (typeof temperature !== 'number' && typeof temperature !== 'string') {
    throw new ValidationError(`${ERROR_MESSAGES.INVALID_TEMPERATURE}: must be a number`);
  }
  
  const temp = Number(temperature);
  
  if (isNaN(temp)) {
    throw new ValidationError(`${ERROR_MESSAGES.INVALID_TEMPERATURE}: must be a number`);
  }
  
  const min = DEFAULTS[service].MIN_TEMPERATURE;
  const max = DEFAULTS[service].MAX_TEMPERATURE;
  
  if (temp < min || temp > max) {
    throw new ValidationError(`${ERROR_MESSAGES.INVALID_TEMPERATURE}: must be between ${min} and ${max}`);
  }
  
  return temp;
}

export function validateModel(model, service = 'OPENAI') {
  const models = MODELS[service];
    
  if (!model) {
    return DEFAULTS[service].MODEL;
  }
  
  if (!models.includes(model)) {
    throw new ValidationError(`Invalid model: must be one of ${models.join(', ')}`);
  }
  
  return model;
}

export function validateAPIKey(key, service) {
  if (!key) {
    return false;
  }
  
  if (service === 'OPENAI' && !key.startsWith('sk-')) {
    throw new ValidationError('Invalid OpenAI API key format');
  }
  
  return true;
}