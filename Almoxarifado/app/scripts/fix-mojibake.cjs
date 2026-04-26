#!/usr/bin/env node
// Corrige mojibake (UTF-8 lido como Latin1) preservando acentos PT-BR corretos.
// Uso: node fix-mojibake.cjs <arquivo1> <arquivo2> ...
// Ou:  node fix-mojibake.cjs --dir src

const fs = require('fs');
const path = require('path');

// Mapa de mojibake → caractere correto (ordenado dos mais longos pros mais curtos)
const MAP = [
  // Sequências compostas primeiro (emojis, símbolos)
  ['âš ï¸', '⚠️'],
  ['ðŸ"¦', '📦'],
  ['ðŸ"§', '🔧'],
  ['ðŸš—', '🚗'],
  ['ðŸ'', '👋'],
  // Pontuação
  ['â€"', '—'],
  ['â€"', '–'],
  ['â€¢', '•'],
  ['â€œ', '"'],
  ['â€', '"'],
  ['â€™', "'"],
  ['â€˜', "'"],
  ['â€¦', '…'],
  // Box-drawing (vira espaço/dash visual para comentários)
  ['â•', '='],
  ['â"€', '─'],
  // Acentos em minúsculas
  ['Ã¡', 'á'], ['Ã ', 'à'], ['Ã¢', 'â'], ['Ã£', 'ã'], ['Ã¤', 'ä'],
  ['Ã©', 'é'], ['Ãª', 'ê'], ['Ã¨', 'è'], ['Ã«', 'ë'],
  ['Ã­', 'í'], ['Ã¬', 'ì'], ['Ã®', 'î'], ['Ã¯', 'ï'],
  ['Ã³', 'ó'], ['Ã´', 'ô'], ['Ãµ', 'õ'], ['Ã²', 'ò'], ['Ã¶', 'ö'],
  ['Ãº', 'ú'], ['Ã¹', 'ù'], ['Ã»', 'û'], ['Ã¼', 'ü'],
  ['Ã§', 'ç'], ['Ã±', 'ñ'],
  // Acentos em maiúsculas
  ['Ã', 'Á'], ['Ã€', 'À'], ['Ã‚', 'Â'], ['Ãƒ', 'Ã'], ['Ã„', 'Ä'],
  ['Ã‰', 'É'], ['ÃŠ', 'Ê'], ['Ã ', 'È'], ['Ã‹', 'Ë'],
  ['Ã', 'Í'], ['ÃŒ', 'Ì'], ['ÃŽ', 'Î'], ['Ã', 'Ï'],
  ['Ã"', 'Ó'], ['Ã"', 'Ô'], ['Ã•', 'Õ'], ['Ã'', 'Ò'], ['Ã–', 'Ö'],
  ['Ãš', 'Ú'], ['Ã™', 'Ù'], ['Ã›', 'Û'], ['Ãœ', 'Ü'],
  ['Ã‡', 'Ç'], ['Ã'', 'Ñ'],
  // Símbolos comuns
  ['Â·', '·'],
  ['Â°', '°'],
  ['Â©', '©'],
  ['Â®', '®'],
  ['Â«', '«'],
  ['Â»', '»'],
  ['Â¹', '¹'],
  ['Â²', '²'],
  ['Â³', '³'],
  ['Â½', '½'],
  ['Â¼', '¼'],
  ['Â¾', '¾'],
  ['Â§', '§'],
  ['Â¶', '¶'],
  ['Â ', ' '],   // NBSP
  // Aspas curvas
  ['"', '"'],
  ['"', '"'],
  [''', "'"],
  [''', "'"],
  // U+FFFD (replacement char) — só remove se sobrar
  ['\uFFFD', ''],
  // Limpeza final de Â solto (sem os pares acima primeiro)
  ['Â', ''],
];

function fixMojibake(content) {
  let out = content;
  let changed = false;
  for (const [bad, good] of MAP) {
    if (out.includes(bad)) {
      out = out.split(bad).join(good);
      changed = true;
    }
  }
  return { out, changed };
}

function walkDir(dir, exts = ['.ts', '.tsx', '.js', '.jsx', '.md', '.json']) {
  const files = [];
  (function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', '.git', 'build', '.vite'].includes(entry.name)) continue;
        walk(full);
      } else if (exts.includes(path.extname(entry.name))) {
        files.push(full);
      }
    }
  })(dir);
  return files;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Uso: node fix-mojibake.cjs <arquivos...> ou --dir <pasta>');
    process.exit(1);
  }

  let targets = [];
  if (args[0] === '--dir' && args[1]) {
    targets = walkDir(args[1]);
  } else {
    targets = args;
  }

  let totalChanged = 0;
  let totalScanned = 0;
  const changedFiles = [];

  for (const file of targets) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      totalScanned++;
      const { out, changed } = fixMojibake(content);
      if (changed) {
        fs.writeFileSync(file, out, 'utf-8');
        totalChanged++;
        changedFiles.push(file);
      }
    } catch (e) {
      console.error(`[ERRO] ${file}: ${e.message}`);
    }
  }

  console.log(`\n✓ Arquivos escaneados: ${totalScanned}`);
  console.log(`✓ Arquivos corrigidos: ${totalChanged}`);
  if (changedFiles.length && changedFiles.length <= 30) {
    console.log('\nAlterados:');
    changedFiles.forEach(f => console.log('  ' + f));
  }
}

main();
