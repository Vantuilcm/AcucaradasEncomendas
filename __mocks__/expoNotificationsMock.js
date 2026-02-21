module.exports = {
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'push-token' }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
};
