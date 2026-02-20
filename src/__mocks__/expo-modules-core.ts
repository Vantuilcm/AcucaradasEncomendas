import uuidWeb from './expo-modules-core-uuid.web';

type NativeModuleObject = Record<string, any>;

class EventEmitter {
  addListener(_eventName: string, _listener: (...args: any[]) => void) {
    return { remove() {} };
  }

  removeAllListeners(_eventName?: string) {}
}

export class LegacyEventEmitter {
  constructor(_nativeModule?: any) {}

  addListener(_eventName: string, _listener: (...args: any[]) => void) {
    return { remove() {} };
  }

  removeAllListeners(_eventName?: string) {}
}

class NativeModule {}

class SharedObject {}

if (!(globalThis as any).expo) {
  (globalThis as any).expo = { EventEmitter, NativeModule, SharedObject };
}

export class UnavailabilityError extends Error {
  constructor(moduleName: string, propertyName?: string) {
    super(
      propertyName
        ? `The native module '${moduleName}' doesn't seem to be linked. '${propertyName}' is unavailable.`
        : `The native module '${moduleName}' doesn't seem to be linked.`
    );
    this.name = 'UnavailabilityError';
  }
}

export class CodedError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'CodedError';
    this.code = code;
  }
}

export const uuid = {
  v4: uuidWeb.v4,
  v5: uuidWeb.v5,
};

export const NativeModulesProxy: Record<string, any> = {};

export function createSnapshotFriendlyRef() {
  const ref = { current: null as any };
  Object.defineProperty(ref, 'toJSON', {
    value: () => '[React.ref]',
  });
  return ref;
}

export function createPermissionHook(_permissionMethods: any) {
  return function useMockPermissionHook() {
    const response = null as any;
    const requestPermission = async () => ({ status: 'granted' } as any);
    const getPermission = async () => ({ status: 'granted' } as any);
    return [response, requestPermission, getPermission] as const;
  };
}

function getMockNativeModule(moduleName: string): NativeModuleObject {
  if (moduleName === 'ExpoDevice') {
    return { isDevice: true };
  }
  return {};
}

export function requireOptionalNativeModule(moduleName: string): NativeModuleObject | null {
  return getMockNativeModule(moduleName);
}

export function requireNativeModule(moduleName: string): NativeModuleObject {
  return getMockNativeModule(moduleName);
}

export function requireNativeViewManager(_viewName: string) {
  return null;
}

export { EventEmitter, NativeModule, SharedObject };

export default {
  UnavailabilityError,
  CodedError,
  uuid,
  NativeModulesProxy,
  createSnapshotFriendlyRef,
  createPermissionHook,
  requireOptionalNativeModule,
  requireNativeModule,
  requireNativeViewManager,
  EventEmitter,
  LegacyEventEmitter,
  NativeModule,
  SharedObject,
};
