# react-native-peripheral2

Fork from https://github.com/mybigday/react-native-multi-ble-peripheral

React Native BLE Peripheral Manager

## Installation

```sh
npm install react-native-multi-ble-peripheral
yarn add react-native-multi-ble-peripheral
```

### iOS

Add these lines in `Info.plist`

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>For advertise as BLE peripheral</string>
```

### Android

- Add these lines in `AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
```

#### Request permission

> Should check permission before create peripheral instance

```js
import { PermissionsAndroid } from 'react-native';

await PermissionsAndroid.request(
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  options,
);
await PermissionsAndroid.request(
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
  options,
);
```

## Usage

```js
import Peripheral, { Permission, Property } from 'react-native-multi-ble-peripheral';
import { Buffer } from 'buffer';

Peripheral.setDeviceName('MyDevice');

const peripheral = new Peripheral();

// We need wait peripheral manager ready before any operation.
peripheral.on('ready', async () => {
  await peripheral.addService('uuid', true);
  await peripheral.addCharacteristic(
    'uuid',
    'uuid2',
    Property.READ | Property.WRITE,
    Permission.READABLE | Permission.WRITEABLE
  );
  await peripheral.updateValue('uuid', 'uuid2', Buffer.from('Hello World!'));
  await peripheral.startAdvertising();
  // or advertising with service
  await peripheral.startAdvertising({uuid: null});
  // or advertising with service data
  await peripheral.startAdvertising({uuid: 'data'});
});

peripheral.on(
  'write',
  async ({
    requestId,
    device,
    deviceName,
    characteristic,
    service,
    value,
  }) => {
    const data = base64.decode(value);
    console.log('Peripheral write', {
      requestId,
      device,
      deviceName,
      characteristic,
      service,
      data,
    });
  })
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
