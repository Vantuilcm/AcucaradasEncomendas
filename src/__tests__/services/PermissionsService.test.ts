import { PermissionsService, Role } from '../../services/PermissionsService';

describe('PermissionsService role helpers', () => {
  const svc = PermissionsService.getInstance();

  test('isProducerRole recognizes aliases and enums', () => {
    expect(svc.isProducerRole('producer')).toBe(true);
    expect(svc.isProducerRole('produtor')).toBe(true);
    expect(svc.isProducerRole(Role.GERENTE)).toBe(true);
    expect(svc.isProducerRole(Role.ADMIN)).toBe(true);
    expect(svc.isProducerRole('courier')).toBe(false);
    expect(svc.isProducerRole('cliente')).toBe(false);
    expect(svc.isProducerRole(undefined)).toBe(false);
    expect(svc.isProducerRole(null)).toBe(false);
  });

  test('isCourierRole recognizes aliases and enums', () => {
    expect(svc.isCourierRole('courier')).toBe(true);
    expect(svc.isCourierRole('entregador')).toBe(true);
    expect(svc.isCourierRole(Role.ENTREGADOR)).toBe(true);
    expect(svc.isCourierRole(Role.GERENTE)).toBe(false);
    expect(svc.isCourierRole('cliente')).toBe(false);
    expect(svc.isCourierRole(undefined)).toBe(false);
    expect(svc.isCourierRole(null)).toBe(false);
  });

  test('getDefaultTabForRole maps to correct tabs', () => {
    expect(svc.getDefaultTabForRole('courier')).toBe('Orders');
    expect(svc.getDefaultTabForRole('entregador')).toBe('Orders');
    expect(svc.getDefaultTabForRole(Role.ENTREGADOR)).toBe('Orders');
    expect(svc.getDefaultTabForRole('producer')).toBe('Profile');
    expect(svc.getDefaultTabForRole('produtor')).toBe('Profile');
    expect(svc.getDefaultTabForRole(Role.GERENTE)).toBe('Profile');
    expect(svc.getDefaultTabForRole(Role.ADMIN)).toBe('Profile');
    expect(svc.getDefaultTabForRole('cliente')).toBe('Home');
    expect(svc.getDefaultTabForRole(Role.CLIENTE)).toBe('Home');
    expect(svc.getDefaultTabForRole(undefined)).toBe('Home');
  });
});
