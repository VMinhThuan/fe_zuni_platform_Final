module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        allowUndefined: false, // ✅ thêm dòng này để lỗi ngay khi biến env chưa định nghĩa
      },
    ],
    'react-native-reanimated/plugin', // ✅ luôn ở cuối
  ],
};
