# MCP AI Bridge

A secure Model Context Protocol (MCP) server that bridges Claude Code with OpenAI and Google Gemini APIs.

<a href="https://glama.ai/mcp/servers/@fakoli/mcp-ai-bridge">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@fakoli/mcp-ai-bridge/badge" alt="AI Bridge MCP server" />
</a>

## Features

- **OpenAI Integration**: Access GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-4, and GPT-3.5 Turbo models
- **Gemini Integration**: Access Gemini Pro, Gemini 1.5 Pro, and Gemini 1.5 Flash models
- **Security Features**: 
  - Input validation and sanitization
  - Rate limiting to prevent API abuse
  - Secure error handling (no sensitive information exposure)
  - API key format validation
- **Robust Error Handling**: Specific error types with detailed messages
- **Structured Logging**: Winston-based logging with configurable levels
- **Flexible Configuration**: Control temperature and model selection for each request

## Installation

1. Clone or copy the `mcp-ai-bridge` directory to your preferred location

2. Install dependencies:
```bash
cd mcp-ai-bridge
npm install
```

3. Configure your API keys using ONE of these methods:

   **Option A: Use global .env file in your home directory** (Recommended)
   - Create or edit `~/.env` file
   - Add your API keys:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     GOOGLE_AI_API_KEY=your_google_ai_api_key_here
     ```

   **Option B: Use local .env file**
   - Create a `.env` file in the mcp-ai-bridge directory:
     ```bash
     cp .env.example .env
     ```
   - Add your API keys to this local `.env` file

   **Option C: Use environment variables in Claude Code config**
   - Configure directly in the Claude Code settings (see Configuration section)

The server will check for environment variables in this order:
1. `~/.env` (your home directory)
2. `./.env` (local to mcp-ai-bridge directory)
3. System environment variables

4. **Optional Configuration Variables**:
   ```
   # Logging level (error, warn, info, debug)
   LOG_LEVEL=info
   
   # Server identification
   MCP_SERVER_NAME=AI Bridge
   MCP_SERVER_VERSION=1.0.0
   ```

## Configuration in Claude Code

### Method 1: Using Claude Code CLI (Recommended)

Use the interactive MCP setup wizard:
```bash
claude mcp add
```

Or add the server configuration directly:
```bash
claude mcp add-json ai-bridge '{"command": "node", "args": ["/path/to/mcp-ai-bridge/src/index.js"]}'
```

### Method 2: Manual Configuration

Add the following to your Claude Code MCP settings. The configuration file location depends on your environment:

- **Claude Code CLI**: Uses `settings.json` in the configuration directory (typically `~/.claude/` or `$CLAUDE_CONFIG_DIR`)
- **Claude Desktop**: Uses `~/.claude/claude_desktop_config.json`

For Claude Desktop compatibility:

```json
{
  "mcpServers": {
    "ai-bridge": {
      "command": "node",
      "args": ["/path/to/mcp-ai-bridge/src/index.js"],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key",
        "GOOGLE_AI_API_KEY": "your_google_ai_api_key"
      }
    }
  }
}
```

Alternatively, if you have the `.env` file configured, you can omit the env section:

```json
{
  "mcpServers": {
    "ai-bridge": {
      "command": "node",
      "args": ["/path/to/mcp-ai-bridge/src/index.js"]
    }
  }
}
```

### Method 3: Import from Claude Desktop

If you already have this configured in Claude Desktop, you can import the configuration:
```bash
claude mcp add-from-claude-desktop
```

## Available Tools

### 1. `ask_openai`
Query OpenAI models with full validation and security features.

Parameters:
- `prompt` (required): The question or prompt to send (max 10,000 characters)
- `model` (optional): Choose from 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', or 'gpt-3.5-turbo' (default: 'gpt-4o-mini')
- `temperature` (optional): Control randomness (0-2, default: 0.7)

Security Features:
- Input validation for prompt length and type
- Temperature range validation
- Model validation
- Rate limiting (100 requests per minute by default)

### 2. `ask_gemini`
Query Google Gemini models with full validation and security features.

Parameters:
- `prompt` (required): The question or prompt to send (max 10,000 characters)
- `model` (optional): Choose from 'gemini-pro', 'gemini-1.5-pro', or 'gemini-1.5-flash' (default: 'gemini-pro')
- `temperature` (optional): Control randomness (0-1, default: 0.7)

Security Features:
- Input validation for prompt length and type
- Temperature range validation
- Model validation
- Rate limiting (100 requests per minute by default)

### 3. `server_info`
Get comprehensive server status and configuration information.

Returns:
- Server name and version
- Available models for each service
- Security settings (rate limits, validation status)
- Configuration status for each API

## Usage Examples

In Claude Code, you can use these tools like:

```
mcp__ai-bridge__ask_openai
  prompt: "Explain the concept of recursion in programming"
  model: "gpt-4o"
  temperature: 0.5

