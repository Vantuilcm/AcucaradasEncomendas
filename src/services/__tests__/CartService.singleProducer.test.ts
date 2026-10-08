/**
 * R31_R2 — CartService single-producer fail-closed contract
 * Cases: TEST_01 .. TEST_08
 */

jest.mock('../LoggingService', () => ({
  loggingService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartService, CartItem } from '../CartService';

const CART_KEY = 'acucaradas:cart';

const baseItem = (
  overrides: Partial<Omit<CartItem, 'id'>> & { producerId?: string } = {}
): Omit<CartItem, 'id'> => ({
  productId: 'prod-1',
  producerId: 'producer-a',
  name: 'Bolo',
  price: 10,
  quantity: 1,
  image: '',
  ...overrides,
});

describe('CartService.addItem — R31_R2 single-producer fail-closed', () => {
  let service: CartService;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    service = new CartService();
  });

  it('TEST_01: empty cart + valid producerId succeeds', async () => {
    const result = await service.addItem(baseItem());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.cart.items).toHaveLength(1);
      expect(result.cart.items[0].producerId).toBe('producer-a');
    }
  });

  it('TEST_02: same valid producerId succeeds / merges quantity', async () => {
    await service.addItem(baseItem({ quantity: 1 }));
    const result = await service.addItem(baseItem({ quantity: 2 }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.cart.items).toHaveLength(1);
      expect(result.cart.items[0].quantity).toBe(3);
    }
  });

  it('TEST_03: different valid producerId returns DIFFERENT_PRODUCER without mutation', async () => {
    await service.addItem(baseItem({ producerId: 'producer-a' }));
    const before = await AsyncStorage.getItem(CART_KEY);
    const result = await service.addItem(
      baseItem({ productId: 'prod-2', producerId: 'producer-b', name: 'Torta' })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('DIFFERENT_PRODUCER');
    }
    expect(await AsyncStorage.getItem(CART_KEY)).toBe(before);
    const cart = await service.getCart();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].producerId).toBe('producer-a');
  });

  it('TEST_04: incoming missing producerId returns MISSING_PRODUCER_ID; no persistence', async () => {
    const result = await service.addItem(baseItem({ producerId: undefined }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('MISSING_PRODUCER_ID');
    }
    expect(await AsyncStorage.getItem(CART_KEY)).toBeNull();
  });

  it('TEST_05: incoming blank/whitespace producerId returns MISSING_PRODUCER_ID', async () => {
    const result = await service.addItem(baseItem({ producerId: '   ' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('MISSING_PRODUCER_ID');
    }
    expect(await AsyncStorage.getItem(CART_KEY)).toBeNull();
  });

  it('TEST_06: existing cart missing producerId + valid add fails closed', async () => {
    await AsyncStorage.setItem(
      CART_KEY,
      JSON.stringify({
        items: [
          {
            id: 'legacy-1',
            productId: 'prod-legacy',
            name: 'Legacy',
            price: 5,
            quantity: 1,
            image: '',
          },
        ],
        lastUpdated: new Date().toISOString(),
      })
    );
    const before = await AsyncStorage.getItem(CART_KEY);
    const result = await service.addItem(baseItem({ producerId: 'producer-a' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('MISSING_PRODUCER_ID');
    }
    expect(await AsyncStorage.getItem(CART_KEY)).toBe(before);
  });

  it('TEST_07: both existing and incoming producer identities missing fails closed', async () => {
    await AsyncStorage.setItem(
      CART_KEY,
      JSON.stringify({
        items: [
          {
            id: 'legacy-2',
            productId: 'prod-legacy-2',
            name: 'Legacy2',
            price: 5,
            quantity: 1,
            image: '',
          },
        ],
        lastUpdated: new Date().toISOString(),
      })
    );
    const before = await AsyncStorage.getItem(CART_KEY);
    const result = await service.addItem(baseItem({ producerId: undefined }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('MISSING_PRODUCER_ID');
    }
    expect(await AsyncStorage.getItem(CART_KEY)).toBe(before);
  });

  it('TEST_08: rejected add does not clear cart and does not persist rejected item', async () => {
    await service.addItem(baseItem({ producerId: 'producer-a', productId: 'keep' }));
    const cartBefore = await service.getCart();
    expect(cartBefore.items).toHaveLength(1);

    const rejected = await service.addItem(
      baseItem({ producerId: 'producer-b', productId: 'reject-me', name: 'Other' })
    );
    expect(rejected.success).toBe(false);

    const cartAfter = await service.getCart();
    expect(cartAfter.items).toHaveLength(1);
    expect(cartAfter.items[0].productId).toBe('keep');
    expect(cartAfter.items.some(i => i.productId === 'reject-me')).toBe(false);
  });
});
