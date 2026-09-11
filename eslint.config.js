import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react,
    },
    extends: [
      js.configs.recommended,
      react.configs.flat.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
      // The browser's own dialogs render the BROWSER's chrome inside an app whose entire premise is
      // that it is an operating system — wrong face, wrong radius, wrong scrim, and stamped with
      // the deployment's hostname. They also block the main thread, freezing every animation behind
      // them. Lumina has its own; this is the rule that keeps the three that were here from coming
      // back one convenient call at a time.
      'no-restricted-globals': ['error',
        { name: 'alert', message: 'Use osAlert from src/utils/dialog.js — native dialogs break the OS illusion.' },
        { name: 'confirm', message: 'Use osConfirm from src/utils/dialog.js — native dialogs break the OS illusion.' },
        { name: 'prompt', message: 'Use osPrompt from src/utils/dialog.js — native dialogs break the OS illusion.' },
      ],
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/react-in-jsx-scope': 'off', // Not needed for React 17+
      'react/prop-types': 'off', // Disable prop-types as it's not used in this project
      'react/no-unknown-property': ['error', { ignore: ['intensity', 'position', 'args', 'rotation', 'opacity', 'transparent', 'attach', 'object', 'geometry', 'material', 'credentialless'] }],
    },
  },
])
