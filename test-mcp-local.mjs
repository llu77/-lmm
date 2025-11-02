#!/usr/bin/env node

/**
 * MCP Local Server Test CLI
 * اختبار MCP server المحلي من command line
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:4321';
const SESSION_TOKEN = process.env.SESSION_TOKEN || '';

/**
 * إرسال طلب MCP
 */
async function mcpRequest(method, params = {}) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (SESSION_TOKEN) {
    headers['Cookie'] = `session=${SESSION_TOKEN}`;
  }

  const response = await fetch(`${BASE_URL}/api/mcp-server`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now()
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`MCP Error: ${data.error.message} (code: ${data.error.code})`);
  }

  return data.result;
}

/**
 * استدعاء أداة
 */
async function callTool(name, args = {}) {
  return await mcpRequest('tools/call', { name, arguments: args });
}

/**
 * عرض نتيجة بشكل جميل
 */
function display(title, data) {
  console.log('\n' + '='.repeat(70));
  console.log(`📊 ${title}`);
  console.log('='.repeat(70));
  console.log(JSON.stringify(data, null, 2));
}

/**
 * الاختبارات
 */
async function runTests() {
  console.log('🚀 MCP Local Server Tests');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Session: ${SESSION_TOKEN ? 'Provided' : 'None (may fail auth)'}`);

  try {
    // 1. Initialize
    console.log('\n1️⃣ Testing initialize...');
    const initResult = await mcpRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} }
    });
    display('Initialize Result', initResult);

    // 2. List tools
    console.log('\n2️⃣ Testing tools/list...');
    const toolsResult = await mcpRequest('tools/list');
    display('Available Tools', toolsResult);

    // 3. Ping
    console.log('\n3️⃣ Testing ping...');
    const pingResult = await mcpRequest('ping');
    display('Ping Result', pingResult);

    // 4. D1 - List tables
    console.log('\n4️⃣ Testing D1 list tables...');
    const tablesResult = await callTool('d1_list_tables');
    display('D1 Tables', tablesResult);

    // 5. D1 - Count employees
    console.log('\n5️⃣ Testing D1 query (count employees)...');
    const countResult = await callTool('d1_query', {
      sql: 'SELECT COUNT(*) as count FROM employees WHERE is_active = 1'
    });
    display('Active Employees Count', countResult);

    // 6. KV - List keys
    console.log('\n6️⃣ Testing KV list keys...');
    const kvKeysResult = await callTool('kv_list_keys', { limit: 10 });
    display('KV Keys', kvKeysResult);

    // 7. KV - Put test key
    console.log('\n7️⃣ Testing KV put...');
    const kvPutResult = await callTool('kv_put', {
      key: 'mcp:test',
      value: JSON.stringify({
        timestamp: new Date().toISOString(),
        test: true,
        message: 'MCP test successful!'
      }),
      expirationTtl: 3600
    });
    display('KV Put Result', kvPutResult);

    // 8. KV - Get test key
    console.log('\n8️⃣ Testing KV get...');
    const kvGetResult = await callTool('kv_get', { key: 'mcp:test' });
    display('KV Get Result', kvGetResult);

    // 9. R2 - List objects
    console.log('\n9️⃣ Testing R2 list objects...');
    const r2ObjectsResult = await callTool('r2_list_objects', { limit: 10 });
    display('R2 Objects', r2ObjectsResult);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ All tests passed!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

/**
 * تشغيل أمر واحد
 */
async function runCommand(command, ...args) {
  try {
    let result;

    switch (command) {
      case 'init':
        result = await mcpRequest('initialize', {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} }
        });
        break;

      case 'tools':
        result = await mcpRequest('tools/list');
        break;

      case 'ping':
        result = await mcpRequest('ping');
        break;

      case 'd1-tables':
        result = await callTool('d1_list_tables');
        break;

      case 'd1-query':
        if (!args[0]) {
          throw new Error('SQL query required');
        }
        result = await callTool('d1_query', { sql: args[0] });
        break;

      case 'kv-list':
        result = await callTool('kv_list_keys', {
          prefix: args[0] || '',
          limit: parseInt(args[1] || '100')
        });
        break;

      case 'kv-get':
        if (!args[0]) {
          throw new Error('Key required');
        }
        result = await callTool('kv_get', { key: args[0] });
        break;

      case 'kv-put':
        if (!args[0] || !args[1]) {
          throw new Error('Key and value required');
        }
        result = await callTool('kv_put', {
          key: args[0],
          value: args[1],
          expirationTtl: args[2] ? parseInt(args[2]) : undefined
        });
        break;

      case 'kv-delete':
        if (!args[0]) {
          throw new Error('Key required');
        }
        result = await callTool('kv_delete', { key: args[0] });
        break;

      case 'r2-list':
        result = await callTool('r2_list_objects', {
          prefix: args[0] || '',
          limit: parseInt(args[1] || '100')
        });
        break;

      case 'r2-get':
        if (!args[0]) {
          throw new Error('Key required');
        }
        result = await callTool('r2_get_object', { key: args[0] });
        break;

      case 'r2-delete':
        if (!args[0]) {
          throw new Error('Key required');
        }
        result = await callTool('r2_delete_object', { key: args[0] });
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error('\nAvailable commands:');
        console.error('  init                           - Initialize MCP connection');
        console.error('  tools                          - List available tools');
        console.error('  ping                           - Ping server');
        console.error('  d1-tables                      - List D1 tables');
        console.error('  d1-query <sql>                 - Execute SQL query');
        console.error('  kv-list [prefix] [limit]       - List KV keys');
        console.error('  kv-get <key>                   - Get KV value');
        console.error('  kv-put <key> <value> [ttl]     - Put KV value');
        console.error('  kv-delete <key>                - Delete KV key');
        console.error('  r2-list [prefix] [limit]       - List R2 objects');
        console.error('  r2-get <key>                   - Get R2 object info');
        console.error('  r2-delete <key>                - Delete R2 object');
        process.exit(1);
    }

    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

/**
 * Main
 */
const command = process.argv[2];

if (!command || command === 'test') {
  runTests();
} else {
  runCommand(command, ...process.argv.slice(3));
}
