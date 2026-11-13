/* eslint-env jest */
// Bileşen testleri için ortak sahte modüller (yerel modüller Jest ortamında yoktur)

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// İkon fontları testte yüklenmez; adını yazan basit bir Text yeterli
jest.mock('@expo/vector-icons', () => {
    const React = require('react');
    const { Text } = require('react-native');
    const Icon = ({ name }) => React.createElement(Text, null, `icon:${name}`);
    return { Feather: Icon };
});

// Google Drive senkronu yerel Google Sign-In modülüne bağlıdır
jest.mock('./src/utils/googleDrive', () => ({
    scheduleDriveSync: jest.fn(),
    flushDriveSync: jest.fn(),
    cancelPendingDriveSync: jest.fn(),
}));
