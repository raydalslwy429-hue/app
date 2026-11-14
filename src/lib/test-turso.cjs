const { createClient } = require('@libsql/client');

const url = 'libsql://raeed-raydalslwy429-hue.aws-eu-central-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTQwMjY4ODEsImlkIjoiMDFhMWIzN2MtNGUwMS03NGEyLWJkMDYtYjhjOTdkMTVlMTQ4Iiwia2lkIjoickV4c243NFRvQ2plQlBjeDMzRWcyM0pQT3JXdGZvaWZiYnpDcnVVY0dTZyIsInJpZCI6ImIyNjM4ZjlmLWUwMTYtNGZhYy04ZDA1LTUyYzBlMzVjNzhkYiJ9.DMf7hXwjuWYStObxLshj424v2Vxc6fvxACLvZGYleplPcn_ayDW-EdRR2mBhFpFUB1_my-WEdhtBcgYiumhpAQ';

async function testConn() {
  console.log('Testing Turso connection...');
  const client = createClient({ url, authToken });
  const res = await client.execute("SELECT 1 as connected, datetime('now') as current_time");
  console.log('✅ Turso connected successfully!', res.rows);
}

testConn().catch(err => {
  console.error('❌ Connection error:', err.message);
});
