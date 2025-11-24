# Cloudflare Pipelines & Event Streaming Setup

This document describes the Cloudflare Pipelines integration for real-time event streaming and analytics in the MCP server.

## Overview

The MCP server now streams authentication and usage events to Cloudflare Pipelines for:
- **Real-time Analytics**: Monitor authentication patterns and tool usage
- **Security Monitoring**: Track failed login attempts and suspicious activity
- **Performance Metrics**: Measure tool execution times and success rates
- **User Activity**: Analyze user behavior and engagement

## Architecture

```
MCP Server → Cloudflare Pipeline → D1 Database
    ↓              ↓                    ↓
Auth Events   UU_STREAM            Uu_sink Table
Tool Events   (7e02e214...)        Views & Analytics
OAuth Events
```

## Pipeline Configuration

### Pipeline ID
```
7e02e214a91249d38d81289cf7649b99
```

### Ingest Endpoint
```
https://7e02e214a91249d38d81289cf7649b99.ingest.cloudflare.com
```

### Binding
```
UU_STREAM
```

## Event Types

The system streams the following event types:

### Authentication Events
- `auth_login_success` - Successful login
- `auth_login_failure` - Failed login attempt
- `auth_logout` - User logout
- `auth_ssh_success` - SSH key auth success
- `auth_ssh_failure` - SSH key auth failure
- `auth_github_success` - GitHub OAuth success
- `auth_github_failure` - GitHub OAuth failure

### MCP Tool Events
- `tool_invoked` - Tool called by user
- `tool_success` - Tool executed successfully
- `tool_failure` - Tool execution failed

### OAuth Events
- `oauth_authorize_start` - OAuth flow initiated
- `oauth_authorize_complete` - OAuth authorization completed
- `oauth_token_issued` - Access token issued

## Event Structure

All events follow this structure:

```typescript
{
  user_id: {
    login?: string,
    email?: string,
    client_id?: string,
    auth_method?: "github" | "ssh"
  },
  event_name: EventType,
  timestamp: "2025-11-24T14:32:00.000Z",
  metadata?: {
    // Event-specific data
  }
}
```

### Authentication Event Example

```json
{
  "user_id": {
    "login": "john.doe",
    "email": "john.doe@company.com",
    "auth_method": "ssh"
  },
  "event_name": "auth_ssh_success",
  "timestamp": "2025-11-24T14:32:00.000Z",
  "metadata": {
    "ip_address": "203.0.113.42",
    "user_agent": "Claude-Desktop/1.0"
  }
}
```

### Tool Event Example

```json
{
  "user_id": {
    "login": "jane.smith",
    "email": "jane.smith@company.com"
  },
  "event_name": "tool_success",
  "timestamp": "2025-11-24T14:35:12.345Z",
  "metadata": {
    "tool_name": "generateImage",
    "execution_time_ms": 1250
  }
}
```

## D1 Database Setup

### Create the Database

If not already created:
```bash
wrangler d1 create symbolai-financial-db
```

### Apply the Schema

```bash
wrangler d1 execute symbolai-financial-db --file=./schema.sql
```

### Configure Pipeline to D1 Sink

Set up the pipeline to insert data into D1:

```sql
INSERT INTO Uu_sink
SELECT * FROM Uu_stream;
```

This query runs continuously in the pipeline, moving data from the stream to the database.

## Querying Event Data

### View Recent Authentication Events

```sql
SELECT * FROM auth_events
ORDER BY timestamp DESC
LIMIT 50;
```

### View Tool Usage Statistics

```sql
SELECT * FROM tool_performance
ORDER BY invocations DESC;
```

### View User Activity Summary

```sql
SELECT * FROM user_activity_summary
WHERE total_events > 10
ORDER BY last_seen DESC;
```

### Check Recent Authentication Failures

```sql
SELECT * FROM recent_auth_failures;
```

### Daily Event Statistics

```sql
SELECT * FROM daily_event_stats
WHERE date >= date('now', '-7 days')
ORDER BY date DESC, count DESC;
```

## Event Streaming API

### Basic Event Streaming

```typescript
import { streamAuthSuccess } from './event-streaming';

// Stream authentication success
await streamAuthSuccess(
  env.UU_STREAM,
  { login: 'user', email: 'user@example.com', name: 'User' },
  'github',
  request
);
```

### Batch Event Streaming

For better performance with high volume:

```typescript
import { EventBatcher } from './event-streaming';

const batcher = new EventBatcher(env.UU_STREAM, {
  enabled: true,
  batchSize: 10,
  flushInterval: 5000
});

// Add events to batch
batcher.add(event1);
batcher.add(event2);

// Manual flush if needed
await batcher.flush();
```

### Custom Event Streaming

```typescript
import { streamEvent, EventType } from './event-streaming';

await streamEvent(env.UU_STREAM, {
  user_id: {
    login: 'user',
    email: 'user@example.com'
  },
  event_name: EventType.TOOL_INVOKED,
  metadata: {
    tool_name: 'myTool',
    custom_data: 'value'
  }
});
```

## Configuration

### Enable/Disable Streaming

Event streaming is enabled by default but can be disabled:

```typescript
const config = {
  enabled: false,  // Disable streaming
  batchSize: 10,
  flushInterval: 5000
};

await streamEvent(pipeline, event, config);
```

