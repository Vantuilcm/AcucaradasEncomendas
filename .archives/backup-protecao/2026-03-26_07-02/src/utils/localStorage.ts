export const getLocalStorage = (key: string): string | null => {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const setLocalStorage = (key: string, value: string): void => {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(key, value);
  } catch {
    return;
  }
};

export const removeLocalStorage = (key: string): void => {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(key);
  } catch {
    return;
  }
};
