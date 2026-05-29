const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. In insight-engine.service.ts
  if (filePath.endsWith('insight-engine.service.ts')) {
    content = content.replace(/['"]\.\.\/cache\/cache\.service['"]/g, "'../../../rag/cache/cache.service'");
  }

  // 2. In feedback.module.ts
  if (filePath.endsWith('feedback.module.ts')) {
    content = content.replace(/['"]\.\.\/chat\/schemas\/conversation\.schema['"]/g, "'../../rag/chat/schemas/conversation.schema'");
    content = content.replace(/['"]\.\.\/chat\/schemas\/message\.schema['"]/g, "'../../rag/chat/schemas/message.schema'");
    content = content.replace(/['"]\.\.\/qa-proposals\/schemas\/qa-proposal\.schema['"]/g, "'../../rag/qa-proposals/schemas/qa-proposal.schema'");
    content = content.replace(/['"]\.\.\/discord-ingestion\/schemas\/discord-conversation\.schema['"]/g, "'../../discord/schemas/discord-conversation.schema'");
    content = content.replace(/['"]\.\.\/qa-proposals\/qa-proposals\.module['"]/g, "'../../rag/qa-proposals/qa-proposals.module'");
  }

  // 3. In feedback.service.ts
  if (filePath.endsWith('feedback.service.ts')) {
    content = content.replace(/['"]\.\.\/chat\/schemas\/conversation\.schema['"]/g, "'../../rag/chat/schemas/conversation.schema'");
    content = content.replace(/['"]\.\.\/chat\/schemas\/message\.schema['"]/g, "'../../rag/chat/schemas/message.schema'");
    content = content.replace(/['"]\.\.\/qa-proposals\/schemas\/qa-proposal\.schema['"]/g, "'../../rag/qa-proposals/schemas/qa-proposal.schema'");
    content = content.replace(/['"]\.\.\/discord-ingestion\/schemas\/discord-conversation\.schema['"]/g, "'../../discord/schemas/discord-conversation.schema'");
    content = content.replace(/['"]\.\.\/cache\/cache\.service['"]/g, "'../../rag/cache/cache.service'");
  }

  // 4. In discord.listener.ts
  if (filePath.endsWith('discord.listener.ts')) {
    content = content.replace(/['"]\.\.\/mcp\/mcp\.service['"]/g, "'../rag/mcp/mcp.service'");
  }

  // 5. In discord.module.ts
  if (filePath.endsWith('discord.module.ts')) {
    content = content.replace(/['"]\.\.\/embedding-worker\/embedding-worker\.module['"]/g, "'../rag/embedding-worker/embedding-worker.module'");
    content = content.replace(/['"]\.\.\/mcp\/mcp\.module['"]/g, "'../rag/mcp/mcp.module'");
  }

  // 6. In all files under rag/... replace '../../../users/ with '../../users/'
  if (filePath.includes(path.join('modules', 'rag'))) {
    content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/users([^'"]*)['"]/g, "from '../../users$1'");
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Fixed TS Import] ${filePath}`);
  }
}

function traverse(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverse(fullPath);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fixFile(fullPath);
    }
  });
}

const targetDir = path.resolve(__dirname, '../backend/src/modules');
traverse(targetDir);
console.log('Precise import fixer script complete!');
