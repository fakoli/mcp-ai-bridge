export const DEFAULTS = {
  OPENAI: {
    MODEL: 'gpt-4.1-mini',
    TEMPERATURE: 0.7,
    MAX_TEMPERATURE: 2,
    MIN_TEMPERATURE: 0
  },
  GEMINI: {
    MODEL: 'gemini-2.5-flash',
    TEMPERATURE: 0.7,
    MAX_TEMPERATURE: 1,
    MIN_TEMPERATURE: 0
  },
  PROMPT: {
    MAX_LENGTH: 10000,
    MIN_LENGTH: 1
  },
  RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 60000 // 1 minute
  }
};

export const ERROR_MESSAGES = {
  INVALID_PROMPT: 'Invalid prompt: must be a non-empty string',
  PROMPT_TOO_LONG: `Prompt too long: maximum ${DEFAULTS.PROMPT.MAX_LENGTH} characters`,
  OPENAI_NOT_CONFIGURED: 'OpenAI API key not configured',
  GEMINI_NOT_CONFIGURED: 'Gemini API key not configured',
  UNKNOWN_TOOL: 'Unknown tool',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later.',
  INVALID_TEMPERATURE: 'Invalid temperature value',
  API_ERROR: 'API request failed'
};

export const MODELS = {
  OPENAI: [
    'gpt-4.1',
    'gpt-4.1-mini', 
    'gpt-4.1-nano',
    'gpt-4o',
    'gpt-4o-mini',
    'o3',
    'o3-mini',
    'o4-mini'
  ],
  GEMINI: [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-pro-deep-think',
    'gemini-2.5-flash-preview-05-20'
  ]
};