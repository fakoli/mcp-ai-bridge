export const mockOpenAIResponse = {
  choices: [{
    message: {
      content: 'Mock OpenAI response content'
    }
  }]
};

export const mockGeminiResponse = {
  response: {
    text: () => 'Mock Gemini response content'
  }
};

export class MockOpenAI {
  constructor(config) {
    this.apiKey = config?.apiKey;
    this.chat = {
      completions: {
        create: jest.fn().mockResolvedValue(mockOpenAIResponse)
      }
    };
  }
}

export class MockGoogleGenerativeAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  getGenerativeModel(config) {
    return {
      generateContent: jest.fn().mockResolvedValue({
        response: mockGeminiResponse.response
      })
    };
  }
}

export class MockServer {
  constructor(info, options) {
    this.info = info;
    this.options = options;
    this.handlers = new Map();
  }

  setRequestHandler(schema, handler) {
    this.handlers.set(schema, handler);
  }

  async connect(transport) {
    return Promise.resolve();
  }
}

export class MockStdioServerTransport {
  constructor() {
    this.connected = false;
  }
}

export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};