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

function hasStoredString(value: string | undefined): value is string {
  return value != null && value !== '';
}

function hasStoredFaceImage(value: string | null | undefined): value is string {
  return value != null && value !== '';
}

export function mergeDriverOnboardingPersonalDataFromFirestore(
  loaded: Partial<DriverOnboardingPersonalData>
): void {
  const current = getDriverOnboardingPersonalData();

  setDriverOnboardingPersonalData({
    name: hasStoredString(loaded.name) ? loaded.name : current.name,
    cpf: hasStoredString(loaded.cpf) ? loaded.cpf : current.cpf,
    phone: hasStoredString(loaded.phone) ? loaded.phone : current.phone,
    email: hasStoredString(loaded.email) ? loaded.email : current.email,
    faceImage: hasStoredFaceImage(loaded.faceImage) ? loaded.faceImage : current.faceImage,
  });
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
