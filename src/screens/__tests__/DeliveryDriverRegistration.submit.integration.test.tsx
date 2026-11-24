/**
 * M165 — Integration test of DeliveryDriverRegistration real submit path.
 * Verifies create/update service contracts after M162 T22 strip.
 *
 * Covered scenarios: T01–T20 (grouped asserts documented per describe/it).
 * REAL_SUBMIT_EXECUTED via fireEvent on "Enviar Cadastro".
 */

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (c: unknown) => c,
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: {} },
  default: { expoConfig: { extra: {} } },
}));

jest.mock('../../config/env', () => ({
  ENV: new Proxy({}, { get: () => 'test' }),
  getEnv: () => 'test',
}));

const mockUploadBytes = jest.fn(() => Promise.resolve(undefined));
const mockGetDownloadURL = jest.fn((ref: { path: string }) =>
  Promise.resolve(`https://cdn.test/${ref.path}`)
);
const mockRef = jest.fn((path: string) => ({ path }));

jest.mock('../../config/firebase', () => ({
  s: {
    ref: path => mockRef(path),
    uploadBytes: (...args) => mockUploadBytes(...args),
    getDownloadURL: ref => mockGetDownloadURL(ref),
  },
  f: {},
  db: {},
}));

const mockAuthUser = { uid: 'uid-m165-create', email: 'courier@test.local' };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

jest.mock('../../compat/expoFaceDetector', () => ({
  FaceDetectorMode: { fast: 1 },
  FaceDetectorLandmarks: { none: 0 },
  FaceDetectorClassifications: { none: 0 },
}));

const mockGetDocumentAsync = jest.fn();
jest.mock('../../compat/expoDocumentPicker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

jest.mock('../../compat/expoCamera', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Camera = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      takePictureAsync: () =>
        Promise.resolve({
          uri: 'file://face-m165.jpg',
          base64: 'ZmFrZWZhY2U=',
        }),
    }));
    React.useEffect(() => {
      const id = setTimeout(() => {
        if (typeof props.onFacesDetected === 'function') {
          props.onFacesDetected({ faces: [{ bounds: {} }] });
        }
      }, 10);
      return () => clearTimeout(id);
    }, []);
    return React.createElement(View, { testID: 'mock-camera' });
  });
  Camera.displayName = 'MockCamera';
  Camera.requestCameraPermissionsAsync = () =>
    Promise.resolve({ status: 'granted' });
  Camera.Constants = { Type: { front: 1, back: 0 } };
  return { Camera };
});

const mockGetDriverByUserId = jest.fn();
const mockCreateDriver = jest.fn();
const mockUpdateDriver = jest.fn();

jest.mock('../../services/DeliveryDriverService', () => ({
  DeliveryDriverService: jest.fn().mockImplementation(() => ({
    getDriverByUserId: (...args) => mockGetDriverByUserId(...args),
    createDriver: (...args) => mockCreateDriver(...args),
    updateDriver: (...args) => mockUpdateDriver(...args),
  })),
}));

import React from 'react';
import { Alert, Platform } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import DeliveryDriverRegistration from '../DeliveryDriverRegistration';

const realUseState = React.useState.bind(React);

async function flushAsyncUi(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    try {
      const scheduler = require('scheduler');
      if (typeof scheduler.unstable_flushAll === 'function') {
        scheduler.unstable_flushAll();
      }
    } catch {
      // ignore
    }
  });
}

/**
 * First useState(null) in the screen is hasPermission.
 * Force granted so the real form mounts under jest's scheduler mock
 * (async permission IIFE otherwise leaves hasPermission stuck at null).
 */
function installPermissionBootstrap(): jest.SpyInstance {
  let bootstrapped = false;
  return jest.spyOn(React, 'useState').mockImplementation(((initial: unknown) => {
    if (!bootstrapped && initial === null) {
      bootstrapped = true;
      return realUseState(true);
    }
    return realUseState(initial as never);
  }) as typeof React.useState);
}

async function renderRegistration() {
  const utils = render(<DeliveryDriverRegistration />);
  await flushAsyncUi();
  await waitFor(() => expect(utils.getByText('Cadastro de Entregador')).toBeTruthy(), {
    timeout: 5000,
  });
  return utils;
}

