import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import logger from './logger.js';
import { DEFAULTS, ERROR_MESSAGES, MODELS } from './constants.js';
import { AIBridgeError, ValidationError, ConfigurationError, APIError } from './errors.js';
import { validatePrompt, validateTemperature, validateModel, validateAPIKey } from './validators.js';
import { RateLimiter } from './rateLimiter.js';

// Try to load .env from multiple locations in order of priority
const homeEnvPath = join(homedir(), '.env');
const localEnvPath = '.env';

if (existsSync(homeEnvPath)) {
  dotenv.config({ path: homeEnvPath });
  if (process.env.NODE_ENV !== 'test') logger.info('Loaded environment from home directory');
} else if (existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
  if (process.env.NODE_ENV !== 'test') logger.info('Loaded environment from local directory');
} else {
  dotenv.config();
  if (process.env.NODE_ENV !== 'test') logger.info('Using system environment variables');
}

class AIBridgeServer {
  constructor() {
    this.server = new Server(
      {
        name: process.env.MCP_SERVER_NAME || 'AI Bridge',
        version: process.env.MCP_SERVER_VERSION || '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Validate and initialize API clients
    this.initializeClients();
    
    // Initialize rate limiter
    this.rateLimiter = new RateLimiter();
    
    this.setupHandlers();
    this.tools = this.getAvailableTools();
  }

  initializeClients() {
    // Initialize OpenAI client
    if (process.env.OPENAI_API_KEY) {
      try {
        validateAPIKey(process.env.OPENAI_API_KEY, 'OPENAI');
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        if (process.env.NODE_ENV !== 'test') logger.info('OpenAI client initialized');
      } catch (error) {
        if (process.env.NODE_ENV !== 'test') logger.error('Failed to initialize OpenAI client:', error.message);
        this.openai = null;
      }
    } else {
      this.openai = null;
      if (process.env.NODE_ENV !== 'test') logger.warn('OpenAI API key not provided');
    }
    
    // Initialize Gemini client
    if (process.env.GOOGLE_AI_API_KEY) {
      try {
        this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        if (process.env.NODE_ENV !== 'test') logger.info('Gemini client initialized');
      } catch (error) {
        if (process.env.NODE_ENV !== 'test') logger.error('Failed to initialize Gemini client:', error.message);
        this.gemini = null;
      }
    } else {
      this.gemini = null;
      if (process.env.NODE_ENV !== 'test') logger.warn('Google AI API key not provided');
    }
  }

  getAvailableTools() {
    const tools = [];

    if (this.openai) {
      tools.push({
        name: 'ask_openai',
        description: 'Ask OpenAI GPT models a question',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt to send to OpenAI',
            },
            model: {
              type: 'string',
              description: `The model to use (default: ${DEFAULTS.OPENAI.MODEL})`,
              enum: MODELS.OPENAI,
              default: DEFAULTS.OPENAI.MODEL,
            },
            temperature: {
              type: 'number',
              description: `Temperature for response generation (${DEFAULTS.OPENAI.MIN_TEMPERATURE}-${DEFAULTS.OPENAI.MAX_TEMPERATURE})`,
              default: DEFAULTS.OPENAI.TEMPERATURE,
              minimum: DEFAULTS.OPENAI.MIN_TEMPERATURE,
              maximum: DEFAULTS.OPENAI.MAX_TEMPERATURE,
            },
          },
          required: ['prompt'],
        },
      });
    }

