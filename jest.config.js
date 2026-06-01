/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@argos-wallet/types$': '<rootDir>/packages/types/src',
    '^@argos-wallet/core$': '<rootDir>/packages/core/src',
    '^@argos-wallet/storage-memory$': '<rootDir>/packages/storage-memory/src',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.base.json',
    }],
  },
};
