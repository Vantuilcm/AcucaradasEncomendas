import * as React from 'react';
import { View } from 'react-native';
import { useSafeAreaFrame } from 'react-native-safe-area-context';
import useLatestCallback from 'use-latest-callback';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';

const FrameContext = React.createContext(undefined);

export function useFrameSize(selector, throttle) {
  const context = React.useContext(FrameContext);
  if (context == null) {
    throw new Error('useFrameSize must be used within a FrameSizeProvider');
  }
  return useSyncExternalStoreWithSelector(
    throttle ? context.subscribeThrottled : context.subscribe,
    context.getCurrent,
    context.getCurrent,
    selector
  );
}

export function FrameSizeProvider({ initialFrame, children }) {
  const context = React.useContext(FrameContext);
  if (context != null) {
    return children;
  }
  return (
    <FrameSizeProviderInner initialFrame={initialFrame}>{children}</FrameSizeProviderInner>
  );
}

function FrameSizeProviderInner({ initialFrame, children }) {
  const frameRef = React.useRef({ width: initialFrame.width, height: initialFrame.height });
  const listeners = React.useRef(new Set());
  const getCurrent = useLatestCallback(() => frameRef.current);
  const subscribe = useLatestCallback((listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  });
  const subscribeThrottled = subscribe;

  const frame = useSafeAreaFrame();
  React.useEffect(() => {
    const next = { width: frame.width, height: frame.height };
    const changed = next.width !== frameRef.current.width || next.height !== frameRef.current.height;
    frameRef.current = next;
    if (changed) {
      for (const l of Array.from(listeners.current)) l();
    }
  }, [frame.width, frame.height]);

  return (
    <FrameContext.Provider value={{ getCurrent, subscribe, subscribeThrottled }}>
      <View style={{ flex: 1 }}>{children}</View>
    </FrameContext.Provider>
  );
}
