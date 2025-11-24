-- =========================================
-- MCP Server GitHub Auth Database Schema
-- D1 Database for MCP Server Operations
-- =========================================

-- Note: Foreign key constraints are defined in this schema.
-- To enforce them at runtime, enable foreign keys in your application code:
-- await env.DB.prepare("PRAGMA foreign_keys = ON").run();

-- 1. oauth_sessions
-- Store OAuth session data for MCP client connections
CREATE TABLE IF NOT EXISTS oauth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  github_login TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  last_accessed INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_oauth_sessions_user_id ON oauth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_github_login ON oauth_sessions(github_login);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires_at ON oauth_sessions(expires_at);

-- 2. mcp_connections
-- Track MCP client connections and their authentication status
CREATE TABLE IF NOT EXISTS mcp_connections (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  client_info TEXT,
  connected_at INTEGER DEFAULT (unixepoch()),
  disconnected_at INTEGER,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (session_id) REFERENCES oauth_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_mcp_connections_session_id ON mcp_connections(session_id);
CREATE INDEX IF NOT EXISTS idx_mcp_connections_is_active ON mcp_connections(is_active);

-- 3. tool_usage
-- Log MCP tool invocations for analytics and monitoring
CREATE TABLE IF NOT EXISTS tool_usage (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  parameters TEXT,
  executed_at INTEGER DEFAULT (unixepoch()),
  duration_ms INTEGER,
  success INTEGER DEFAULT 1,
  error_message TEXT,
  FOREIGN KEY (session_id) REFERENCES oauth_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_tool_usage_session_id ON tool_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_name ON tool_usage(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_usage_executed_at ON tool_usage(executed_at);

-- 4. audit_logs
-- Comprehensive audit trail for security and compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_data TEXT,
  ip_address TEXT,
  user_agent TEXT,
  timestamp INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- 5. user_preferences
-- Store user-specific MCP configuration and preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  github_login TEXT NOT NULL,
  preferences TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_github_login ON user_preferences(github_login);

-- Insert initial data (optional)
-- No seed data required for initial deployment