### Batch Configuration

```typescript
const batcher = new EventBatcher(env.UU_STREAM, {
  enabled: true,
  batchSize: 20,      // Flush after 20 events
  flushInterval: 3000  // Or after 3 seconds
});
```

## Monitoring & Analytics

### Security Monitoring

Track failed login attempts:
```sql
SELECT
  user_id,
  COUNT(*) as failed_attempts,
  json_extract(metadata, '$.ip_address') as ip_address
FROM auth_events
WHERE event_name LIKE 'auth_%_failure'
  AND timestamp > datetime('now', '-1 hour')
GROUP BY user_id, json_extract(metadata, '$.ip_address')
HAVING failed_attempts > 3;
```

### Performance Monitoring

Find slow tool executions:
```sql
SELECT
  json_extract(metadata, '$.tool_name') as tool_name,
  CAST(json_extract(metadata, '$.execution_time_ms') AS INTEGER) as duration_ms,
  timestamp,
  user_id
FROM tool_events
WHERE event_name = 'tool_success'
  AND CAST(json_extract(metadata, '$.execution_time_ms') AS INTEGER) > 1000
ORDER BY duration_ms DESC
LIMIT 20;
```

### User Engagement

Most active users:
```sql
SELECT
  user_id,
  total_events,
  tools_invoked,
  successful_logins,
  DATE(last_seen) as last_active
FROM user_activity_summary
ORDER BY total_events DESC
LIMIT 10;
```

## Production Considerations

### Data Retention

Set up a cleanup job for old events:

```sql
-- Delete events older than 90 days
DELETE FROM Uu_sink
WHERE created_at < datetime('now', '-90 days');
```

### Performance

- Events are streamed asynchronously and don't block the main request flow
- Streaming failures are logged but don't cause request failures
- Consider using EventBatcher for high-volume scenarios
- D1 indexes ensure fast queries on user_id, event_name, and timestamp

### Privacy & Compliance

- User email addresses are stored in events
- Metadata includes IP addresses and user agents
- Implement data retention policies per GDPR/CCPA requirements
- Consider anonymizing or hashing sensitive data

### Rate Limiting

The pipeline has limits:
- **Ingest Rate**: Check Cloudflare documentation for current limits
- **Batch Size**: Recommended 10-100 events per batch
- **Flush Interval**: Recommended 1-10 seconds

## Troubleshooting

### Events Not Appearing in D1

1. **Check pipeline status**:
   ```bash
   wrangler pipelines list
   ```

2. **Verify D1 binding**:
   Check `wrangler.jsonc` has correct `database_id`

3. **Test pipeline ingest**:
   ```bash
   curl -X POST https://7e02e214a91249d38d81289cf7649b99.ingest.cloudflare.com \
     -H "Content-Type: application/json" \
     -d '[{"user_id": {"example": "test"}, "event_name": "test_event"}]'
   ```

4. **Check D1 table**:
   ```bash
   wrangler d1 execute symbolai-financial-db --command="SELECT COUNT(*) FROM Uu_sink"
   ```

### Streaming Errors

Check worker logs:
```bash
wrangler tail
```

Look for streaming errors:
```
Failed to stream event: [error details]
```

### High Latency

- Increase `batchSize` to reduce network overhead
- Increase `flushInterval` for less frequent flushing
- Check Cloudflare status page for pipeline issues

## Examples

### Complete Authentication Flow with Streaming

```typescript
// 1. OAuth start
await streamOAuthStart(env.UU_STREAM, clientId, scope);

// 2. User authenticates via GitHub
const user = await authenticateWithGitHub();

// 3. Stream auth success
await streamAuthSuccess(env.UU_STREAM, user, 'github', request);

// 4. Complete OAuth flow
await completeAuthorization(...);

// 5. Stream OAuth complete
await streamOAuthComplete(env.UU_STREAM, user, clientId);

// 6. Issue token
await streamTokenIssued(env.UU_STREAM, user, clientId, scope);
```

### Tool Execution with Streaming

```typescript
const startTime = Date.now();

// Stream tool invoked
await streamToolInvoked(env.UU_STREAM, user, 'generateImage');

try {
  const result = await generateImage(prompt);
  const duration = Date.now() - startTime;

  // Stream success
  await streamToolSuccess(env.UU_STREAM, user, 'generateImage', duration);

  return result;
} catch (error) {
  // Stream failure
  await streamToolFailure(env.UU_STREAM, user, 'generateImage', error.message);
  throw error;
}
```

## Resources

- [Cloudflare Pipelines Documentation](https://developers.cloudflare.com/pipelines/)
- [D1 Database Documentation](https://developers.cloudflare.com/d1/)
- [Workers Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Event Streaming Best Practices](https://developers.cloudflare.com/pipelines/best-practices/)

## Next Steps

1. **Deploy the Schema**: Run `wrangler d1 execute` to create tables
2. **Configure Pipeline**: Set up the `INSERT INTO Uu_sink SELECT * FROM Uu_stream` query
3. **Test Streaming**: Trigger some auth events and verify they appear in D1
4. **Build Dashboards**: Create visualizations using the provided views
5. **Set Up Alerts**: Monitor for security events and performance issues
