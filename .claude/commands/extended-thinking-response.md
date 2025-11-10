---
description: Extended Thinking API response format reference
---

# Extended Thinking Response Format

## Response Structure

When Extended Thinking is enabled, the assistant's response includes thinking blocks:

```json
{
  "content": [
    {
      "type": "thinking",
      "thinking": "Let me analyze this step by step...",
      "signature": "WaUjzkypQ2mUEVM36O2TxuC06KN8xyfbJwyem2dw3URve/op91XWHOEBLLqIOMfFG/UvLEczmEsUjavL...."
    },
    {
      "type": "redacted_thinking",
      "data": "EmwKAhgBEgy3va3pzix/LafPsn4aDFIT2Xlxh0L5L8rLVyIwxtE3rAFBa8cr3qpPkNRj2YfWXGmKDxH4mPnZ5sQ7vB9URj2pLmN3kF8/dW5hR7xJ0aP1oLs9yTcMnKVf2wRpEGjH9XZaBt4UvDcPrQ..."
    },
    {
      "type": "text",
      "text": "Based on my analysis..."
    }
  ]
}
```

## Block Types

### 1. `thinking` Block

**Visible thinking content:**

```json
{
  "type": "thinking",
  "thinking": "Reasoning process in plain text",
  "signature": "Cryptographic signature for verification"
}
```

- `thinking`: The actual reasoning text
- `signature`: Verifies authenticity and prevents tampering

### 2. `redacted_thinking` Block

**Hidden/encrypted thinking:**

```json
{
  "type": "redacted_thinking",
  "data": "Base64-encoded encrypted content"
}
```

- Used for sensitive or internal reasoning
- Cannot be decoded by client
- Preserved for audit/debugging purposes

### 3. Regular Content Blocks

```json
{
  "type": "text",
  "text": "The final response to the user"
}
```

## Usage Patterns

### Enable Extended Thinking

```python
from anthropic import Anthropic

client = Anthropic(api_key="...")

response = client.messages.create(
    model="claude-sonnet-4",
    max_tokens=4096,
    thinking={
        "type": "enabled",
        "budget_tokens": 2000  # Allocate tokens for thinking
    },
    messages=[{
        "role": "user",
        "content": "Analyze this complex problem..."
    }]
)

# Access thinking content
for block in response.content:
    if block.type == "thinking":
        print("Reasoning:", block.thinking)
    elif block.type == "text":
        print("Response:", block.text)
```

### Control Thinking Budget

```python
thinking={
    "type": "enabled",
    "budget_tokens": 1000  # Min: 1000, Max: 10000
}
```

- Lower budget: Faster, less detailed reasoning
- Higher budget: Slower, more thorough analysis

## Use Cases

1. **Complex Problem Solving**: See Claude's reasoning process
2. **Debugging**: Understand why Claude made certain choices
3. **Transparency**: Show users how conclusions were reached
4. **Education**: Learn problem-solving approaches

## Beta Header

```bash
anthropic-beta: max-tokens-3-5-sonnet-2024-07-15
```

## Security Notes

- **Signature verification**: Ensures thinking hasn't been modified
- **Redacted content**: Sensitive reasoning hidden from client
- **Audit trail**: Complete reasoning preserved server-side
