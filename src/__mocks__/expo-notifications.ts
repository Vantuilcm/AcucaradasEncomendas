export const getPermissionsAsync = jest.fn(async () => ({ status: 'granted' }));
export const requestPermissionsAsync = jest.fn(async () => ({ status: 'granted' }));
export const getExpoPushTokenAsync = jest.fn(async () => ({ data: 'ExpoPushToken[TEST]' }));
export const scheduleNotificationAsync = jest.fn(async () => 'notification-id');
export const cancelScheduledNotificationAsync = jest.fn(async () => undefined);
export const cancelAllScheduledNotificationsAsync = jest.fn(async () => undefined);
export const addNotificationReceivedListener = jest.fn();
export const addNotificationResponseReceivedListener = jest.fn();
export const removeNotificationSubscription = jest.fn();
let _notificationHandler: any = null;
const setHandlerFn: any = jest.fn((handler?: any) => {
  if (handler) {
    _notificationHandler = handler;
  }
  return _notificationHandler || { handleNotification: jest.fn(async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: true })) };
});

setHandlerFn.handleNotification = async (payload?: any) => {
  ;(globalThis as any).__NOTIF_BADGE__ = true;
  if (_notificationHandler && typeof _notificationHandler.handleNotification === 'function') {
    return _notificationHandler.handleNotification(payload);
  }
  return { shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: true };
};

export const setNotificationHandler = setHandlerFn;
export const setNotificationChannelAsync = jest.fn();
export const AndroidImportance = { DEFAULT: 3, HIGH: 4, MAX: 5 };
export default {
  getPermissionsAsync,
  requestPermissionsAsync,
  getExpoPushTokenAsync,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  removeNotificationSubscription,
  setNotificationHandler,
  setNotificationChannelAsync,
  AndroidImportance,
};
