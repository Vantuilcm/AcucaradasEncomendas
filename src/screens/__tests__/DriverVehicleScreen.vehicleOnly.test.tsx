/**
 * AE_COURIER_PROFILE_MY_VEHICLE_ISOLATED_EDITOR_MINIMAL_IMPLEMENTATION_004
 * Vehicle-only editor contract — service mocks only; no Firestore / Storage.
 */

jest.mock('../../services/DeliveryDriverService', () => ({
  DeliveryDriverService: jest.fn().mockImplementation(() => ({
    getDriverByUserId: jest.fn(),
    updateDriver: jest.fn(),
    createDriver: jest.fn(),
  })),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('../../utils/UserUtils', () => ({
  UserUtils: {
    getUserId: (user: { id?: string; uid?: string } | null | undefined) =>
      user?.id || user?.uid || undefined,
  },
}));

jest.mock('../../services/LoggingService', () => ({
  loggingService: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(View, props, children),
  };
});

import {
  assertDriverOwnership,
  formFromDriverVehicle,
  loadDriverVehicleForEdit,
  saveVehicleOnlyUpdate,
  validateVehicleForm,
} from '../DriverVehicleScreen';

const AUTH_UID = 'courier-uid-001';

const baseDriver = {
  id: 'driver-doc-001',
  userId: AUTH_UID,
  name: 'Entregador Teste',
  phone: '11999999999',
  email: 'e@test.com',
  cpf: '00000000000',
  cnh: '123',
  vehicle: {
    type: 'motorcycle' as const,
    brand: 'Honda',
    model: 'CG',
    year: 2020,
    plate: 'ABC1D23',
    color: 'Vermelha',
  },
  documents: {
    cnhImage: 'https://example/cnh.jpg',
    vehicleDocument: 'https://example/veiculo.jpg',
    insurance: 'https://example/seguro.jpg',
    faceImage: 'https://example/face.jpg',
  },
  status: 'active' as const,
  rating: 4.5,
  totalDeliveries: 10,
  totalEarnings: 500,
  availability: {
    isAvailable: true,
    workingHours: { start: '08:00', end: '18:00' },
    workingDays: ['monday' as const],
  },
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

function createServiceMock(overrides?: {
  getDriverByUserId?: jest.Mock;
  updateDriver?: jest.Mock;
  createDriver?: jest.Mock;
}) {
  return {
    getDriverByUserId: overrides?.getDriverByUserId || jest.fn().mockResolvedValue(baseDriver),
    updateDriver: overrides?.updateDriver || jest.fn().mockResolvedValue(undefined),
    createDriver: overrides?.createDriver || jest.fn(),
  };
}

describe('DriverVehicle vehicle-only contract helpers', () => {
  it('loads vehicle fields from existing driver record', () => {
    const form = formFromDriverVehicle(baseDriver.vehicle);
    expect(form).toEqual({
      type: 'motorcycle',
      brand: 'Honda',
      model: 'CG',
      year: '2020',
      plate: 'ABC1D23',
      color: 'Vermelha',
    });
  });

  it('rejects incomplete vehicle form (blocks incomplete payload)', () => {
    const result = validateVehicleForm({
      type: 'motorcycle',
      brand: 'Honda',
      model: '',
      year: '2020',
      plate: 'ABC1D23',
      color: 'Vermelha',
    });
    expect(result.ok).toBe(false);
  });

  it('validates all six fields and builds vehicle-only payload', () => {
    const result = validateVehicleForm({
      type: 'car',
      brand: 'Fiat',
      model: 'Uno',
      year: '2018',
      plate: 'XYZ9A87',
      color: 'Branca',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.payload).toEqual({
      vehicle: {
        type: 'car',
        brand: 'Fiat',
        model: 'Uno',
        year: 2018,
        plate: 'XYZ9A87',
        color: 'Branca',
      },
    });
    expect(Object.keys(result.payload)).toEqual(['vehicle']);
    expect(result.payload).not.toHaveProperty('documents');
    expect(result.payload).not.toHaveProperty('totalEarnings');
    expect(result.payload).not.toHaveProperty('status');
    expect(result.payload).not.toHaveProperty('userId');
  });

  it('rejects divergent userId ownership', () => {
    const result = assertDriverOwnership(AUTH_UID, {
      ...baseDriver,
      userId: 'other-uid',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects missing driver and unauthenticated user', () => {
    expect(assertDriverOwnership(undefined, baseDriver).ok).toBe(false);
    expect(assertDriverOwnership(AUTH_UID, null).ok).toBe(false);
  });
});

describe('DriverVehicle load/save orchestration', () => {
  it('loads existing vehicle for authenticated courier', async () => {
    const service = createServiceMock();
    const result = await loadDriverVehicleForEdit(AUTH_UID, service);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.driverId).toBe('driver-doc-001');
    expect(result.form.brand).toBe('Honda');
    expect(service.getDriverByUserId).toHaveBeenCalledWith(AUTH_UID);
    expect(service.createDriver).not.toHaveBeenCalled();
    expect(service.updateDriver).not.toHaveBeenCalled();
  });

  it('does not update without authenticated user', async () => {
    const service = createServiceMock();
    const load = await loadDriverVehicleForEdit(undefined, service);
    expect(load.ok).toBe(false);
    const save = await saveVehicleOnlyUpdate({
      authUserId: undefined,
      boundUserId: AUTH_UID,
      boundDriverId: 'driver-doc-001',
      vehicleReady: true,
      form: formFromDriverVehicle(baseDriver.vehicle)!,
      service,
    });
    expect(save.ok).toBe(false);
    expect(service.updateDriver).not.toHaveBeenCalled();
    expect(service.createDriver).not.toHaveBeenCalled();
  });

  it('does not update without matching driver record', async () => {
    const service = createServiceMock({
      getDriverByUserId: jest.fn().mockResolvedValue(null),
    });
    const load = await loadDriverVehicleForEdit(AUTH_UID, service);
    expect(load.ok).toBe(false);
    expect(service.updateDriver).not.toHaveBeenCalled();
  });

  it('blocks save when loaded record userId diverges', async () => {
    const service = createServiceMock({
      getDriverByUserId: jest
        .fn()
        .mockResolvedValue({ ...baseDriver, userId: 'hijacked-uid' }),
    });
    const save = await saveVehicleOnlyUpdate({
      authUserId: AUTH_UID,
      boundUserId: AUTH_UID,
      boundDriverId: 'driver-doc-001',
      vehicleReady: true,
      form: formFromDriverVehicle(baseDriver.vehicle)!,
      service,
    });
    expect(save.ok).toBe(false);
    if (save.ok) {
      return;
    }
    expect(save.message).toBe('Registro não pertence ao usuário autenticado.');
    expect(service.updateDriver).not.toHaveBeenCalled();
    expect(service.createDriver).not.toHaveBeenCalled();
  });

  it('calls updateDriver only with complete vehicle payload', async () => {
    const service = createServiceMock();
    const form = formFromDriverVehicle(baseDriver.vehicle)!;
    form.color = 'Preta';

    const save = await saveVehicleOnlyUpdate({
      authUserId: AUTH_UID,
      boundUserId: AUTH_UID,
      boundDriverId: 'driver-doc-001',
      vehicleReady: true,
      form,
      service,
    });

    expect(save.ok).toBe(true);
    expect(service.updateDriver).toHaveBeenCalledTimes(1);
    const [driverId, payload] = service.updateDriver.mock.calls[0];
    expect(driverId).toBe('driver-doc-001');
    expect(payload).toEqual({
      vehicle: {
        type: 'motorcycle',
        brand: 'Honda',
        model: 'CG',
        year: 2020,
        plate: 'ABC1D23',
        color: 'Preta',
      },
    });
    expect(payload).not.toHaveProperty('documents');
    expect(payload).not.toHaveProperty('totalEarnings');
    expect(payload).not.toHaveProperty('totalDeliveries');
    expect(payload).not.toHaveProperty('rating');
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('name');
    expect(payload).not.toHaveProperty('cpf');
    expect(payload).not.toHaveProperty('userId');
    expect(service.createDriver).not.toHaveBeenCalled();
  });

  it('does not report success when persistence fails', async () => {
    const service = createServiceMock({
      updateDriver: jest.fn().mockRejectedValue(new Error('persist-fail')),
    });
    const save = await saveVehicleOnlyUpdate({
      authUserId: AUTH_UID,
      boundUserId: AUTH_UID,
      boundDriverId: 'driver-doc-001',
      vehicleReady: true,
      form: formFromDriverVehicle(baseDriver.vehicle)!,
      service,
    });
    expect(save.ok).toBe(false);
    if (save.ok) {
      return;
    }
    expect(save.persistenceFailed).toBe(true);
    expect(service.createDriver).not.toHaveBeenCalled();
  });

  it('never invokes createDriver from the vehicle editor path', async () => {
    const service = createServiceMock();
    await saveVehicleOnlyUpdate({
      authUserId: AUTH_UID,
      boundUserId: AUTH_UID,
      boundDriverId: 'driver-doc-001',
      vehicleReady: true,
      form: formFromDriverVehicle(baseDriver.vehicle)!,
      service,
    });
    expect(service.createDriver).not.toHaveBeenCalled();
  });

  it('blocks incomplete vehicle payload before updateDriver', async () => {
    const service = createServiceMock();
    const form = formFromDriverVehicle(baseDriver.vehicle)!;
    form.plate = '';
    const save = await saveVehicleOnlyUpdate({
      authUserId: AUTH_UID,
      boundUserId: AUTH_UID,
      boundDriverId: 'driver-doc-001',
      vehicleReady: true,
      form,
      service,
    });
    expect(save.ok).toBe(false);
    expect(service.updateDriver).not.toHaveBeenCalled();
  });
});

describe('AppNavigator entregador DriverVehicle registration', () => {
  it('registers DriverVehicleScreen on the isEntregador stack source', () => {
    const fs = require('fs');
    const path = require('path');
    const navigatorPath = path.join(__dirname, '../../navigation/AppNavigator.tsx');
    const source = fs.readFileSync(navigatorPath, 'utf8');
    expect(source).toContain("import { DriverVehicleScreen } from '../screens/DriverVehicleScreen'");
    expect(source).toContain('name="DriverVehicle"');
    expect(source).toContain('component={DriverVehicleScreen}');
    expect(source).toContain("options={{ title: 'Meu Veículo' }}");
  });

  it('wires EntregadorProfile Meu Veículo to DriverVehicle navigation', () => {
    const fs = require('fs');
    const path = require('path');
    const profilePath = path.join(__dirname, '../EntregadorProfileScreen.tsx');
    const source = fs.readFileSync(profilePath, 'utf8');
    expect(source).toContain("RootNavigation.navigate('DriverVehicle')");
    expect(source).not.toMatch(/onPress=\{\(\) => navigateTo\('DriverVehicle'\)\}/);
  });
});

describe('forbidden side-effect absence in editor module', () => {
  it('DriverVehicleScreen source has no Storage upload or createDriver calls', () => {
    const fs = require('fs');
    const path = require('path');
    const screenPath = path.join(__dirname, '../DriverVehicleScreen.tsx');
    const source = fs.readFileSync(screenPath, 'utf8');
    expect(source).not.toMatch(/uploadBytes|uploadFile|getStorage|ref\(storage/);
    expect(source).not.toMatch(/\.createDriver\(/);
    expect(source).toMatch(/updateDriver\(/);
  });
});
