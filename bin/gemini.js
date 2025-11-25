#!/usr/bin/env node

/**
 * Gemini CLI - Command-line interface for Google Gemini AI
 * 
 * Usage:
 *   gemini                          # Start interactive chat
 *   gemini "What is the weather?"   # Ask a single question
 *   gemini --help                   # Show help
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as readline from 'readline';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// Display help message
function showHelp() {
  console.log(`
Gemini CLI - Chat with Google Gemini AI
========================================

Usage:
  gemini                          Start interactive chat mode
  gemini "your question"          Ask a single question
  gemini --help                   Show this help message

Examples:
  gemini                          # Start chat
  gemini "What is the weather today?"
  gemini "Explain quantum computing"

Environment Variables:
  GEMINI_API_KEY or GOOGLE_API_KEY    Your Google AI API key
                                       Get it from: https://makersuite.google.com/app/apikey

Interactive Mode Commands:
  Type your message and press Enter to chat
  Type 'exit' or 'quit' to end the session
  Press Ctrl+C to exit
`);
}

// Initialize Gemini AI
function initializeGemini() {
  if (!GEMINI_API_KEY) {
    console.error('Error: API key not found!');
    console.error('Please set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
    console.error('Get your API key from: https://makersuite.google.com/app/apikey');
    console.error('\nExample:');
    console.error('  export GEMINI_API_KEY="your-api-key-here"');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-pro' });
}

// Ask a single question
async function askQuestion(question) {
  const model = initializeGemini();
  
  try {
    console.log('Thinking...\n');
    const result = await model.generateContent(question);
    const response = await result.response;
    const text = response.text();
    console.log(text);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Start interactive chat
async function startChat() {
  const model = initializeGemini();
  
  console.log('Starting Gemini Chat...');
  console.log('Type your message and press Enter. Type "exit" or "quit" to end.\n');
  
  const chat = model.startChat({
    history: [],
    generationConfig: {
      maxOutputTokens: 2048,
    },
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log('Goodbye!');
      rl.close();
      process.exit(0);
    }
    
    if (!input) {
      rl.prompt();
      return;
    }

    try {
      const result = await chat.sendMessage(input);
      const response = await result.response;
      const text = response.text();
      console.log('\n' + text + '\n');
    } catch (error) {
      console.error('Error:', error.message);
    }
    
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  // Show help
  if (args.length > 0 && (args[0] === '--help' || args[0] === '-h')) {
    showHelp();
    return;
  }

  // Ask single question
  if (args.length > 0) {
    const question = args.join(' ');
    await askQuestion(question);
    return;
  }

  // Start interactive chat
  await startChat();
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
