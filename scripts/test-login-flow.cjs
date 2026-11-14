// scripts/test-login-flow.cjs
const http = require('http');

async function testFlow() {
  console.log('Testing login flow via local HTTP request...');
  
  // Test direct login page HTML
  const res = await fetch('http://localhost:3000/login');
  console.log('Login GET status:', res.status);
  const html = await res.text();
  
  if (html.includes('رقم المستخدم') && html.includes('رمز المرور')) {
    console.log('✅ Login page correctly contains dual inputs for [رقم المستخدم] and [رمز المرور (PIN)]');
  } else {
    console.log('⚠️ Login page missing expected labels');
  }
}

testFlow().catch(console.error);
