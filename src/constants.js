export const DEFAULTS = {
  OPENAI: {
    MODEL: 'gpt-4o-mini',
    TEMPERATURE: 0.7,
    MAX_TEMPERATURE: 2,
    MIN_TEMPERATURE: 0
  },
  GEMINI: {
    MODEL: 'gemini-1.5-flash-latest',
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
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4o-2024-11-20',
    'gpt-4o-2024-08-06',
    'gpt-4o-2024-05-13',
    'gpt-4o-mini-2024-07-18',
    'chatgpt-4o-latest',
    'gpt-4-turbo',
    'gpt-4-turbo-2024-04-09',
    'gpt-4',
    'gpt-4-0613',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'gpt-4.5-preview',
    'o1',
    'o1-mini',
    'o1-preview',
    'o1-pro',
    'o3-mini',
    'gpt-3.5-turbo'
  ],
  GEMINI: [
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro-002',
    'gemini-1.5-pro',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-8b',
    'gemini-1.0-pro-vision-latest',
    'gemini-pro-vision'
  ]
};