module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^../config/database$': '<rootDir>/src/__mocks__/database.ts',
    '^../../config/database$': '<rootDir>/src/__mocks__/database.ts',
    '^../../../config/database$': '<rootDir>/src/__mocks__/database.ts',
  },
};
