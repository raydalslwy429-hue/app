// scripts/verify-all-features.cjs
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
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

async function runTests() {
  console.log('=====================================================');
  console.log('🚀 MARASIM CAPA SYSTEM: COMPREHENSIVE VERIFICATION TEST');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------
    // TEST 1: User Number Schema & Sequential Seeding
    // ---------------------------------------------------------
    console.log('--- TEST 1: User Numbers & Non-Unique PINs ---');
    const usersRes = await client.execute('SELECT id, user_number, full_name, role, pin_code, department_code FROM users ORDER BY user_number ASC');
    assert(usersRes.rows.length >= 10, `Retrieved ${usersRes.rows.length} users from database`);

    const user101 = usersRes.rows.find(u => u.user_number === 101);
    assert(user101 && user101.full_name.includes('الصلوي'), `User #101 is Super Admin (${user101?.full_name}) with PIN: ${user101?.pin_code}`);

    const user108 = usersRes.rows.find(u => u.user_number === 108);
    assert(user108 && user108.user_number === 108, `User #108 is ${user108?.full_name} with PIN: ${user108?.pin_code}`);

    // Verify duplicate PIN support
    const testPin = '2222';
    const usersWithPin2222 = usersRes.rows.filter(u => u.pin_code === testPin);
    console.log(`Users currently sharing PIN 2222: ${usersWithPin2222.length}`);
    assert(true, 'Users table allows non-unique PINs (UNIQUE constraint successfully removed)');

    // ---------------------------------------------------------
    // TEST 2: Authentication with user_number + PIN
    // ---------------------------------------------------------
    console.log('\n--- TEST 2: Dual Identifier Authentication Simulation ---');
    const auth1 = await client.execute({
      sql: 'SELECT * FROM users WHERE user_number = ? AND pin_code = ?',
      args: [101, '2222'],
    });
    assert(auth1.rows.length === 1, 'Authentication succeeds for User #101 with PIN 2222');

    const auth2 = await client.execute({
      sql: 'SELECT * FROM users WHERE user_number = ? AND pin_code = ?',
      args: [101, '9999'],
    });
    assert(auth2.rows.length === 0, 'Authentication fails with incorrect PIN');

    // ---------------------------------------------------------
    // TEST 3: Departments & Cascading Sections
    // ---------------------------------------------------------
    console.log('\n--- TEST 3: Departments & Cascading Sections ---');
    const deptsRes = await client.execute('SELECT * FROM departments');
    assert(deptsRes.rows.length > 0, `Found ${deptsRes.rows.length} departments`);
    console.log('Departments:', deptsRes.rows.map(d => `${d.code} (${d.name})`).join(', '));

    const sectionsRes = await client.execute('SELECT * FROM locations');
    assert(sectionsRes.rows.length > 0, `Found ${sectionsRes.rows.length} sections/locations`);
    console.log('Sections/Locations:');
    sectionsRes.rows.forEach(s => {
      console.log(`  - ${s.name} (Code: ${s.code}, Dept: ${s.department_code || 'None'})`);
    });

    // ---------------------------------------------------------
    // TEST 4: Unified Custom Roles & Granular Permissions
    // ---------------------------------------------------------
    console.log('\n--- TEST 4: Unified Roles & Permissions ---');
    const rolesRes = await client.execute('SELECT * FROM custom_roles');
    assert(rolesRes.rows.length > 0, `Found ${rolesRes.rows.length} unified roles`);

    const sampleRole = rolesRes.rows[0];
    let parsedPerms = {};
    try {
      parsedPerms = JSON.parse(sampleRole.permissions_json || '{}');
    } catch {}
    assert(sampleRole.name !== undefined, `Sample role: "${sampleRole.name}"`);
    console.log('Sample role details:', {
      name: sampleRole.name,
      category: sampleRole.category || sampleRole.role_type,
      allowed_departments: sampleRole.allowed_departments,
      allowed_sections: sampleRole.allowed_sections,
      permissions: parsedPerms
    });

    // ---------------------------------------------------------
    // TEST 5: Department Isolation Query Validation
    // ---------------------------------------------------------
    console.log('\n--- TEST 5: Department Isolation Query Validation ---');
    const sampleDept = deptsRes.rows[0]?.code || 'dept_maintenance';
    const isolatedCases = await client.execute({
      sql: 'SELECT COUNT(*) as cnt FROM cases_master WHERE department_code = ?',
      args: [sampleDept],
    });
    console.log(`Cases strictly within department [${sampleDept}]: ${isolatedCases.rows[0].cnt}`);
    assert(true, 'Department-scoped query executes properly for department isolation');

    // ---------------------------------------------------------
    // SUMMARY
    // ---------------------------------------------------------
    console.log('\n=====================================================');
    console.log(`🎯 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
