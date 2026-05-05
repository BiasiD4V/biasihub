// patch-android.mjs
//
// O projeto Android do Capacitor e gerado no CI com `npx cap add android`.
// Por isso, qualquer permissao nativa precisa ser reaplicada depois dessa etapa.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const manifestPath = join(__dirname, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const mainActivityPath = join(__dirname, 'android', 'app', 'src', 'main', 'java', 'br', 'com', 'biasi', 'hub', 'MainActivity.java');
const xmlDir = join(__dirname, 'android', 'app', 'src', 'main', 'res', 'xml');
const filePathsPath = join(xmlDir, 'file_paths.xml');

const permissions = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.REQUEST_INSTALL_PACKAGES',
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

if (!xml.includes('androidx.core.content.FileProvider')) {
  xml = xml.replace(
    /<application([^>]*)>/,
    `<application$1>\n        <provider\n            android:name="androidx.core.content.FileProvider"\n            android:authorities="\${applicationId}.fileprovider"\n            android:exported="false"\n            android:grantUriPermissions="true">\n            <meta-data\n                android:name="android.support.FILE_PROVIDER_PATHS"\n                android:resource="@xml/file_paths" />\n        </provider>`
  );
}

writeFileSync(manifestPath, xml, 'utf8');

mkdirSync(xmlDir, { recursive: true });
writeFileSync(filePathsPath, `<?xml version="1.0" encoding="utf-8"?>\n<paths xmlns:android="http://schemas.android.com/apk/res/android">\n    <external-files-path name="updates" path="Download/updates/" />\n    <external-cache-path name="external_cache" path="." />\n    <cache-path name="cache" path="." />\n</paths>\n`, 'utf8');

writeFileSync(mainActivityPath, `package br.com.biasi.hub;\n\nimport android.Manifest;\nimport android.annotation.SuppressLint;\nimport android.content.ActivityNotFoundException;\nimport android.content.Intent;\nimport android.content.pm.PackageManager;\nimport android.net.Uri;\nimport android.os.Build;\nimport android.os.Bundle;\nimport android.os.Environment;\nimport android.provider.Settings;\nimport android.webkit.JavascriptInterface;\nimport android.widget.Toast;\n\nimport androidx.core.content.FileProvider;\n\nimport com.getcapacitor.BridgeActivity;\n\nimport java.io.File;\nimport java.io.FileOutputStream;\nimport java.io.InputStream;\nimport java.net.HttpURLConnection;\nimport java.net.URL;\n\npublic class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        super.onCreate(savedInstanceState);\n        if (getBridge() != null && getBridge().getWebView() != null) {\n            getBridge().getWebView().addJavascriptInterface(new BiasiApkInstaller(this), \"BiasiApkInstaller\");\n        }\n    }\n\n    public static class BiasiApkInstaller {\n        private final MainActivity activity;\n\n        BiasiApkInstaller(MainActivity activity) {\n            this.activity = activity;\n        }\n\n        @JavascriptInterface\n        public void installApk(String apkUrl, String fileName) {\n            if (apkUrl == null || apkUrl.trim().isEmpty()) {\n                showToast(\"Link do APK invalido.\");\n                return;\n            }\n\n            new Thread(() -> {\n                try {\n                    File dir = new File(activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), \"updates\");\n                    if (!dir.exists() && !dir.mkdirs()) {\n                        throw new Exception(\"Nao foi possivel criar a pasta de download.\");\n                    }\n\n                    String safeName = sanitizeFileName(fileName == null || fileName.trim().isEmpty() ? \"biasihub-update.apk\" : fileName);\n                    File apkFile = new File(dir, safeName);\n                    download(apkUrl, apkFile);\n                    activity.runOnUiThread(() -> openInstaller(apkFile));\n                } catch (Exception error) {\n                    showToast(\"Nao foi possivel baixar o APK: \" + error.getMessage());\n                }\n            }).start();\n        }\n\n        private static String sanitizeFileName(String value) {\n            return value.replaceAll(\"[^A-Za-z0-9._-]\", \"_\");\n        }\n\n        private void download(String apkUrl, File outFile) throws Exception {\n            HttpURLConnection connection = (HttpURLConnection) new URL(apkUrl).openConnection();\n            connection.setConnectTimeout(20000);\n            connection.setReadTimeout(60000);\n            connection.setInstanceFollowRedirects(true);\n            connection.connect();\n\n            int code = connection.getResponseCode();\n            if (code < 200 || code >= 300) {\n                throw new Exception(\"HTTP \" + code);\n            }\n\n            try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(outFile, false)) {\n                byte[] buffer = new byte[8192];\n                int read;\n                while ((read = input.read(buffer)) != -1) {\n                    output.write(buffer, 0, read);\n                }\n                output.flush();\n            } finally {\n                connection.disconnect();\n            }\n        }\n\n        @SuppressLint(\"InlinedApi\")\n        private void openInstaller(File apkFile) {\n            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !activity.getPackageManager().canRequestPackageInstalls()) {\n                showToast(\"Autorize o BiasiHub a instalar atualizacoes e toque em Atualizar novamente.\");\n                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);\n                intent.setData(Uri.parse(\"package:\" + activity.getPackageName()));\n                activity.startActivity(intent);\n                return;\n            }\n\n            Uri uri = FileProvider.getUriForFile(activity, activity.getPackageName() + \".fileprovider\", apkFile);\n            Intent intent = new Intent(Intent.ACTION_VIEW);\n            intent.setDataAndType(uri, \"application/vnd.android.package-archive\");\n            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);\n\n            try {\n                activity.startActivity(intent);\n            } catch (ActivityNotFoundException error) {\n                showToast(\"Instalador do Android nao encontrado.\");\n            }\n        }\n\n        private void showToast(String message) {\n            activity.runOnUiThread(() -> Toast.makeText(activity, message, Toast.LENGTH_LONG).show());\n        }\n    }\n}\n`, 'utf8');

console.log(`[patch-android] Permissoes, FileProvider e instalador APK aplicados em ${manifestPath}`);
// Nota: signing é passado via -P no gradlew assembleRelease (workflow build-apk.yml)
// nao precisa mexer no build.gradle.
