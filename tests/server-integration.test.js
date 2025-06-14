import { jest } from '@jest/globals';
import { MockOpenAI, MockGoogleGenerativeAI, MockServer, MockStdioServerTransport, mockLogger } from './mocks.js';

// Mock all external dependencies
jest.mock('openai', () => ({
  default: MockOpenAI,
  __esModule: true
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: MockGoogleGenerativeAI
}));

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: MockServer
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: MockStdioServerTransport
}));

jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolRequestSchema: 'CallToolRequestSchema',
  ListToolsRequestSchema: 'ListToolsRequestSchema'
}));

jest.mock('dotenv', () => ({
  default: {
    config: jest.fn()
  },
  config: jest.fn()
}));

jest.mock('fs', () => ({
  existsSync: jest.fn()
}));

jest.mock('../src/logger.js', () => ({
  default: mockLogger
}));

describe('AIBridgeServer Integration Tests', () => {
  let AIBridgeServer;
  let originalEnv;

  beforeAll(async () => {
    originalEnv = process.env;
    const module = await import('../src/index.js');
    AIBridgeServer = module.AIBridgeServer;
  });

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Security Features', () => {
    let server;

    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.GOOGLE_AI_API_KEY = 'test-gemini-key';
      server = new AIBridgeServer();
    });

    test('should validate prompts before sending to APIs', async () => {
      const handler = server.server.handlers.get('CallToolRequestSchema');
      
      // Test empty prompt
      const emptyResult = await handler({
        params: {
          name: 'ask_openai',
          arguments: { prompt: '' }
        }
      });
      
      expect(emptyResult.content[0].text).toContain('Error');
      expect(emptyResult.content[0].text).toContain('must be a non-empty string');
    });

    test('should enforce rate limiting', async () => {
      const handler = server.server.handlers.get('CallToolRequestSchema');
      
      // Make multiple requests to trigger rate limit
      const promises = [];
      for (let i = 0; i < 101; i++) {
        promises.push(handler({
          params: {
            name: 'server_info',
            arguments: {}
          }
        }));
      }
      
      const results = await Promise.all(promises);
      
      // Some requests should fail with rate limit error
      const rateLimitErrors = results.filter(r => 
        r.content[0].text.includes('Rate limit exceeded')
      );
      
      expect(rateLimitErrors.length).toBeGreaterThan(0);
    });

    test('should validate temperature ranges', async () => {
      const handler = server.server.handlers.get('CallToolRequestSchema');
      
      // Test invalid temperature for OpenAI
      const result = await handler({
        params: {
          name: 'ask_openai',
          arguments: {
            prompt: 'Test prompt',
            temperature: 3 // Invalid for OpenAI (max is 2)
          }
        }
      });
      
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('temperature');
    });

    test('should handle API errors gracefully', async () => {
      // Mock API error
      const errorOpenAI = new MockOpenAI({ apiKey: 'sk-test' });
      errorOpenAI.chat.completions.create = jest.fn().mockRejectedValue({
        status: 429,
        message: 'Rate limit exceeded'
      });
      
      server.openai = errorOpenAI;
      
      const handler = server.server.handlers.get('CallToolRequestSchema');
      const result = await handler({
        params: {
          name: 'ask_openai',
          arguments: { prompt: 'Test prompt' }
        }
      });
      
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('rate limit');
      expect(result.content[0].text).not.toContain('stack');
    });

    test('should not expose sensitive information in errors', async () => {
      const handler = server.server.handlers.get('CallToolRequestSchema');
      
      // Test with invalid tool
      const result = await handler({
        params: {
          name: 'invalid_tool',
          arguments: {}
        }
      });
      
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).not.toContain(process.cwd());
      expect(result.content[0].text).not.toContain('/home/');
      expect(result.content[0].text).not.toContain('API_KEY');
    });
  });

  describe('Enhanced Server Info', () => {
    test('should include security information in server info', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      const server = new AIBridgeServer();
      const handler = server.server.handlers.get('CallToolRequestSchema');
      
      const result = await handler({
        params: {
          name: 'server_info',
          arguments: {}
        }
      });
      
      const info = JSON.parse(result.content[0].text.split('\n\n')[1]);
      
      expect(info.rateLimits).toBeDefined();
      expect(info.rateLimits.maxRequests).toBe(100);
      expect(info.rateLimits.windowMs).toBe(60000);
      
      expect(info.security).toBeDefined();
      expect(info.security.inputValidation).toBe(true);
      expect(info.security.rateLimiting).toBe(true);
      expect(info.security.promptMaxLength).toBe(10000);
    });
  });

  describe('API Key Validation', () => {
    test('should reject invalid OpenAI key format', () => {
      process.env.OPENAI_API_KEY = 'invalid-key-format';
      process.env.GOOGLE_AI_API_KEY = 'test-gemini-key';
      
      const server = new AIBridgeServer();
      
      expect(server.openai).toBeNull();
    });

    test('should handle missing API keys gracefully', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.GOOGLE_AI_API_KEY;
      
      const server = new AIBridgeServer();
      
      expect(server.openai).toBeNull();
      expect(server.gemini).toBeNull();
    });
  });
});