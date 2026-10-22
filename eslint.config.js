import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/**", "node_modules/**", "functions/node_modules/**"] },
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        // index.html / yükleyici tarafından window üzerine konan genel işlevler ve CDN kütüphaneleri
        showToast: "readonly", pdfKutuphaneleri: "readonly", heicKutuphanesi: "readonly",
        jspdf: "readonly", html2canvas: "readonly", heic2any: "readonly",
        // eski satır içi onclick işleyicileri tarafından çağrılan window işlevleri
        sekmeyiDegistir: "readonly", ekleModu: "readonly", modaliKapat: "readonly", resmiAc: "readonly",
        aramaOnbellek: "readonly", fkIstGuncelle: "readonly", fkZamanCiz: "readonly", pdfPaylasKartiAc: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", ignoreRestSiblings: true }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-constant-condition": ["error", { checkLoops: false }]
    }
  },
  { files: ["functions/**/*.js", "tests/**/*.{js,mjs}", "*.config.js"], languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: globals.node } },
  // Playwright'ın tarayıcıda çalıştırdığı kod parçaları ve sahte Firebase modülleri
  { files: ["tests/smoke/**/*.{js,mjs}"], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { files: ["public/sw.js"], languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: globals.serviceworker } }
];