const PROTECTED = [
  'userId',
  'status',
  'rating',
  'totalDeliveries',
  'totalEarnings',
  'createdAt',
] as const;

const FORM = {
  name: 'Ana Entregadora',
  phone: '11988887777',
  email: 'ana.m165@test.local',
  cpf: '52998224725',
  cnh: '12345678900',
  vehicleType: 'motorcycle',
  vehicleBrand: 'Honda',
  vehicleModel: 'CG160',
  vehicleYear: '2022',
  vehiclePlate: 'ABC1D23',
  vehicleColor: 'preto',
};

const DOC_ASSET = (name: string) => ({
  uri: `file://${name}`,
  name,
  mimeType: 'image/jpeg',
});

async function fillFormAndDocs(
  utils: ReturnType<typeof render>
): Promise<void> {
  const { getByPlaceholderText, getByText } = utils;

  fireEvent.changeText(getByPlaceholderText('Nome completo'), FORM.name);
  fireEvent.changeText(getByPlaceholderText('Telefone'), FORM.phone);
  fireEvent.changeText(getByPlaceholderText('Email'), FORM.email);
  fireEvent.changeText(getByPlaceholderText('CPF'), FORM.cpf);
  fireEvent.changeText(getByPlaceholderText('CNH'), FORM.cnh);
  fireEvent.changeText(
    getByPlaceholderText('Tipo de veículo (motorcycle, car, bicycle)'),
    FORM.vehicleType
  );
  fireEvent.changeText(getByPlaceholderText('Marca do veículo'), FORM.vehicleBrand);
  fireEvent.changeText(getByPlaceholderText('Modelo do veículo'), FORM.vehicleModel);
  fireEvent.changeText(getByPlaceholderText('Ano do veículo'), FORM.vehicleYear);
  fireEvent.changeText(getByPlaceholderText('Placa do veículo'), FORM.vehiclePlate);
  fireEvent.changeText(getByPlaceholderText('Cor do veículo'), FORM.vehicleColor);

  mockGetDocumentAsync
    .mockResolvedValueOnce({ canceled: false, assets: [DOC_ASSET('cnh.jpg')] })
    .mockResolvedValueOnce({ canceled: false, assets: [DOC_ASSET('vehicle.jpg')] })
    .mockResolvedValueOnce({ canceled: false, assets: [DOC_ASSET('insurance.jpg')] });

  await act(async () => {
    fireEvent.press(getByText('Tirar Foto'));
  });

  await act(async () => {
    await new Promise(r => setTimeout(r, 50));
  });

  await act(async () => {
    fireEvent.press(getByText('Enviar CNH'));
  });
  await waitFor(() => expect(getByText('✓ CNH Enviada')).toBeTruthy());

  await act(async () => {
    fireEvent.press(getByText('Enviar Documento do Veículo'));
  });
  await waitFor(() =>
    expect(getByText('✓ Documento do Veículo Enviado')).toBeTruthy()
  );

  await act(async () => {
    fireEvent.press(getByText('Enviar Seguro'));
  });
  await waitFor(() => expect(getByText('✓ Seguro Enviado')).toBeTruthy());
}

