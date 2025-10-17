import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude archived tests from execution
    exclude: [
      '**/node_modules/**',
      '**/archive/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.test.js',
        '**/*.spec.ts',
        '**/*.spec.js',
        'docs/',
        'scripts/',
        'infrastructure/',
        '.claude/',
        'coverage/',
        'dist/',
        'build/',
      ],
      // Include source files for coverage analysis
      include: [
        'packages/*/src/**/*.{js,ts}',
        'src/**/*.{js,ts}',
      ],
    },
    // Test execution settings
    globals: true,
    environment: 'node',
  },
});
