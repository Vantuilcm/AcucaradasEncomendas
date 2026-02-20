export const OneSignal = {
  initialize: () => {},
  setLogLevel: () => {},
  Notifications: {
    requestPermission: () => Promise.resolve(true),
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  InAppMessages: {
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  User: {
    addTag: () => {},
    addTags: () => {},
    removeTag: () => {},
    removeTags: () => {},
    getTags: () => Promise.resolve({}),
  },
  logout: () => {},
  login: () => {},
};

export default OneSignal;
