/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.next/',
    'coverage/',
    '.turbo/',
    'packages/contracts/dist/',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': [
      'error',
      { max: 50, skipBlankLines: true, skipComments: true, IIFEs: true },
    ],
    'max-depth': ['error', 3],
    'max-params': ['error', 3],
    complexity: ['error', 10],
    'no-magic-numbers': [
      'error',
      {
        ignore: [-1, 0, 1, 2],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        ignoreClassFieldInitialValues: true,
        enforceConst: true,
        detectObjects: false,
      },
    ],
  },
  overrides: [
    {
      files: ['apps/web/**/*.{ts,tsx}', 'apps/admin/**/*.{ts,tsx}'],
      extends: ['next/core-web-vitals'],
    },
    {
      files: ['**/*.spec.ts', '**/*.test.ts', '**/*.test.tsx'],
      rules: {
        'max-lines-per-function': 'off',
        'max-depth': 'off',
        'max-params': 'off',
        complexity: 'off',
        'no-magic-numbers': 'off',
      },
    },
  ],
};
