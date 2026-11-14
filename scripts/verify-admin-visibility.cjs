// scripts/verify-admin-visibility.cjs
const fs = require('fs');
const path = require('path');

const adminManagerPath = path.join(__dirname, '..', 'src', 'app', 'admin', 'AdminManager.tsx');
const appDrawerPath = path.join(__dirname, '..', 'src', 'components', 'AppDrawer.tsx');

const adminCode = fs.readFileSync(adminManagerPath, 'utf8');
const drawerCode = fs.readFileSync(appDrawerPath, 'utf8');

console.log('=====================================================');
console.log('🔒 ROLE-BASED VISIBILITY & ACCESS RESTRICTION TEST');
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

// 1. Check isSystemAdmin definition
assert(
  adminCode.includes('const isSystemAdmin = isSuperAdmin || isGeneralAdmin;'),
  'isSystemAdmin correctly defined as isSuperAdmin || isGeneralAdmin'
);

// 2. Check conditional inclusion in menuGroups
assert(
  adminCode.includes('...(isSystemAdmin') && adminCode.includes('التهيئة وإعدادات المنظومة'),
  'Configuration & Settings menu group is strictly wrapped in ...(isSystemAdmin ? [...] : [])'
);

assert(
  adminCode.includes('التقارير والرقابة والحساب') && adminCode.includes('change_pin'),
  'Reports, Audit & PIN Change menu group is strictly wrapped in ...(isSystemAdmin ? [...] : [])'
);

// 3. Check view rendering guards in <main>
assert(
  adminCode.includes('{isSystemAdmin && (activeMenu === "system_config"'),
  'system_config view is protected with isSystemAdmin guard'
);

assert(
  adminCode.includes('{isSystemAdmin && activeMenu === "reports" && ('),
  'reports view is protected with isSystemAdmin guard'
);

assert(
  adminCode.includes('{isSystemAdmin && activeMenu === "dynamic_forms" && ('),
  'dynamic_forms view is protected with isSystemAdmin guard'
);

assert(
  adminCode.includes('{isSystemAdmin && activeMenu === "users" && ('),
  'users view is protected with isSystemAdmin guard'
);

assert(
  adminCode.includes('{isSystemAdmin && activeMenu === "change_pin" && ('),
  'change_pin view is protected with isSystemAdmin guard'
);

assert(
  adminCode.includes('{isSystemAdmin && activeMenu === "audit" && ('),
  'audit logs view is protected with isSystemAdmin guard'
);

// 4. Check AppDrawer protection
assert(
  drawerCode.includes('{(user.role === "super_admin" || user.role === "general_admin") && (') &&
  drawerCode.includes('الخصوصية وتغيير كلمة السر'),
  'AppDrawer: Change PIN is strictly visible only to super_admin or general_admin'
);

assert(
  !drawerCode.includes('handleItemClick("dynamic_forms")\n              >\n                <Sparkles className="w-4 h-4 text-[#FFC217]" />\n                <span>استمارات التفتيش الواردة'),
  'AppDrawer: dynamic_forms button successfully removed from department admin'
);

console.log('\n=====================================================');
console.log(`🎯 RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('=====================================================');

process.exit(failed > 0 ? 1 : 0);
