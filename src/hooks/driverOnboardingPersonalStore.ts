import { useCallback, useSyncExternalStore } from 'react';

export type DriverOnboardingPersonalData = {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  faceImage: string | null;
};

const defaultPersonalData: DriverOnboardingPersonalData = {
  name: '',
  cpf: '',
  phone: '',
  email: '',
  faceImage: null,
};

let personalData: DriverOnboardingPersonalData = { ...defaultPersonalData };
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach(listener => listener());
}

export function getDriverOnboardingPersonalData(): DriverOnboardingPersonalData {
  return personalData;
}

export function setDriverOnboardingPersonalData(
  partial: Partial<DriverOnboardingPersonalData>
): void {
  personalData = { ...personalData, ...partial };
  emitChange();
}

export function useDriverOnboardingPersonalData(): [
  DriverOnboardingPersonalData,
  (partial: Partial<DriverOnboardingPersonalData>) => void,
] {
  const snapshot = useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getDriverOnboardingPersonalData,
    getDriverOnboardingPersonalData
  );

  const updatePersonalData = useCallback((partial: Partial<DriverOnboardingPersonalData>) => {
    setDriverOnboardingPersonalData(partial);
  }, []);

  return [snapshot, updatePersonalData];
}
