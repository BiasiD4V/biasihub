// Builda os modulos com base relativa para o protocolo app:// do Electron.
// O APK usa bases absolutas por subpath; reaproveitar esse dist no desktop causa tela branca.

import { execSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs';
import { isAbsolute, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DESKTOP = resolve(__dirname, '..');
const ROOT = resolve(DESKTOP, '..');
const APPS = join(DESKTOP, 'apps');

const MODULES = [
  { name: 'Hub', dir: join(ROOT, 'Hub', 'app'), dest: join(APPS, 'hub') },
  { name: 'Almoxarifado', dir: join(ROOT, 'Almoxarifado', 'app'), dest: join(APPS, 'almoxarifado') },
  { name: 'Comercial', dir: join(ROOT, 'Comercial', 'orcamentos'), dest: join(APPS, 'comercial') },
  { name: 'Obras', dir: join(ROOT, 'Obras', 'app'), dest: join(APPS, 'obras') },
];

function log(msg) {
  console.log(`\x1b[36m[desktop-apps]\x1b[0m ${msg}`);
}

function assertInside(parent, child) {
  const rel = relative(parent, child);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Caminho fora do alvo esperado: ${child}`);
  }
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
  log(`Compilando ${mod.name} com base=./...`);
  execSync('npx vite build --base=./', {
    cwd: mod.dir,
    stdio: 'inherit',
    env: { ...process.env, BUILD_BASE: './' },
  });
}

function copyDist(mod) {
  const distDir = join(mod.dir, 'dist');
  if (!existsSync(distDir)) {
    throw new Error(`dist nao encontrado em ${distDir}. Build falhou?`);
  }
  assertInside(APPS, mod.dest);
  log(`Copiando ${mod.name} -> ${mod.dest}...`);
  if (existsSync(mod.dest)) rmSync(mod.dest, { recursive: true, force: true });
  mkdirSync(mod.dest, { recursive: true });
  for (const entry of readdirSync(distDir)) {
    copyRecursive(join(distDir, entry), join(mod.dest, entry));
  }
}

function main() {
  assertInside(DESKTOP, APPS);
  log('Limpando Desktop/apps...');
  if (existsSync(APPS)) rmSync(APPS, { recursive: true, force: true });
  mkdirSync(APPS, { recursive: true });

  for (const mod of MODULES) {
    build(mod);
    copyDist(mod);
  }

  log('Pronto. Desktop/apps esta pronto para o Electron.');
}

main();
