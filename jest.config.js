module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.ts'],
    forceExit: true,
    testTimeout: 30000,
    silent: true
};