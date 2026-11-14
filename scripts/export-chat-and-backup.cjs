const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const CONVERSATION_ID = '68ef0ac2-0041-407e-ae29-7fb29b9990fd';
const TRANSCRIPT_PATH = path.join('C:', 'Users', 'mars', '.gemini', 'antigravity', 'brain', CONVERSATION_ID, '.system_generated', 'logs', 'transcript.jsonl');
const TRANSCRIPT_FULL_PATH = path.join('C:', 'Users', 'mars', '.gemini', 'antigravity', 'brain', CONVERSATION_ID, '.system_generated', 'logs', 'transcript_full.jsonl');

async function exportChatsAndBackup() {
  console.log('🔄 Loading conversation history from transcript...');

  // Map full lines if truncated
  let fullLines = new Map();
  if (fs.existsSync(TRANSCRIPT_FULL_PATH)) {
    const fullStream = fs.createReadStream(TRANSCRIPT_FULL_PATH);
    const rlFull = readline.createInterface({ input: fullStream, crlfDelay: Infinity });
    for await (const line of rlFull) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line);
        fullLines.set(item.step_index, item);
      } catch (e) {}
    }
  }

  const stream = fs.createReadStream(TRANSCRIPT_PATH);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let conversation = [];

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      let item = JSON.parse(line);
      if (item.truncated_fields && item.truncated_fields.length > 0 && fullLines.has(item.step_index)) {
        item = fullLines.get(item.step_index);
      }

      if (item.type === 'USER_INPUT') {
        let content = item.content || '';
        // Clean metadata tags
        content = content.replace(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/g, '$1');
        content = content.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '');
        content = content.trim();

        if (content) {
          conversation.push({
            step: item.step_index,
            role: 'user',
            time: item.created_at,
            content: content
          });
        }
      } else if (item.type === 'PLANNER_RESPONSE') {
        let content = item.content || '';
        content = content.trim();
        if (content) {
          conversation.push({
            step: item.step_index,
            role: 'assistant',
            time: item.created_at,
            content: content
          });
        }
      }
    } catch (e) {}
  }

  console.log(`✅ Loaded ${conversation.length} conversation messages.`);

  // Build Markdown
  let mdOutput = `# سجل محادثات تطوير النظام الإداري لمطاعم المراسيم (CAPA V2.0)\n\n`;
  mdOutput += `**تاريخ التصدير:** ${new Date().toLocaleString('ar-SA')}\n`;
  mdOutput += `**المشرف التقني:** م. رائد الصلوي\n\n`;
  mdOutput += `---\n\n`;

  // Build Word HTML
  let htmlDoc = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>سجل محادثات تطوير النظام الإداري لمطاعم المراسيم</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4;
      margin: 2cm;
      mso-page-orientation: portrait;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1B1111;
      background-color: #FFFFFF;
      direction: rtl;
      text-align: right;
    }
    .header-banner {
      background-color: #1B1111;
      color: #FFFFFF;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
      border: 3px solid #D49A3D;
      text-align: center;
    }
    .header-banner h1 {
      color: #FFC217;
      margin: 0 0 8px 0;
      font-size: 22pt;
    }
    .header-banner p {
      color: #FAF7F4;
      margin: 4px 0;
      font-size: 12pt;
    }
    .message-container {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .user-box {
      background-color: #F8F5F0;
      border-right: 5px solid #682722;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .assistant-box {
      background-color: #FFFFFF;
      border: 1px solid #E2D9CF;
      border-right: 5px solid #D49A3D;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .role-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 10pt;
      margin-bottom: 8px;
    }
    .user-badge {
      background-color: #682722;
      color: #FFFFFF;
    }
    .assistant-badge {
      background-color: #D49A3D;
      color: #1B1111;
    }
    .time-stamp {
      font-size: 9pt;
      color: #888888;
      float: left;
      direction: ltr;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
    }
    th, td {
      border: 1px solid #D49A3D;
      padding: 8px 12px;
      text-align: right;
    }
    th {
      background-color: #1B1111;
      color: #FFC217;
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <h1>النظام الإداري الشامل - مطاعم المراسيم</h1>
    <p>سجل المحادثات وجلسات التطوير البرمجي الكاملة (CAPA Enterprise V2.0)</p>
    <p>المشرف التقني: م. رائد الصلوي | تاريخ التحديث: ${new Date().toLocaleString('ar-SA')}</p>
  </div>
`;

  conversation.forEach((msg, idx) => {
    const isUser = msg.role === 'user';
    const sender = isUser ? '👤 م. رائد الصلوي (المستخدم)' : '🤖 المساعد الذكي (Antigravity)';
    const timeFormatted = new Date(msg.time).toLocaleString('ar-SA');

    // Append to Markdown
    mdOutput += `### [${idx + 1}] ${sender} - ${timeFormatted}\n\n`;
    mdOutput += `${msg.content}\n\n---\n\n`;

    // Append to HTML Word doc
    const boxClass = isUser ? 'user-box' : 'assistant-box';
    const badgeClass = isUser ? 'user-badge' : 'assistant-badge';
    
    // Convert basic formatting in content to html
    let safeContent = msg.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');

    htmlDoc += `
      <div class="message-container">
        <div class="${boxClass}">
          <span class="role-badge ${badgeClass}">${sender}</span>
          <span class="time-stamp">${timeFormatted}</span>
          <div style="clear: both; margin-top: 8px;">${safeContent}</div>
        </div>
      </div>
    `;
  });

  htmlDoc += `</body></html>`;

  // Write files
  const mdPath = path.join('D:', 'AI-Projects', 'سجل_محادثات_مشروع_المراسيم.md');
  const docPath = path.join('D:', 'AI-Projects', 'سجل_محادثات_مشروع_المراسيم.doc');
  const docEnPath = path.join('D:', 'AI-Projects', 'CHATS_HISTORY_ALMARASEEM.doc');

  fs.writeFileSync(mdPath, mdOutput, 'utf8');
  fs.writeFileSync(docPath, htmlDoc, 'utf8');
  fs.writeFileSync(docEnPath, htmlDoc, 'utf8');

  console.log(`✅ Chat files written successfully:\n  - ${mdPath}\n  - ${docPath}\n  - ${docEnPath}`);

  // Create Zip Archive for Home / Laptop Execution
  console.log('📦 Creating clean zip archive for home/laptop deployment...');
  const appDir = path.join('D:', 'AI-Projects', 'marasim_app');
  const zipPath = path.join('D:', 'AI-Projects', 'marasim_app_home_edition.zip');
  const zipLatestPath = path.join('D:', 'AI-Projects', 'marasim_app_latest_ready.zip');

  const psCommand = `
    $compress = @{
      Path = (Get-ChildItem -Path "${appDir}" -Exclude "node_modules", ".next" | ForEach-Object { $_.FullName })
      DestinationPath = "${zipPath}"
      CompressionLevel = "Optimal"
      Force = $true
    }
    Compress-Archive @compress
    Copy-Item -Path "${zipPath}" -Destination "${zipLatestPath}" -Force
  `;

  try {
    execSync(`powershell -NoProfile -Command "${psCommand.replace(/\n/g, ' ')}"`, { stdio: 'inherit' });
    console.log(`✅ Zip archives created:\n  - ${zipPath}\n  - ${zipLatestPath}`);
  } catch (err) {
    console.error('⚠️ Compress error:', err.message);
  }
}

exportChatsAndBackup().catch(console.error);
