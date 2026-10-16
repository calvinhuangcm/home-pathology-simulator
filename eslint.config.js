import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';
export default ts.config(
  { ignores: ['public/**', 'dist/**', 'docs/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node, THREE: 'readonly' } } },
  { files: ['src/legacy/**/*.js'], rules: { '@typescript-eslint/no-unused-vars': 'off', '@typescript-eslint/no-unused-expressions': 'off' } },
);