mcp__ai-bridge__ask_gemini
  prompt: "What are the key differences between Python and JavaScript?"
  model: "gemini-pro"

mcp__ai-bridge__server_info
```

### Debugging MCP Server

If you encounter issues with the MCP server, you can use Claude Code's debugging features:

```bash
# Enable MCP debug mode for detailed error information
claude --mcp-debug

# Check MCP server status and tools
claude
# Then use the /mcp slash command to view server details
```

## Testing

The project includes comprehensive unit tests and security tests. To run tests:

```bash
# Run all tests (including security tests)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage
- Unit tests for all server functionality
- Security tests for input validation and rate limiting
- Integration tests for API interactions
- Error handling tests
- Mock-based testing to avoid real API calls

## Troubleshooting

### Common Issues

1. **"API key not configured" error**: Make sure you've added the correct API keys to your `.env` file or Claude Code config
2. **"Invalid OpenAI API key format" error**: OpenAI keys must start with 'sk-'
3. **"Rate limit exceeded" error**: Wait for the rate limit window to reset (default: 1 minute)
4. **"Prompt too long" error**: Keep prompts under 10,000 characters
5. **Module not found errors**: Run `npm install` in the mcp-ai-bridge directory
6. **Permission errors**: Ensure the index.js file has execute permissions
7. **Logging issues**: Set LOG_LEVEL environment variable (error, warn, info, debug)

### Claude Code Specific Troubleshooting

8. **MCP server not loading**: 
   - Use `claude --mcp-debug` to see detailed error messages
   - Check server configuration with `/mcp` slash command
   - Verify the server path is correct and accessible
   - Ensure Node.js is installed and in your PATH

9. **Configuration issues**: 
   - Use `claude mcp add` for interactive setup
   - Check `CLAUDE_CONFIG_DIR` environment variable if using custom config location
   - For timeouts, configure `MCP_TIMEOUT` and `MCP_TOOL_TIMEOUT` environment variables

10. **Server startup failures**:
    - Check if the server process can start independently: `node /path/to/mcp-ai-bridge/src/index.js`
    - Verify all dependencies are installed
    - Check file permissions on the server directory

## Security Features

### Built-in Security
- **Input Validation**: All prompts are validated for type, length, and content
- **Rate Limiting**: 100 requests per minute by default to prevent API abuse
- **API Key Validation**: Format validation for API keys before use
- **Secure Error Handling**: No stack traces or sensitive information in error messages
- **Structured Logging**: All operations are logged with appropriate levels

### Best Practices
- Never commit your `.env` file to version control
- Keep your API keys secure and rotate them regularly
- Consider setting usage limits on your API accounts
- Monitor logs for unusual activity
- Use the rate limiting feature to control costs
- Validate the server configuration using the `server_info` tool

### Rate Limiting
The server implements sliding window rate limiting:
- Default: 100 requests per minute
- Configurable via environment variables
- Per-session tracking
- Graceful error messages with reset time information