const { execSync } = require('child_process');
const dns = require('dns').promises;
const path = require('path');

const repoDir = path.resolve(__dirname, '..');

async function pullFromGithub() {
  try {
    console.log("📥 جاري سحب وتحديث أحدث الأكواد والتصاميم من GitHub (git pull origin main)...");
    execSync('git pull origin main', { cwd: repoDir, stdio: 'inherit' });
    console.log("🎉 تم بنجاح سحب وتحديث كود البرمجة والشاشات من GitHub!");
    return { success: true, message: "تم بنجاح سحب وتحديث كود البرمجة والشاشات من مستودع GitHub!" };
  } catch (err) {
    console.error("❌ حدث خطأ أثناء السحب من GitHub:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  pullFromGithub().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { pullFromGithub };
