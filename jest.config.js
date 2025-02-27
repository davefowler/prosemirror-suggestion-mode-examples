module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!prosemirror-.*)'
  ],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  moduleNameMapper: {
    '^../../src/(.*)$': '<rootDir>/src/$1'
  },
  // Ignore the dist/test directory since we're testing the TypeScript files directly
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Prevent tests from running in parallel which can cause memory issues
  maxWorkers: 1,
  // Add a timeout to prevent infinite loops
  testTimeout: 10000,
  // Force exit if tests are hanging
  forceExit: true,
  // Detect open handles (like unresolved promises)
  detectOpenHandles: true
};
