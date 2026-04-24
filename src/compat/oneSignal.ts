type DeviceState = {
  userId?: string;
  pushToken?: string;
  isSubscribed?: boolean;
  hasNotificationPermission?: boolean;
  isPushDisabled?: boolean;
};

const OneSignal = {
  getDeviceState: async (): Promise<DeviceState | null> => null,
  promptForPushNotificationsWithUserResponse: async (): Promise<boolean> => true,
  sendTags: async (_tags: Record<string, string>): Promise<void> => {},
};

export default OneSignal;
