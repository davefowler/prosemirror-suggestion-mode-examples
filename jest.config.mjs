export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
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
  testRegex: '/test/(integration|unit|prosemirror).*test.*\\.(js|ts)x?$',
  collectCoverage: false,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  moduleNameMapper: {
    '^../../src/(.*)$': '<rootDir>/src/$1',
    '^prosemirror-suggestion-mode$': '<rootDir>/src/index.ts',
    '^prosemirror-suggestion-mode/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  maxWorkers: 1,
  testTimeout: 5000,
  forceExit: true,
  detectOpenHandles: true,
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFiles: ['./jest.setup.js'],
};
