// patch-android.mjs
//
// O projeto Android do Capacitor e gerado no CI com `npx cap add android`.
// Por isso, qualquer permissao nativa precisa ser reaplicada depois dessa etapa.

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const manifestPath = join(__dirname, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

const permissions = [
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
];

if (!existsSync(manifestPath)) {
  throw new Error(`AndroidManifest.xml nao encontrado em ${manifestPath}. Rode "npx cap add android" antes.`);
}

let xml = readFileSync(manifestPath, 'utf8');

for (const permission of permissions) {
  if (!xml.includes(`android:name="${permission}"`)) {
    xml = xml.replace(
      /<manifest([^>]*)>/,
      `<manifest$1>\n    <uses-permission android:name="${permission}" />`
    );
  }
}

writeFileSync(manifestPath, xml, 'utf8');
console.log(`[patch-android] Permissoes Android aplicadas em ${manifestPath}`);
