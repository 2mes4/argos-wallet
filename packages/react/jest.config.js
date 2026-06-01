/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        strict: true,
        esModuleInterop: true,
        jsx: 'react-jsx',
        lib: ['ES2022', 'DOM'],
        module: 'commonjs',
        target: 'ES2022',
        moduleResolution: 'node',
        noUnusedLocals: false,
        noUnusedParameters: false,
      },
    }],
  },
  moduleNameMapper: {
    '^@argos-wallet/types$': '<rootDir>/../types/src',
  },
};
