const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Fix relative imports for modules moved under rag (now 3 levels deep instead of 2)
  if (filePath.includes(path.join('modules', 'rag'))) {
    // Global external dependencies
    content = content.replace(/from\s+['"]\.\.\/auth([^'"]*)['"]/g, "from '../../auth$1'");
    content = content.replace(/from\s+['"]\.\.\/users([^'"]*)['"]/g, "from '../../users$1'");
    content = content.replace(/from\s+['"]\.\.\/discord-ingestion([^'"]*)['"]/g, "from '../../discord$1'");
    content = content.replace(/from\s+['"]\.\.\/notifications([^'"]*)['"]/g, "from '../../notifications$1'");
    content = content.replace(/from\s+['"]\.\.\/email([^'"]*)['"]/g, "from '../../email$1'");
    content = content.replace(/from\s+['"]\.\.\/\.\.\/app\.module['"]/g, "from '../../../app.module'");
    
    // Deeper files like plugins/discord.plugin.ts (4 levels deep)
    content = content.replace(/from\s+['"]\.\.\/\.\.\/discord-ingestion([^'"]*)['"]/g, "from '../../../discord$1'");
    content = content.replace(/from\s+['"]\.\.\/\.\.\/users([^'"]*)['"]/g, "from '../../../users$1'");
  }

  // Fix relative imports for modules under analytics (now 3 levels deep instead of 2)
  if (filePath.includes(path.join('modules', 'analytics'))) {
    content = content.replace(/from\s+['"]\.\.\/auth([^'"]*)['"]/g, "from '../../auth$1'");
    content = content.replace(/from\s+['"]\.\.\/users([^'"]*)['"]/g, "from '../../users$1'");
    content = content.replace(/from\s+['"]\.\.\/tickets([^'"]*)['"]/g, "from '../../rag/tickets$1'");
    content = content.replace(/from\s+['"]\.\.\/qa-pairs([^'"]*)['"]/g, "from '../../rag/qa-pairs$1'");
  }

  // Fix relative imports for modules under discord (now 3 levels deep instead of 2)
  if (filePath.includes(path.join('modules', 'discord'))) {
    content = content.replace(/from\s+['"]\.\.\/conversation([^'"]*)['"]/g, "from '../rag/conversation$1'");
    content = content.replace(/from\s+['"]\.\.\/qa-pairs([^'"]*)['"]/g, "from '../rag/qa-pairs$1'");
    content = content.replace(/from\s+['"]\.\.\/qa-proposals([^'"]*)['"]/g, "from '../rag/qa-proposals$1'");
    content = content.replace(/from\s+['"]\.\.\/users([^'"]*)['"]/g, "from '../users$1'");
    content = content.replace(/from\s+['"]\.\.\/tickets([^'"]*)['"]/g, "from '../rag/tickets$1'");
    content = content.replace(/from\s+['"]\.\.\/cache([^'"]*)['"]/g, "from '../rag/cache$1'");
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Fixed] ${filePath}`);
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
      replaceInFile(fullPath);
    }
  });
}

const targetDir = path.resolve(__dirname, '../backend/src/modules');
traverse(targetDir);
console.log('All import path updates completed successfully!');
