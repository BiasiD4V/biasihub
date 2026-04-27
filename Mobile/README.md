# BiasíHub Mobile

App Android (Capacitor) com os 4 módulos do BiasíHub embarcados.

## Como funciona

- O **Hub** é a entrada do app (sidebar com os módulos disponíveis).
- O Hub detecta `window.Capacitor` e linka pros módulos via subpaths locais (`/almox/`, `/comercial/`, `/obras/`).
- Tudo roda dentro do webview Android — Supabase e demais APIs continuam online (igual no Desktop).

## Build local (precisa Android SDK + JDK 17)

```bash
cd Mobile
npm install
npm run build:android:debug   # gera APK debug em android/app/build/outputs/apk/debug/
```

## Build na cloud (recomendado)

A cada push pra `main`, o workflow `.github/workflows/build-apk.yml` builda o APK e anexa ao último release do Desktop. Não precisa instalar nada local.

## Estrutura

```
Mobile/
├── package.json           # Capacitor deps
├── capacitor.config.ts    # appId, webDir
├── prepare-www.mjs        # builda 4 módulos com BUILD_BASE correto
├── www/                   # gerado (gitignore) — bundle dos 4 módulos
└── android/               # gerado (gitignore) — projeto Android nativo
```

## Pipeline

1. `npm run prepare-www` → builda Hub, Almox, Comercial, Obras com `BUILD_BASE` correto e copia pra `www/`
2. `npm run sync` → Capacitor copia `www/` pro projeto Android
3. `gradlew assembleRelease` → gera o APK
