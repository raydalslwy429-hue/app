const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
});

const client = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log('=== case_assignments table columns ===');
  const asgInfo = await client.execute('PRAGMA table_info(case_assignments)');
  console.table(asgInfo.rows);

  console.log('=== cases_master table columns ===');
  const casesInfo = await client.execute('PRAGMA table_info(cases_master)');
  console.table(casesInfo.rows);
}

main().catch(console.error);
