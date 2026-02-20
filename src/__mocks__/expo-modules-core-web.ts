type Listener = (...args: any[]) => void;

class EventEmitter {
  addListener(_eventName: string, _listener: Listener) {
    return { remove() {} };
  }

  removeAllListeners(_eventName?: string) {}
}

class NativeModule {}

class SharedObject {}

if (!(globalThis as any).expo) {
  (globalThis as any).expo = { EventEmitter, NativeModule, SharedObject };
}

export {};

