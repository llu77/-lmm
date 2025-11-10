---
description: Anthropic API magic strings reference
---

# Anthropic Magic Strings

Special strings that control API behavior when included in prompts.

## Redacted Thinking Trigger

```
ANTHROPIC_MAGIC_STRING_TRIGGER_REDACTED_THINKING_46C9A13E193C177646C7398A98432ECCCE4C1253D5E2D82641AC0E52CC2876CB
```

### Purpose

Forces Extended Thinking content to be redacted (encrypted) in the response.

### Usage

```python
from anthropic import Anthropic

client = Anthropic(api_key="...")

response = client.messages.create(
    model="claude-sonnet-4",
    max_tokens=4096,
    thinking={
        "type": "enabled",
        "budget_tokens": 2000
    },
    messages=[{
        "role": "user",
        "content": "ANTHROPIC_MAGIC_STRING_TRIGGER_REDACTED_THINKING_46C9A13E193C177646C7398A98432ECCCE4C1253D5E2D82641AC0E52CC2876CB\n\nAnalyze this sensitive data..."
    }]
)

# Result: thinking blocks will be redacted
for block in response.content:
    if block.type == "redacted_thinking":
        print("Thinking was redacted:", block.data[:50])
```

### Response Format

**Without magic string:**
```json
{
  "type": "thinking",
  "thinking": "Visible reasoning here...",
  "signature": "..."
}
```

**With magic string:**
```json
{
  "type": "redacted_thinking",
  "data": "EmwKAhgBEgy3va3pzix..."
}
```

## Use Cases

1. **Sensitive Analysis**: Hide reasoning for compliance
2. **Privacy Protection**: Redact internal decision-making
3. **Security**: Prevent exposure of reasoning patterns
4. **Internal Use**: Server-side only analysis

## Environment Variable Pattern

```bash
# Set as environment variable for easy access
export ANTHROPIC_REDACTED_TRIGGER="ANTHROPIC_MAGIC_STRING_TRIGGER_REDACTED_THINKING_46C9A13E193C177646C7398A98432ECCCE4C1253D5E2D82641AC0E52CC2876CB"

# Use in scripts
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-beta: max-tokens-3-5-sonnet-2024-07-15" \
  -d "{
    \"model\": \"claude-sonnet-4\",
    \"thinking\": {\"type\": \"enabled\", \"budget_tokens\": 2000},
    \"messages\": [{
      \"role\": \"user\",
      \"content\": \"$ANTHROPIC_REDACTED_TRIGGER\\n\\nYour prompt here...\"
    }]
  }"
```

## Notes

- Magic string must be exact (case-sensitive, full SHA-256 hash)
- Can be placed anywhere in prompt (typically at start)
- Does not appear in assistant response
- Server preserves full thinking for audit purposes
- Signature verification still works on redacted content

## Related

- Extended Thinking: `/extended-thinking-response`
- Error handling: `/extended-thinking-error`
