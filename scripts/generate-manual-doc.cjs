const fs = require('fs');
const path = require('path');

const mdPath = path.join(__dirname, '..', 'دليل_المستخدم_الشامل_لكافة_الأدوار.md');
const mdContent = fs.readFileSync(mdPath, 'utf8');

// Convert Markdown to clean Word-compatible HTML
function convertToHtmlDoc(markdown) {
  let bodyHtml = markdown
    .replace(/^# (.*$)/gim, '<h1 style="color: #682722; border-bottom: 3px solid #D49A3D; padding-bottom: 8px; font-size: 22pt; margin-top: 24pt;">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 style="color: #682722; border-bottom: 2px solid #EFE8E1; padding-bottom: 6px; font-size: 16pt; margin-top: 18pt;">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 style="color: #995F1B; font-size: 13pt; margin-top: 14pt;">$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4 style="color: #1B1111; font-size: 11pt; margin-top: 10pt; font-weight: bold;">$1</h4>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code style="background-color: #FAF3F3; color: #682722; padding: 2px 5px; border-radius: 4px; font-family: Consolas, monospace;">$1</code>')
    .replace(/^\s*\*\s+(.*$)/gim, '<li style="margin-bottom: 4px;">$1</li>')
    .replace(/^\s*-\s+(.*$)/gim, '<li style="margin-bottom: 4px;">$1</li>');

  // Fix lists
  bodyHtml = bodyHtml.replace(/(<li.*<\/li>\s*)+/g, '<ul style="padding-right: 25px; margin-top: 6px; margin-bottom: 10px;">$&</ul>');

  // Wrap tables nicely
  bodyHtml = bodyHtml.replace(/\|(.+)\|/gim, (match) => {
    return match; // Simple markdown table lines
  });

  return `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <title>دليل المستخدم الشامل - منظومة المراسيم</title>
    <style>
      body {
        font-family: 'Segoe UI', 'Traditional Arabic', 'Arial', sans-serif;
        direction: rtl;
        text-align: right;
        margin: 40px;
        line-height: 1.7;
        color: #1B1111;
        background-color: #FAF7F4;
      }
      .container {
        background: #ffffff;
        padding: 40px;
        border-radius: 12px;
        border: 1px solid #D49A3D;
        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      }
      .header-box {
        text-align: center;
        background: linear-gradient(135deg, #682722, #471815);
        color: #ffffff;
        padding: 25px;
        border-radius: 10px;
        margin-bottom: 30px;
        border: 2px solid #D49A3D;
      }
      .header-box h1 {
        color: #FFC217 !important;
        margin: 0;
        font-size: 24pt;
        border: none !important;
      }
      .header-box p {
        color: #EFE8E1;
        margin: 8px 0 0 0;
        font-size: 13pt;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 20px 0;
        font-size: 10.5pt;
      }
      th {
        background-color: #682722;
        color: #FFC217;
        padding: 10px 12px;
        border: 1px solid #471815;
        text-align: center;
        font-weight: bold;
      }
      td {
        padding: 8px 12px;
        border: 1px solid #e2e8f0;
        background-color: #ffffff;
      }
      tr:nth-child(even) td {
        background-color: #FAF7F4;
      }
      .badge-gold {
        background-color: #D49A3D;
        color: #1B1111;
        padding: 3px 8px;
        border-radius: 4px;
        font-weight: bold;
      }
      .badge-burgundy {
        background-color: #682722;
        color: #ffffff;
        padding: 3px 8px;
        border-radius: 4px;
        font-weight: bold;
      }
      .footer-note {
        margin-top: 40px;
        padding-top: 15px;
        border-top: 2px solid #D49A3D;
        text-align: center;
        font-size: 10pt;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header-box">
        <h1>مطعم المراسيم | Al-Marasim Restaurant</h1>
        <p>الدليل الإجرائي والتشغيلي الشامل لمنظومة حوكمة الجودة والبلاغات التصحيحية (CAPA V2)</p>
      </div>
      <div>
        ${bodyHtml}
      </div>
      <div class="footer-note">
        <p>منظومة حوكمة الجودة ومتابعة حالات عدم المطابقة (CAPA V2) © 2026 | جميع الحقوق محفوظة لمطعم المراسيم</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

const htmlDoc = convertToHtmlDoc(mdContent);
const docPath = path.join(__dirname, '..', '..', 'دليل_المستخدم_الشامل_لكافة_الأدوار.doc');
fs.writeFileSync(docPath, htmlDoc, 'utf8');

// Also save inside marasim_app
const insideDocPath = path.join(__dirname, '..', 'دليل_المستخدم_الشامل_لكافة_الأدوار.doc');
fs.writeFileSync(insideDocPath, htmlDoc, 'utf8');

console.log('✅ Word document generated successfully at:');
console.log('  - ' + docPath);
console.log('  - ' + insideDocPath);
