# Debug Mode Setup for Claude MCP Servers

## Overview

This document explains the debug mode configuration for MCP (Model Context Protocol) servers in the Claude Code environment.

## Changes Made

### 1. Enabled Debug Flag

Added `--debug` flag to the `cloudflare-docs` MCP server configuration in `.claude/settings.json`:

```json
{
  "mcpServers": {
    "cloudflare-docs": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://docs.mcp.cloudflare.com/sse", "--debug"],
      "disabled": false
    }
  }
}
```

### 2. Updated Documentation

Enhanced `.claude/MCP_SETUP.md` with:
- Information about debug mode location and usage
- Instructions for viewing debug logs
- Commands for log management
- Guidelines for enabling/disabling debug mode

## Debug Mode Features

When debug mode is enabled, the MCP server will:

1. **Log all MCP requests and responses** - Full details of communication
2. **Track errors** - Complete error information and stack traces
3. **Monitor authentication** - Connection and auth flow details
4. **Measure performance** - Response times and latency metrics

## Debug Log Location

Debug logs are written to:
```
~/.mcp-auth/{server_hash}_debug.log
```

## Viewing Debug Logs

### Real-time monitoring:
```bash
tail -f ~/.mcp-auth/*_debug.log
```

### View last 50 lines:
```bash
tail -n 50 ~/.mcp-auth/*_debug.log
```

### Search for errors:
```bash
grep "error" ~/.mcp-auth/*_debug.log
```

### Search for specific patterns:
```bash
grep -i "authentication" ~/.mcp-auth/*_debug.log
```

## When to Use Debug Mode

Enable debug mode when:
- Troubleshooting connection issues
- Investigating authentication problems
- Debugging MCP tool failures
- Monitoring performance issues
- Understanding MCP communication flow

## Performance Considerations

Debug mode adds logging overhead. Consider:
- **Disk space**: Logs can grow large over time
- **I/O operations**: More file writes during operation
- **Performance**: Minimal impact, but measurable in high-traffic scenarios

## Disabling Debug Mode

To disable debug mode and improve performance:

1. Edit `.claude/settings.json`
2. Remove `--debug` from the args array:

```json
{
  "mcpServers": {
    "cloudflare-docs": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://docs.mcp.cloudflare.com/sse"]
    }
  }
}
```

3. Restart Claude Code

## Other MCP Servers

The following MCP servers in this configuration do NOT use `mcp-remote` and therefore do not support the `--debug` flag:
- `cloudflare-ai` - Uses local Node.js script
- `cloudflare-workers` - Uses `@cloudflare/mcp-server-cloudflare`
- `figma` - Uses `@figma/mcp-server-figma`

For debugging these servers, check their respective documentation for logging options.

## Troubleshooting

### Debug logs not appearing

1. **Check the server is running**: Use `/mcp` command in Claude Code
2. **Verify configuration**: Ensure `--debug` flag is present
3. **Check file permissions**: Ensure `~/.mcp-auth/` directory is writable
4. **Restart Claude Code**: Changes require a restart to take effect

### Logs directory doesn't exist

The `~/.mcp-auth/` directory is created automatically by `mcp-remote` on first use. If it doesn't exist:
1. Ensure `mcp-remote` is installed: `npx -y mcp-remote --version`
2. Try manually creating: `mkdir -p ~/.mcp-auth`
3. Check permissions: `ls -la ~/.mcp-auth`

## Related Documentation

- [MCP_SETUP.md](.claude/MCP_SETUP.md) - Main MCP setup guide
- [MCP_CLIENT_CONFIGURATION.md](../MCP_CLIENT_CONFIGURATION.md) - Complete client configuration
- [mcp-remote Documentation](https://github.com/anthropics/mcp-remote) - Official mcp-remote docs

## Support

For issues with debug mode:
1. Check debug logs for error messages
2. Verify MCP server is running: `/mcp`
3. Consult the troubleshooting section above
4. Review official MCP documentation

---

**Status**: ✅ Debug mode enabled for `cloudflare-docs`  
**Last Updated**: 2025-11-19  
**Version**: 1.0.0
