---
description: Extended Thinking API error reference
---

# Extended Thinking Error: Missing thinking block

## Error Message

```
Expected `thinking` or `redacted_thinking`, but found `tool_use`.
When `thinking` is enabled, a final `assistant` message must start
with a thinking block (preceding the lastmost set of `tool_use` and
`tool_result` blocks).
```

## Cause

When Extended Thinking is enabled (`"thinking": {"type": "enabled"}`), the assistant's response **must** start with a thinking block before using tools.

## Incorrect Pattern

```json
{
  "role": "assistant",
  "content": [
    {
      "type": "tool_use",
      "id": "toolu_123",
      "name": "some_tool",
      "input": {}
    }
  ]
}
```

## Correct Pattern

```json
{
  "role": "assistant",
  "content": [
    {
      "type": "thinking",
      "thinking": "I need to use the tool to..."
    },
    {
      "type": "tool_use",
      "id": "toolu_123",
      "name": "some_tool",
      "input": {}
    }
  ]
}
```

## Solution

### Option 1: Include thinking block

Always prefix tool use with thinking:

```python
response = client.messages.create(
    model="claude-sonnet-4",
    thinking={
        "type": "enabled",
        "budget_tokens": 1000
    },
    messages=[...]
)
```

### Option 2: Disable Extended Thinking

```python
response = client.messages.create(
    model="claude-sonnet-4",
    # Don't include thinking parameter
    messages=[...]
)
```

## Related Features

- Extended Thinking: `anthropic-beta: max-tokens-3-5-sonnet-2024-07-15`
- Budget tokens: Control thinking depth (1000-10000)
