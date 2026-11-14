const { createClient } = require('@libsql/client');
const db = createClient({
  url: 'libsql://raeed1-raydalslwy429-hue.aws-eu-central-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTQwNzUxNTcsImlkIjoiMDFhMWI3MzQtYmMwMS03ZjdmLWI1NTMtNGJlMzgyODkxZjU0Iiwia2lkIjoickV4c243NFRvQ2plQlBjeDMzRWcyM0pQT3JXdGZvaWZiYnpDcnVVY0dTZyIsInJpZCI6IjhmYjJlYzc0LThmYzctNGNjMy04MjFkLWQxNTY0ODViNDkxNiJ9.JixENvIVwegjJ2ZVr4nW5it2oNAma6D4UmV5JYy8R00Tf0oh_qt3d9oolBdrB5YVWijpIeflHG9CyO1JXqjoDw'
});

async function check() {
  const schema = await db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
  console.log('--- USERS TABLE SCHEMA ---');
  console.log(schema.rows[0]?.sql);

  const users = await db.execute("SELECT id, full_name, pin_code, role, status FROM users ORDER BY id ASC");
  console.log('\n--- USERS LIST ---');
  console.table(users.rows);
}

check().catch(console.error);
