const fs = require('fs');
try {
  const content = fs.readFileSync('firebase.txt', 'utf8');
  console.log('CONTENT_START');
  console.log(content);
  console.log('CONTENT_END');
  console.log('STATS:', fs.statSync('firebase.txt'));
} catch (e) {
  console.log('ERROR:', e.message);
}
