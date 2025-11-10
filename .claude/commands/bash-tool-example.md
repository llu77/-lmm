---
description: Example of bash code execution tool pattern
---

# Bash Code Execution Tool Pattern

## Tool Use Request

```json
{
  "type": "server_tool_use",
  "id": "srvtoolu_01B3C4D5E6F7G8H9I0J1K2L3",
  "name": "bash_code_execution",
  "input": {
    "command": "ls -la | head -5"
  }
}
```

## Tool Result Response

```json
{
  "type": "bash_code_execution_tool_result",
  "tool_use_id": "srvtoolu_01B3C4D5E6F7G8H9I0J1K2L3",
  "content": {
    "type": "bash_code_execution_result",
    "stdout": "total 24\ndrwxr-xr-x 2 user user 4096 Jan 1 12:00 .\ndrwxr-xr-x 3 user user 4096 Jan 1 11:00 ..\n-rw-r--r-- 1 user user  220 Jan 1 12:00 data.csv\n-rw-r--r-- 1 user user  180 Jan 1 12:00 config.json",
    "stderr": "",
    "return_code": 0
  }
}
```

## Pattern Components

**Tool Use:**
- `type`: "server_tool_use"
- `id`: Unique identifier for tracking
- `name`: Tool name (e.g., "bash_code_execution")
- `input`: Tool parameters

**Tool Result:**
- `type`: Tool-specific result type
- `tool_use_id`: References the tool use request
- `content`: Tool output (stdout, stderr, return_code)

## Use Cases

1. **MCP Server Tools**: Custom tools in MCP servers
2. **Remote Execution**: Execute commands in remote environments
3. **Tool Chaining**: Track multi-step tool operations
4. **Error Handling**: Capture stdout/stderr for debugging
