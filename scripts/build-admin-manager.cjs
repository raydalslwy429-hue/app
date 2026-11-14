const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'src', 'app', 'admin', 'AdminManager.tsx');
console.log('Target file:', targetFile);

// Read current file to inspect
const content = fs.readFileSync(targetFile, 'utf8');
console.log('Original length:', content.length);