    if (this.gemini) {
      tools.push({
        name: 'ask_gemini',
        description: 'Ask Google Gemini AI a question',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt to send to Gemini',
            },
            model: {
              type: 'string',
              description: `The model to use (default: ${DEFAULTS.GEMINI.MODEL})`,
              enum: MODELS.GEMINI,
              default: DEFAULTS.GEMINI.MODEL,
            },
            temperature: {
              type: 'number',
              description: `Temperature for response generation (${DEFAULTS.GEMINI.MIN_TEMPERATURE}-${DEFAULTS.GEMINI.MAX_TEMPERATURE})`,
              default: DEFAULTS.GEMINI.TEMPERATURE,
              minimum: DEFAULTS.GEMINI.MIN_TEMPERATURE,
              maximum: DEFAULTS.GEMINI.MAX_TEMPERATURE,
            },
          },
          required: ['prompt'],
        },
      });
    }

    tools.push({
      name: 'server_info',
      description: 'Get server status and configuration',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    });

    return tools;
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.tools,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Check rate limit
        this.rateLimiter.checkLimit();
        
        switch (name) {
          case 'ask_openai':
            return await this.handleOpenAI(args);
          case 'ask_gemini':
            return await this.handleGemini(args);
          case 'server_info':
            return this.handleServerInfo();
          default:
            throw new ValidationError(`${ERROR_MESSAGES.UNKNOWN_TOOL}: ${name}`);
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'test') logger.error(`Error handling ${name}:`, error);
        return this.formatError(error);
      }
    });
  }

  async handleOpenAI(args) {
    if (!this.openai) {
      throw new ConfigurationError(ERROR_MESSAGES.OPENAI_NOT_CONFIGURED);
    }

    // Validate inputs
    const prompt = validatePrompt(args.prompt);
    const model = validateModel(args.model, 'OPENAI');
    const temperature = validateTemperature(args.temperature, 'OPENAI');

    try {
      if (process.env.NODE_ENV !== 'test') logger.debug(`OpenAI request - model: ${model}, temperature: ${temperature}`);
      
      const completion = await this.openai.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature,
      });

      return {
        content: [
          {
            type: 'text',
            text: `🤖 OPENAI RESPONSE (${model}):\n\n${completion.choices[0].message.content}`,
          },
        ],
      };
    } catch (error) {
      if (error.status === 429) {
        throw new APIError('OpenAI rate limit exceeded. Please try again later.', 'OpenAI');
      } else if (error.status === 401) {
        throw new ConfigurationError('Invalid OpenAI API key');
      } else {
        throw new APIError(`OpenAI API error: ${error.message}`, 'OpenAI');
      }
    }
  }

  async handleGemini(args) {
    if (!this.gemini) {
      throw new ConfigurationError(ERROR_MESSAGES.GEMINI_NOT_CONFIGURED);
    }

    // Validate inputs
    const prompt = validatePrompt(args.prompt);
    const model = validateModel(args.model, 'GEMINI');
    const temperature = validateTemperature(args.temperature, 'GEMINI');

    try {
      if (process.env.NODE_ENV !== 'test') logger.debug(`Gemini request - model: ${model}, temperature: ${temperature}`);
      
      const geminiModel = this.gemini.getGenerativeModel({ 
        model: model,
        generationConfig: {
          temperature: temperature,
        },
      });
      
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        content: [
          {
            type: 'text',
            text: `🤖 GEMINI RESPONSE (${model}):\n\n${text}`,
          },
        ],
      };
    } catch (error) {
      if (error.message?.includes('quota')) {
        throw new APIError('Gemini quota exceeded. Please try again later.', 'Gemini');
      } else if (error.message?.includes('API key')) {
        throw new ConfigurationError('Invalid Gemini API key');
      } else {
        throw new APIError(`Gemini API error: ${error.message}`, 'Gemini');
      }
    }
  }

  handleServerInfo() {
    const info = {
      name: process.env.MCP_SERVER_NAME || 'AI Bridge',
      version: process.env.MCP_SERVER_VERSION || '1.0.0',
      openai: {
        configured: !!this.openai,
        models: this.openai ? MODELS.OPENAI : [],
      },
      gemini: {
        configured: !!this.gemini,
        models: this.gemini ? MODELS.GEMINI : [],
      },
      rateLimits: {
        maxRequests: DEFAULTS.RATE_LIMIT.MAX_REQUESTS,
        windowMs: DEFAULTS.RATE_LIMIT.WINDOW_MS,
      },
      security: {
        inputValidation: true,
        rateLimiting: true,
        promptMaxLength: DEFAULTS.PROMPT.MAX_LENGTH,
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: `🤖 AI BRIDGE SERVER INFO:\n\n${JSON.stringify(info, null, 2)}`,
        },
      ],
    };
  }

  formatError(error) {
    // Don't expose stack traces or sensitive information
    const message = error instanceof AIBridgeError 
      ? error.message 
      : 'An unexpected error occurred';
      
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${message}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    if (process.env.NODE_ENV !== 'test') logger.info('AI Bridge MCP server running');
  }
}

// Export for testing
export { AIBridgeServer };

// Run the server if this is the main module
// Only run in production, not during tests
if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
  const server = new AIBridgeServer();
  server.run().catch((error) => {
    if (process.env.NODE_ENV !== 'test') logger.error('Failed to start server:', error);
    process.exit(1);
  });
}