import type { EventSubscription } from 'react-native';
import type { Buffer } from 'buffer';
import { NativeModules, Platform, NativeEventEmitter } from 'react-native';
import { EventEmitter } from 'eventemitter3';

const LINKING_ERROR =
  `The package '@fugood/react-native-multi-ble-peripheral' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const { ReactNativeMultiBlePeripheral: NativePeripheral } = NativeModules;

let nextId = 0;
const nativeEvents = NativePeripheral
  ? new NativeEventEmitter(NativePeripheral)
  : null;

export enum Permission {
  READABLE = 0x01,
  WRITEABLE = 0x10,
}

export enum Property {
  BROADCAST = 1,
  READ = 2,
  WRITE_NO_RESPONSE = 4,
  WRITE = 8,
  NOTIFY = 16,
  INDICATE = 32,
  SIGNED_WRITE = 64,
  EXTENDED_PROPS = 128,
}

export enum TxPowerLevel {
  ULTRA_LOW = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
}

export enum AdvertiseMode {
  LOW_LATENCY = 0,
  LOW_POWER = 1,
  BALANCED = 2,
}

export interface AdvertiseServices {
  [key: string]: Buffer;
}

export interface AdvertiseOptions {
  mode?: AdvertiseMode;
  txPowerLevel?: TxPowerLevel;
  connectable?: boolean;
  includeDeviceName?: boolean;
  includeTxPowerLevel?: boolean;
  manufacturerId?: number;
  manufacturerData?: Buffer;
}

export interface WriteEvent {
  service: string;
  characteristic: string;
  value: string;
  device: string;
  requestId: number;
}

export interface ReadEvent {
  service: string;
  characteristic: string;
  offset: number;
  device: string;
  requestId: number;
}

export interface SubscriptionEvent {
  serviceUuid: string;
  characteristicUuid: string;
}

class Peripheral extends EventEmitter {
  private id: number;
  private _listeners?: EventSubscription[];
  private destroyed: boolean = false;

  constructor() {
    if (!NativePeripheral) {
      throw new Error(LINKING_ERROR);
    }
    super();
    this.id = nextId++;
    this._listeners = [
      nativeEvents!.addListener('onWrite', ({ id, ...args }) => {
        if (!this.destroyed && id === this.id) {
          this.emit('write', args as WriteEvent);
        }
      }),
      nativeEvents!.addListener('onRead', ({ id, ...args }) => {
        if (!this.destroyed && id === this.id) {
          this.emit('read', args as ReadEvent);
        }
      }),
      nativeEvents!.addListener('onSubscribe', ({ id, ...args }) => {
        if (!this.destroyed && id === this.id) {
          this.emit('subscribe', args as SubscriptionEvent);
        }
      }),
      nativeEvents!.addListener('onUnsubscribe', ({ id, ...args }) => {
        if (!this.destroyed && id === this.id) {
          this.emit('unsubscribe', args as SubscriptionEvent);
        }
      }),
    ];
    this.on('destroy', () => {
      if (this.destroyed) return;
      this.destroyed = true;
      this._listeners?.forEach((listener) => listener.remove());
      delete this._listeners;
    });
    NativePeripheral.createPeripheral(this.id)
      .then(() => {
        this.emit('ready');
      })
      .catch((err: Error) => {
        this.emit('error', err);
      });
  }

  static async setDeviceName(name: string) {
    return NativePeripheral.setDeviceName(name);
  }

  async checkState(): Promise<string> {
    return NativePeripheral.checkState(this.id);
  }

  async startAdvertising(
    servicesOrOpts?: AdvertiseServices | AdvertiseOptions,
    options?: AdvertiseOptions
  ) {
    const { manufacturerData, ...rest } = options || servicesOrOpts || {};
    const stringifiedOptions = {
      ...rest,
      manufacturerData: manufacturerData?.toString('base64'),
    };
    const stringifiedServices =
      servicesOrOpts
        ? Object.fromEntries(
            Object.entries(servicesOrOpts).map(([key, value]) => [
              key,
              value ? value.toString('base64') : value,
            ])
          )
        : null;
    return NativePeripheral.startAdvertising(
      this.id,
      stringifiedServices,
      stringifiedOptions
    );
  }

  async stopAdvertising() {
    return NativePeripheral.stopAdvertising(this.id);
  }

  async sendResponse(
    deviceAddress: string,
    requestId: number,
    status: number,
    offset: number,
    value: Buffer
  ) {
    return NativePeripheral.sendResponse(
      this.id,
      deviceAddress,
      requestId,
      status,
      offset,
      value.toString('base64')
    );
  }

  async addService(uuid: string, primary: boolean) {
    return NativePeripheral.addService(this.id, uuid, primary);
  }

  async addCharacteristic(
    serviceUuid: string,
    uuid: string,
    properties: Property,
    permissions: Permission
  ) {
    return NativePeripheral.addCharacteristic(
      this.id,
      serviceUuid,
      uuid,
      properties,
      permissions
    );
  }

  async updateValue(
    serviceUuid: string,
    characteristicUuid: string,
    value: Buffer
  ) {
    return NativePeripheral.updateValue(
      this.id,
      serviceUuid,
      characteristicUuid,
      value.toString('base64')
    );
  }

  async sendNotification(
    serviceUuid: string,
    characteristicUuid: string,
    value: Buffer,
    isIndication: boolean = false
  ) {
    return NativePeripheral.sendNotification(
      this.id,
      serviceUuid,
      characteristicUuid,
      value.toString('base64'),
      isIndication
    );
  }

  async destroy() {
    return NativePeripheral.destroyPeripheral(this.id).then(() => {
      this.emit('destroy');
    });
  }
}

export default Peripheral;
