-- D1 Database Schema for Event Sink
-- This schema stores events streamed from Cloudflare Pipelines

-- Create the main events sink table
-- This table receives events from the Uu_stream pipeline
CREATE TABLE IF NOT EXISTS Uu_sink (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    metadata TEXT, -- JSON string
    created_at TEXT DEFAULT (datetime('now')),
    CONSTRAINT json_metadata CHECK (json_valid(metadata) OR metadata IS NULL)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_id ON Uu_sink(user_id);
CREATE INDEX IF NOT EXISTS idx_event_name ON Uu_sink(event_name);
CREATE INDEX IF NOT EXISTS idx_timestamp ON Uu_sink(timestamp);
CREATE INDEX IF NOT EXISTS idx_created_at ON Uu_sink(created_at);
CREATE INDEX IF NOT EXISTS idx_user_event ON Uu_sink(user_id, event_name);

-- Authentication events view
-- Provides easy access to authentication-related events
CREATE VIEW IF NOT EXISTS auth_events AS
SELECT
    id,
    user_id,
    event_name,
    timestamp,
    json_extract(metadata, '$.auth_method') as auth_method,
    json_extract(metadata, '$.ip_address') as ip_address,
    json_extract(metadata, '$.user_agent') as user_agent,
    json_extract(metadata, '$.error_message') as error_message,
    created_at
FROM Uu_sink
WHERE event_name LIKE 'auth_%';

-- Tool usage events view
-- Provides easy access to MCP tool usage events
CREATE VIEW IF NOT EXISTS tool_events AS
SELECT
    id,
    user_id,
    event_name,
    timestamp,
    json_extract(metadata, '$.tool_name') as tool_name,
    json_extract(metadata, '$.execution_time_ms') as execution_time_ms,
    json_extract(metadata, '$.error_message') as error_message,
    created_at
FROM Uu_sink
WHERE event_name LIKE 'tool_%';

-- OAuth events view
-- Provides easy access to OAuth flow events
CREATE VIEW IF NOT EXISTS oauth_events AS
SELECT
    id,
    user_id,
    event_name,
    timestamp,
    json_extract(metadata, '$.client_id') as client_id,
    json_extract(metadata, '$.scope') as scope,
    json_extract(metadata, '$.redirect_uri') as redirect_uri,
    created_at
FROM Uu_sink
WHERE event_name LIKE 'oauth_%';

-- User activity summary
-- Aggregates user activity for analytics
CREATE VIEW IF NOT EXISTS user_activity_summary AS
SELECT
    user_id,
    COUNT(*) as total_events,
    SUM(CASE WHEN event_name LIKE 'auth_%_success' THEN 1 ELSE 0 END) as successful_logins,
    SUM(CASE WHEN event_name LIKE 'auth_%_failure' THEN 1 ELSE 0 END) as failed_logins,
    SUM(CASE WHEN event_name = 'tool_invoked' THEN 1 ELSE 0 END) as tools_invoked,
    SUM(CASE WHEN event_name = 'tool_success' THEN 1 ELSE 0 END) as successful_tool_calls,
    SUM(CASE WHEN event_name = 'tool_failure' THEN 1 ELSE 0 END) as failed_tool_calls,
    MIN(timestamp) as first_seen,
    MAX(timestamp) as last_seen
FROM Uu_sink
GROUP BY user_id;

-- Event statistics by day
-- Daily aggregation for analytics
CREATE VIEW IF NOT EXISTS daily_event_stats AS
SELECT
    DATE(timestamp) as date,
    event_name,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_users
FROM Uu_sink
GROUP BY DATE(timestamp), event_name
ORDER BY date DESC, count DESC;

-- Recent authentication failures
-- Security monitoring view
CREATE VIEW IF NOT EXISTS recent_auth_failures AS
SELECT
    timestamp,
    user_id,
    event_name,
    json_extract(metadata, '$.auth_method') as auth_method,
    json_extract(metadata, '$.ip_address') as ip_address,
    json_extract(metadata, '$.error_message') as error_message,
    created_at
FROM Uu_sink
WHERE event_name LIKE 'auth_%_failure'
ORDER BY timestamp DESC
LIMIT 100;

-- Tool performance metrics
-- Performance monitoring view
CREATE VIEW IF NOT EXISTS tool_performance AS
SELECT
    json_extract(metadata, '$.tool_name') as tool_name,
    COUNT(*) as invocations,
    AVG(CAST(json_extract(metadata, '$.execution_time_ms') AS REAL)) as avg_execution_time_ms,
    MIN(CAST(json_extract(metadata, '$.execution_time_ms') AS REAL)) as min_execution_time_ms,
    MAX(CAST(json_extract(metadata, '$.execution_time_ms') AS REAL)) as max_execution_time_ms,
    SUM(CASE WHEN event_name = 'tool_success' THEN 1 ELSE 0 END) as successes,
    SUM(CASE WHEN event_name = 'tool_failure' THEN 1 ELSE 0 END) as failures
FROM Uu_sink
WHERE event_name IN ('tool_success', 'tool_failure')
GROUP BY json_extract(metadata, '$.tool_name');

-- Comments for documentation
COMMENT ON TABLE Uu_sink IS 'Event sink for Cloudflare Pipelines streaming data';
COMMENT ON COLUMN Uu_sink.user_id IS 'User identifier (login, email, or client_id)';
COMMENT ON COLUMN Uu_sink.event_name IS 'Type of event (auth_*, tool_*, oauth_*)';
COMMENT ON COLUMN Uu_sink.timestamp IS 'ISO 8601 timestamp of when the event occurred';
COMMENT ON COLUMN Uu_sink.metadata IS 'JSON object containing event-specific metadata';
COMMENT ON COLUMN Uu_sink.created_at IS 'When the record was inserted into the database';
