const { createClient } = require('@libsql/client');
const db = createClient({
  url: 'libsql://raeed1-raydalslwy429-hue.aws-eu-central-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTQwNzUxNTcsImlkIjoiMDFhMWI3MzQtYmMwMS03ZjdmLWI1NTMtNGJlMzgyODkxZjU0Iiwia2lkIjoickV4c243NFRvQ2plQlBjeDMzRWcyM0pQT3JXdGZvaWZiYnpDcnVVY0dTZyIsInJpZCI6IjhmYjJlYzc0LThmYzctNGNjMy04MjFkLWQxNTY0ODViNDkxNiJ9.JixENvIVwegjJ2ZVr4nW5it2oNAma6D4UmV5JYy8R00Tf0oh_qt3d9oolBdrB5YVWijpIeflHG9CyO1JXqjoDw'
});

async function check() {
  const schema = await db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='custom_roles'");
  console.log('Schema:', schema.rows[0]?.sql);
  const rows = await db.execute("SELECT id, code, name, category, role_type, allowed_departments, allowed_sections, permissions_json, status FROM custom_roles");
  console.table(rows.rows);
}
check().catch(console.error);
