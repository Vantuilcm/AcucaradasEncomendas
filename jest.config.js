module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/node_modules_old/',
    '/dist/',
    '/build/',
    '/build-logs/',
    '/src/__tests__/integration/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/node_modules_old/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native-vector-icons/(.*)$': '<rootDir>/src/__mocks__/expo-vector-icons.tsx',
    '^expo-modules-core$': '<rootDir>/src/__mocks__/expo-modules-core.ts',
    '^expo-modules-core/src/uuid/uuid\\.web$': '<rootDir>/src/__mocks__/expo-modules-core-uuid.web.ts',
    '^expo-modules-core/src/web/index\\.web$': '<rootDir>/src/__mocks__/expo-modules-core-web.ts',
    '^expo-modules-core/src/(.*)$': '<rootDir>/src/__mocks__/expo-modules-core.ts',
    '^expo-modules-core/(.*)$': '<rootDir>/src/__mocks__/expo-modules-core.ts',
  },
  transformIgnorePatterns: [
    'node_modules[/\\\\](?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?|@expo-google-fonts|react-navigation|@react-navigation|native-base|react-native-svg|react-native-reanimated|firebase|@firebase))',
    'node_modules[/\\\\]react-native-reanimated[/\\\\]plugin[/\\\\]',
  ],
}
