type ScreenshotListener = {
  remove: () => void;
};

export const preventScreenCaptureAsync = async (): Promise<void> => {};

export const allowScreenCaptureAsync = async (): Promise<void> => {};

export const addScreenshotListener = (_listener: () => void): ScreenshotListener => {
  return { remove: () => {} };
};
