# Gemini CLI Documentation

A command-line interface for interacting with Google's Gemini AI directly from your terminal.

## Installation

### Local Installation (within this project)

```bash
npm install
npm link
```

### Global Installation

To install the package globally and make the `gemini` command available system-wide:

```bash
npm install -g @google/gemini-cli
```

Or if working from this repository:

```bash
npm link
```

## Configuration

### API Key Setup

Before using the Gemini CLI, you need to set up your Google AI API key:

1. **Get your API key** from [Google AI Studio](https://makersuite.google.com/app/apikey)

2. **Set the environment variable** in one of two ways:

   **Option 1: Set for current session**
   ```bash
   export GEMINI_API_KEY="your-api-key-here"
   ```

   **Option 2: Add to your shell profile** (recommended for permanent setup)
   
   For bash (~/.bashrc or ~/.bash_profile):
   ```bash
   echo 'export GEMINI_API_KEY="your-api-key-here"' >> ~/.bashrc
   source ~/.bashrc
   ```
   
   For zsh (~/.zshrc):
   ```bash
   echo 'export GEMINI_API_KEY="your-api-key-here"' >> ~/.zshrc
   source ~/.zshrc
   ```

   **Alternative:** You can also use `GOOGLE_API_KEY` instead of `GEMINI_API_KEY`

## Usage

The Gemini CLI supports three main modes of operation:

### 1. Interactive Chat Mode

Start a continuous conversation with Gemini:

```bash
gemini
```

**Example session:**
```
$ gemini
Starting Gemini Chat...
Type your message and press Enter. Type "exit" or "quit" to end.

> Hello, who are you?

I am Gemini, a large language model created by Google. I'm designed to understand and respond to a wide range of prompts and questions...

> What can you help me with?

I can help you with various tasks including...

> exit
Goodbye!
```

**Interactive mode commands:**
- Type your message and press Enter to send
- Type `exit` or `quit` to end the session
- Press `Ctrl+C` to exit immediately

### 2. Single Question Mode

Ask a single question and get an immediate response:

```bash
gemini "What is the weather today?"
```

**More examples:**
```bash
# Ask about a topic
gemini "Explain quantum computing in simple terms"

# Get coding help
gemini "How do I create a REST API in Node.js?"

# Request calculations
gemini "What is the square root of 144?"

# Multi-word questions (use quotes)
gemini "Tell me a joke about programming"
```

### 3. Help Mode

Display usage information:

```bash
gemini --help
```

or

```bash
gemini -h
```

## Examples

### Quick Question

```bash
gemini "What are the benefits of TypeScript?"
```

### Code Review

```bash
gemini "Review this code: function add(a, b) { return a + b; }"
```

### Research

```bash
gemini "What are the latest developments in AI?"
```

### Writing Assistance

```bash
gemini "Write a professional email requesting a meeting"
```

### Learning

```bash
gemini "Explain the difference between REST and GraphQL APIs"
```

## Features

- **Interactive Chat**: Have natural conversations with Gemini AI
- **Single Questions**: Get quick answers without entering interactive mode
- **Context Awareness**: In chat mode, Gemini remembers the conversation history
- **Easy to Use**: Simple command-line interface with helpful error messages
- **Flexible API Key**: Supports both `GEMINI_API_KEY` and `GOOGLE_API_KEY` environment variables

## Troubleshooting

### "Error: API key not found!"

**Problem:** The CLI cannot find your API key.

**Solution:**
1. Verify you've set the `GEMINI_API_KEY` or `GOOGLE_API_KEY` environment variable
2. Check the variable is exported: `echo $GEMINI_API_KEY`
3. If empty, set it: `export GEMINI_API_KEY="your-key"`
4. For permanent setup, add it to your shell profile

### Command Not Found

**Problem:** Terminal shows `gemini: command not found`

**Solution:**
1. Run `npm link` in the project directory
2. Verify the link: `which gemini`
3. Check your PATH includes `/usr/local/bin`

### API Errors

**Problem:** Getting errors when making requests

**Solution:**
1. Verify your API key is valid at [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Check your internet connection
3. Ensure you haven't exceeded API rate limits

## Technical Details

### Model

The CLI uses the `gemini-pro` model, which is optimized for:
- Text generation
- Question answering
- Code generation
- General conversation

### Configuration

Default settings:
- **Model**: `gemini-pro`
- **Max Output Tokens**: 2048
- **Conversation History**: Maintained in interactive mode

### Dependencies

- `@google/generative-ai`: Official Google Generative AI SDK
- `readline`: Built-in Node.js module for interactive input

## Integration with LMM System

This CLI tool can be used alongside the LMM financial management system for:

- Quick AI assistance during development
- Testing AI integrations
- Prototyping AI features
- Getting coding help without leaving the terminal

## Privacy & Security

- **API Key**: Never commit your API key to version control
- **Data**: Conversations are sent to Google's Gemini API
- **Storage**: No conversation history is stored locally
- **Best Practice**: Use environment variables for sensitive data

## Support

For issues or questions:
- Check the [Google AI Documentation](https://ai.google.dev/docs)
- Review this documentation
- Check the project's GitHub issues

## License

This tool is part of the LMM project and follows the same license terms.

---

**Built with ❤️ using Node.js and Google Gemini AI**
