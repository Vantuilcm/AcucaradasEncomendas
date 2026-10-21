import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../contexts/AuthContext';
import { f } from '../config/firebase';

const unstableFlushAll = require('scheduler/unstable_mock').unstable_flushAll as () => void;

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/PermissionsService', () => {
  const mockInstance = {
    getUserRole: jest.fn(),
    getRolePermissions: jest.fn(),
  };

  return {
    PermissionsService: {
      getInstance: jest.fn(() => mockInstance),
    },
    Permission: {},
    Role: {
      ADMIN: 'admin',
      GERENTE: 'gerente',
      ATENDENTE: 'atendente',
      CLIENTE: 'cliente',
      ENTREGADOR: 'entregador',
      PRODUTOR: 'produtor',
      COMPRADOR: 'comprador',
    },
    __mockInstance: mockInstance,
  };
});

jest.mock('../config/firebase', () => ({
  f: {
    doc: jest.fn((...args: unknown[]) => ({ args })),
    getDoc: jest.fn(),
  },
}));

jest.mock('../services/LoggingService', () => ({
  loggingService: {
    error: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockFDoc = f.doc as jest.Mock;
const mockFGetDoc = f.getDoc as jest.Mock;
const mockPermissionsService = (jest.requireMock('../services/PermissionsService') as any)
  .__mockInstance as {
  getUserRole: jest.Mock;
  getRolePermissions: jest.Mock;
};

const permissionA = 'PERMISSION_A' as any;
const permissionB = 'PERMISSION_B' as any;
const permissionMissing = 'PERMISSION_MISSING' as any;

function explicitPermissionsDoc(permissions: any[]) {
  return {
    exists: () => true,
    data: () => ({ permissions }),
  };
}

function missingPermissionsDoc() {
  return {
    exists: () => false,
    data: () => undefined,
  };
}

async function settleScheduledHookWork() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  act(() => {
    unstableFlushAll();
  });
}

describe('usePermissions real hook contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({ user: null });
    mockPermissionsService.getUserRole.mockResolvedValue('produtor');
    mockPermissionsService.getRolePermissions.mockReturnValue([]);
    mockFGetDoc.mockResolvedValue(missingPermissionsDoc());
  });

  it('fails closed without an authenticated user', async () => {
    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasPermission(permissionA)).toBe(false);
    expect(result.current.hasPermissions([permissionA])).toBe(false);
    expect(result.current.hasPermissions([permissionA], false)).toBe(false);
  });

  it('uses explicit permission document and denies permissions not present', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'producer-1', role: 'produtor' },
    });
    mockFGetDoc.mockResolvedValue(explicitPermissionsDoc([permissionA]));

    const { result } = renderHook(() => usePermissions());

    await settleScheduledHookWork();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.hasPermission(permissionA)).toBe(true);
    });

    expect(result.current.hasPermission(permissionMissing)).toBe(false);
    expect(mockPermissionsService.getUserRole).toHaveBeenCalledWith('producer-1');
    expect(mockFDoc).toHaveBeenCalledWith('permissoes', 'producer-1');
    expect(mockPermissionsService.getRolePermissions).not.toHaveBeenCalled();
  });

  it('falls back to role permissions when the permission document does not exist', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'producer-2', role: 'produtor' },
    });
    mockFGetDoc.mockResolvedValue(missingPermissionsDoc());
    mockPermissionsService.getRolePermissions.mockReturnValue([permissionA]);

    const { result } = renderHook(() => usePermissions());

    await settleScheduledHookWork();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.hasPermission(permissionA)).toBe(true);
    });

    expect(mockPermissionsService.getRolePermissions).toHaveBeenCalledWith('produtor');
  });

  it('implements AND semantics by default and OR semantics when requireAll is false', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'producer-3', role: 'produtor' },
    });
    mockFGetDoc.mockResolvedValue(explicitPermissionsDoc([permissionA, permissionB]));

    const { result } = renderHook(() => usePermissions());

    await settleScheduledHookWork();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.hasPermission(permissionA)).toBe(true);
    });

    expect(result.current.hasPermissions([permissionA, permissionB])).toBe(true);
    expect(result.current.hasPermissions([permissionA, permissionMissing])).toBe(false);
    expect(result.current.hasPermissions([permissionA, permissionMissing], false)).toBe(true);
    expect(result.current.hasPermissions([permissionMissing], false)).toBe(false);
  });

  it('reloads permissions through updatePermissions while preserving the hook contract', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'producer-4', role: 'produtor' },
    });
    mockFGetDoc
      .mockResolvedValueOnce(explicitPermissionsDoc([permissionA]))
      .mockResolvedValueOnce(explicitPermissionsDoc([permissionB]));

    const { result } = renderHook(() => usePermissions());

    await settleScheduledHookWork();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.hasPermission(permissionA)).toBe(true);
    });

    await act(async () => {
      await result.current.updatePermissions();
    });

    act(() => {
      unstableFlushAll();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.hasPermission(permissionB)).toBe(true);
    });

    expect(result.current.hasPermission(permissionA)).toBe(false);
    expect(typeof result.current.hasPermission).toBe('function');
    expect(typeof result.current.hasPermissions).toBe('function');
    expect(typeof result.current.updatePermissions).toBe('function');
    expect(mockPermissionsService.getUserRole).toHaveBeenCalled();
    expect(mockFGetDoc).toHaveBeenCalled();
  });
});
