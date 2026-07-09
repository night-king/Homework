const fs = require('fs');
const html = fs.readFileSync(__dirname + '/child-homepage.html', 'utf8');
const gone = ['pet3dCanvas','function rotateX','function transformChain','dragonElementThemes','elementSwitcher','elementOrbit','dragonForms'];
for (const g of gone) if (html.includes(g)) { console.error('FAIL still present:', g); process.exit(1); }
if (!html.includes('id="petStageMount"')) { console.error('FAIL missing petStageMount'); process.exit(1); }
console.log('PASS cleanup');