describe('M165 DeliveryDriverRegistration submit integration', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  let permissionSpy: jest.SpyInstance | undefined;

  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'ios',
    });
    global.fetch = jest.fn(() =>
      Promise.resolve({
        blob: () => Promise.resolve(new Blob(['x'])),
      })
    ) as unknown as typeof fetch;
  });

  beforeEach(() => {
    mockGetDocumentAsync.mockReset();
    mockGetDriverByUserId.mockReset();
    mockCreateDriver.mockReset();
    mockUpdateDriver.mockReset();
    mockUploadBytes.mockReset();
    mockGetDownloadURL.mockReset();
    mockRef.mockClear();
    alertSpy.mockClear();

    if (permissionSpy) {
      permissionSpy.mockRestore();
    }
    permissionSpy = installPermissionBootstrap();

    mockAuthUser.uid = 'uid-m165-create';
    mockAuthUser.email = 'courier@test.local';
    mockCreateDriver.mockResolvedValue({ id: 'new-drv' });
    mockUpdateDriver.mockResolvedValue(undefined);
    mockGetDriverByUserId.mockResolvedValue(null);
    mockUploadBytes.mockResolvedValue(undefined);
    mockGetDownloadURL.mockImplementation((ref: { path: string }) =>
      Promise.resolve(`https://cdn.test/${ref.path}`)
    );
  });

  afterEach(() => {
    if (permissionSpy) {
      permissionSpy.mockRestore();
      permissionSpy = undefined;
    }
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  it(
    'T01–T04,T13,T19 create: createDriver with userId/pending/zeros; no updateDriver',
    async () => {
      mockAuthUser.uid = 'uid-m165-create';
      mockGetDriverByUserId.mockResolvedValue(null);

      const utils = await renderRegistration();
      await fillFormAndDocs(utils);

      await act(async () => {
        fireEvent.press(utils.getByText('Enviar Cadastro'));
      });
      await flushAsyncUi();

      await waitFor(() => expect(mockCreateDriver).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });

      expect(mockUpdateDriver).not.toHaveBeenCalled();
      expect(mockGetDriverByUserId).toHaveBeenCalledWith('uid-m165-create');

      const payload = mockCreateDriver.mock.calls[0][0];
      expect(payload.userId).toBe('uid-m165-create');
      expect(payload.status).toBe('pending');
      expect(payload.rating).toBe(0);
      expect(payload.totalDeliveries).toBe(0);
      expect(payload.totalEarnings).toBe(0);
      expect(payload.name).toBe(FORM.name);
      expect(payload.phone).toBe(FORM.phone);
      expect(payload.email).toBe(FORM.email);
      expect(payload.cpf).toBe(FORM.cpf);
      expect(payload.cnh).toBe(FORM.cnh);
      expect(payload.vehicle).toEqual({
        type: 'motorcycle',
        brand: FORM.vehicleBrand,
        model: FORM.vehicleModel,
        year: 2022,
        plate: FORM.vehiclePlate,
        color: FORM.vehicleColor,
      });
      expect(payload.documents.faceImage).toMatch(/^https:\/\/cdn\.test\//);
      expect(payload.documents.cnhImage).toMatch(/^https:\/\/cdn\.test\//);
      expect(payload.documents.vehicleDocument).toMatch(/^https:\/\/cdn\.test\//);
      expect(payload.documents.insurance).toMatch(/^https:\/\/cdn\.test\//);

      expect(alertSpy).toHaveBeenCalledWith('Sucesso', 'Cadastro enviado para análise!');
    },
    30000
  );

  it(
    'T05–T15,T20 update: updateDriver(existing.id); omits protected; keeps cadastral/vehicle/docs/availability; no create',
    async () => {
      mockAuthUser.uid = 'uid-m165-update';
      const availability = {
        isAvailable: true,
        workingHours: { start: '09:00', end: '17:00' },
        workingDays: ['monday' as const, 'wednesday' as const],
      };
      mockGetDriverByUserId.mockResolvedValue({
        id: 'drv-existing-m165',
        userId: 'uid-m165-update',
        status: 'active',
        rating: 4.5,
        totalDeliveries: 42,
        totalEarnings: 990,
        availability,
        name: 'Old',
        phone: '000',
        email: 'old@test.local',
        cpf: '000',
        cnh: '000',
        vehicle: {},
        documents: {},
      });

      const utils = await renderRegistration();
      await fillFormAndDocs(utils);

      await act(async () => {
        fireEvent.press(utils.getByText('Enviar Cadastro'));
      });
      await flushAsyncUi();

      await waitFor(() => expect(mockUpdateDriver).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });

      expect(mockCreateDriver).not.toHaveBeenCalled();
      const [driverId, payload] = mockUpdateDriver.mock.calls[0];
      expect(driverId).toBe('drv-existing-m165');

      for (const key of PROTECTED) {
        expect(Object.prototype.hasOwnProperty.call(payload, key)).toBe(false);
      }

      expect(payload.name).toBe(FORM.name);
      expect(payload.phone).toBe(FORM.phone);
      expect(payload.email).toBe(FORM.email);
      expect(payload.cpf).toBe(FORM.cpf);
      expect(payload.cnh).toBe(FORM.cnh);
      expect(payload.vehicle).toEqual({
        type: 'motorcycle',
        brand: FORM.vehicleBrand,
        model: FORM.vehicleModel,
        year: 2022,
        plate: FORM.vehiclePlate,
        color: FORM.vehicleColor,
      });
      expect(payload.documents).toEqual(
        expect.objectContaining({
          faceImage: expect.stringMatching(/^https:\/\/cdn\.test\//),
          cnhImage: expect.stringMatching(/^https:\/\/cdn\.test\//),
          vehicleDocument: expect.stringMatching(/^https:\/\/cdn\.test\//),
          insurance: expect.stringMatching(/^https:\/\/cdn\.test\//),
        })
      );
      expect(payload.availability).toEqual(availability);
      expect(alertSpy).toHaveBeenCalledWith('Sucesso', 'Cadastro enviado para análise!');
    },
    30000
  );

  it(
    'T16 legacy doc without protected fields: update payload still omits them',
    async () => {
      mockAuthUser.uid = 'uid-m165-legacy';
      mockGetDriverByUserId.mockResolvedValue({
        id: 'drv-legacy-m165',
        userId: 'uid-m165-legacy',
        name: 'Legacy',
        phone: '111',
        email: 'legacy@test.local',
        cpf: '111',
        cnh: '111',
        vehicle: { type: 'car' },
        documents: {},
      });

      const utils = await renderRegistration();
      await fillFormAndDocs(utils);

      await act(async () => {
        fireEvent.press(utils.getByText('Enviar Cadastro'));
      });
      await flushAsyncUi();

      await waitFor(() => expect(mockUpdateDriver).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });
      const [driverId, payload] = mockUpdateDriver.mock.calls[0];
      expect(driverId).toBe('drv-legacy-m165');
      for (const key of PROTECTED) {
        expect(payload).not.toHaveProperty(key);
      }
      expect(mockCreateDriver).not.toHaveBeenCalled();
    },
    30000
  );

  it(
    'T17 updateDriver error follows error Alert; no success',
    async () => {
      mockAuthUser.uid = 'uid-m165-upd-err';
      mockGetDriverByUserId.mockResolvedValue({
        id: 'drv-err-upd',
        userId: 'uid-m165-upd-err',
        status: 'pending',
        rating: 0,
        totalDeliveries: 0,
        totalEarnings: 0,
      });
      mockUpdateDriver.mockRejectedValue(new Error('update failed'));

      const utils = await renderRegistration();
      await fillFormAndDocs(utils);

      await act(async () => {
        fireEvent.press(utils.getByText('Enviar Cadastro'));
      });
      await flushAsyncUi();

      await waitFor(
        () =>
          expect(alertSpy).toHaveBeenCalledWith(
            'Erro',
            'Não foi possível enviar o cadastro. Tente novamente.'
          ),
        { timeout: 5000 }
      );
      expect(alertSpy).not.toHaveBeenCalledWith('Sucesso', 'Cadastro enviado para análise!');
      expect(mockUpdateDriver).toHaveBeenCalled();
      expect(mockCreateDriver).not.toHaveBeenCalled();
    },
    30000
  );

  it(
    'T18 createDriver error follows error Alert; no success',
    async () => {
      mockAuthUser.uid = 'uid-m165-crt-err';
      mockGetDriverByUserId.mockResolvedValue(null);
      mockCreateDriver.mockRejectedValue(new Error('create failed'));

      const utils = await renderRegistration();
      await fillFormAndDocs(utils);

      await act(async () => {
        fireEvent.press(utils.getByText('Enviar Cadastro'));
      });
      await flushAsyncUi();

      await waitFor(
        () =>
          expect(alertSpy).toHaveBeenCalledWith(
            'Erro',
            'Não foi possível enviar o cadastro. Tente novamente.'
          ),
        { timeout: 5000 }
      );
      expect(alertSpy).not.toHaveBeenCalledWith('Sucesso', 'Cadastro enviado para análise!');
      expect(mockCreateDriver).toHaveBeenCalled();
      expect(mockUpdateDriver).not.toHaveBeenCalled();
    },
    30000
  );
});

