const fs = require('fs');
const html = fs.readFileSync(__dirname + '/child-homepage.html', 'utf8');
// 断言：不再出现 elementMeta / elementOrder / petStages
for (const gone of ['const elementMeta', 'const elementOrder', 'const petStages', 'activeElement', 'unlockedElements']) {
  if (html.includes(gone)) { console.error('FAIL still present:', gone); process.exit(1); }
}
// 断言：SPECIES 三物种存在，各 5 阶
for (const id of ["id: 'dragon'", "id: 'dino'", "id: 'hero'"]) {
  if (!html.includes(id)) { console.error('FAIL missing species', id); process.exit(1); }
}
const stageMatches = html.match(/spriteId:\s*'sp-/g) || [];
if (stageMatches.length !== 15) { console.error('FAIL expected 15 stage sprites, got', stageMatches.length); process.exit(1); }
console.log('PASS pet-data');
