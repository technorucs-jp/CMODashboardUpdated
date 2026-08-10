import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// P5 (TASK.md §3) — one clock, Asia/Kolkata. Raw Date parsing is banned outside
// src/lib/time/**, which is the only module allowed to touch it.
const noRawDateSelectors = [
  {
    selector: "NewExpression[callee.name='Date']",
    message:
      'Raw `new Date(...)` is banned outside src/lib/time/** (P5). Use toBusinessDate() or another src/lib/time helper.',
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='parse']",
    message:
      'Raw `Date.parse(...)` is banned outside src/lib/time/** (P5). Use toBusinessDate() or another src/lib/time helper.',
  },
]

// P6 (TASK.md §3) — the computation core is pure and framework-agnostic. src/lib/**
// may not import the app layers or react. Matched against the raw import specifier
// string (glob, not a resolver) so it catches both the `@/*` alias and any relative
// escape hatch, without depending on a TS-aware resolver plugin.
const forbiddenAppLayerGroups = [
  '@/routes', '@/routes/*', '**/routes/*',
  '@/components', '@/components/*', '**/components/*',
  '@/data', '@/data/*', '**/data/*',
  '@/auth', '@/auth/*', '**/auth/*',
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // P5 — banned everywhere except src/lib/time/**
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/time/**'],
    rules: {
      'no-restricted-syntax': ['error', ...noRawDateSelectors],
    },
  },

  // P6 — src/lib/** may not import react or the app layers (routes/components/data/auth)
  {
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'src/lib/** must stay framework-agnostic (P6) — no React import.',
            },
          ],
          patterns: [
            {
              group: forbiddenAppLayerGroups,
              message:
                'src/lib/** may not import src/routes/**, src/components/**, src/data/**, or src/auth/** (P6 — the computation core has no I/O, no React, no app-layer dependency).',
            },
          ],
        },
      ],
    },
  },
])
