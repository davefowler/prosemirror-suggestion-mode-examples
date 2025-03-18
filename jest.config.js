export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        isolatedModules: true, // This helps with memory usage
      },
    ],
    '^.+\\.jsx?$': [
      'babel-jest',
      {
        presets: [
          [
            '@babel/preset-env',
            {
              targets: {
                node: 'current',
              },
            },
          ],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!prosemirror-.*|ist)'],
  testRegex: '/(test|jest)/.*test.*\\.(js|ts)x?$',
  collectCoverage: false, // Disable coverage to reduce memory usage
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  moduleNameMapper: {
    '^../../src/(.*)$': '<rootDir>/src/$1',
  },
  // Ignore the dist/test directory since we're testing the TypeScript files directly
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Prevent tests from running in parallel which can cause memory issues
  maxWorkers: 1,
  // Add a timeout to prevent infinite loops
  testTimeout: 5000,
  // Force exit if tests are hanging
  forceExit: true,
  // Detect open handles (like unresolved promises)
  detectOpenHandles: true,
  // Limit memory usage
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
