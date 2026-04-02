const fs = require('fs');
const f = 'src/infrastructure/mock/dados/mudancasEtapa.mock.ts';
let c = fs.readFileSync(f, 'utf8');
// Add status: 'aprovado' before every closing } that follows a data line
c = c.replace(/data: '([^']+)',?\n  }/g, "data: '$1',\n    status: 'aprovado',\n  }");
fs.writeFileSync(f, c);
console.log('done');
