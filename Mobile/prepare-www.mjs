// prepare-www.mjs
//
// Builda os 4 módulos com BUILD_BASE certo pra cada subpath e bundla em www/.
// Estrutura final:
//   Mobile/www/
//     ├── index.html        (Hub, entrada do app)
//     ├── assets/...        (assets do Hub)
//     ├── almox/index.html  (Almoxarifado em /almox/)
//     ├── comercial/index.html
//     └── obras/index.html
//
// O Capacitor empacota Mobile/www/ no APK e serve via https://localhost/.
// Hub detecta Capacitor (via window.Capacitor) e linka pros subpaths locais.

import { execSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const WWW = join(__dirname, 'www');
const mobilePackage = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const MOBILE_RELEASE_TAG = process.env.VITE_MOBILE_RELEASE_TAG || (mobilePackage.version ? `v${mobilePackage.version}` : 'dev');

// (path do módulo, base path no Mobile, destino dentro de www/)
const MODULES = [
  { name: 'Hub',         dir: join(ROOT, 'Hub', 'app'),                base: '/',            dest: WWW },
  { name: 'Almoxarifado', dir: join(ROOT, 'Almoxarifado', 'app'),      base: '/almox/',      dest: join(WWW, 'almox') },
  { name: 'Comercial',   dir: join(ROOT, 'Comercial', 'orcamentos'),   base: '/comercial/',  dest: join(WWW, 'comercial') },
  { name: 'Obras',       dir: join(ROOT, 'Obras', 'app'),              base: '/obras/',      dest: join(WWW, 'obras') },
];

function log(msg) {
  console.log(`\x1b[36m[prepare-www]\x1b[0m ${msg}`);
}

function copyRecursive(src, dest) {
  const stat = statSync(src);
  if (stat.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src)) {
      copyRecursive(join(src, entry), join(dest, entry));
    }
    return;
  }
  mkdirSync(resolve(dest, '..'), { recursive: true });
  copyFileSync(src, dest);
}

function build(mod) {
  log(`Compilando ${mod.name} com base=${mod.base}...`);
  // Usa `vite build --base` direto pra forçar o base path SEM precisar mexer no
  // vite.config.ts de cada módulo (importante pro Comercial que é submódulo
  // embutido difícil de patchear). Pula o `tsc` do `npm run build` original —
  // typecheck roda no Vercel/dev de qualquer jeito.
  execSync(`npx vite build --base=${mod.base}`, {
    cwd: mod.dir,
    stdio: 'inherit',
    env: { ...process.env, VITE_MOBILE_RELEASE_TAG: MOBILE_RELEASE_TAG },
  });
}

function copyDist(mod) {
  const distDir = join(mod.dir, 'dist');
  if (!existsSync(distDir)) {
    throw new Error(`dist nao encontrado em ${distDir}. Build falhou?`);
  }
  log(`Copiando ${mod.name} → ${mod.dest}...`);
  if (existsSync(mod.dest)) rmSync(mod.dest, { recursive: true, force: true });
  mkdirSync(mod.dest, { recursive: true });
  // Copia o conteudo do dist, nao a pasta dist em si. Em Windows/OneDrive,
  // cpSync(distDir, destExistente) pode falhar com EIO/Acesso negado.
  for (const entry of readdirSync(distDir)) {
    copyRecursive(join(distDir, entry), join(mod.dest, entry));
  }
}

function main() {
  // 1. Limpa www/ inteiro
  log(`Limpando www/... release=${MOBILE_RELEASE_TAG}`);
  if (existsSync(WWW)) rmSync(WWW, { recursive: true, force: true });
  mkdirSync(WWW, { recursive: true });

  // 2. Build + copia cada módulo
  for (const mod of MODULES) {
    build(mod);
    copyDist(mod);
  }

  log('Pronto. www/ tem os 4 módulos.');
}

main();
