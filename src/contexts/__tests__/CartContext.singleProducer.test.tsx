/**
 * R31_R2 — CartContext MISSING_PRODUCER_ID vs DIFFERENT_PRODUCER swap gate
 * + ProductDetailScreen active caller contract (TEST_09)
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, act, cleanup } from '@testing-library/react-native';
import { CartProvider, useCart } from '../CartContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../services/LoggingService', () => ({
  loggingService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('react-native-paper', () => {
  const React = require('react');
  return {
    Snackbar: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

function Probe({
  onReady,
}: {
  onReady: (api: ReturnType<typeof useCart>) => void;
}) {
  const api = useCart();
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
}

describe('CartContext — R31_R2 single-producer contract', () => {
  let cartApi: ReturnType<typeof useCart> | null = null;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    cartApi = null;
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  const mount = async () => {
    render(
      <CartProvider>
        <Probe
          onReady={api => {
            cartApi = api;
          }}
        />
      </CartProvider>
    );
    await waitFor(() => expect(cartApi).not.toBeNull());
  };

  it('TEST_03/09 context: DIFFERENT_PRODUCER triggers swap prompt only', async () => {
    await mount();
    await act(async () => {
      const first = await cartApi!.addItem({
        productId: 'p1',
        producerId: 'producer-a',
        name: 'A',
        price: 1,
        quantity: 1,
        image: '',
      });
      expect(first.success).toBe(true);
    });

    let secondPromise!: Promise<Awaited<ReturnType<ReturnType<typeof useCart>['addItem']>>>;
    await act(async () => {
      secondPromise = cartApi!.addItem({
        productId: 'p2',
        producerId: 'producer-b',
        name: 'B',
        price: 1,
        quantity: 1,
        image: '',
      });
    });

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const alertMock = Alert.alert as jest.Mock;
    const buttons = alertMock.mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    const cancel = buttons.find(b => b.text === 'Cancelar');
    await act(async () => {
      cancel?.onPress?.();
    });
    const second = await secondPromise;
    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.reason).toBe('CANCELLED');
    }

    expect(cartApi!.cart.items).toHaveLength(1);
    expect(cartApi!.cart.items[0].producerId).toBe('producer-a');
  });

  it('TEST_04/09 context: MISSING_PRODUCER_ID does not trigger swap', async () => {
    await mount();
    await act(async () => {
      const result = await cartApi!.addItem({
        productId: 'p1',
        producerId: undefined as unknown as string,
        name: 'A',
        price: 1,
        quantity: 1,
        image: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('MISSING_PRODUCER_ID');
      }
    });
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(cartApi!.cart.items).toHaveLength(0);
  });

  it('TEST_09: ProductDetailScreen uses addItem, not addToCart / useCart as any', () => {
    const screenPath = path.join(
      __dirname,
      '..',
      '..',
      'screens',
      'ProductDetailScreen.tsx'
    );
    const source = fs.readFileSync(screenPath, 'utf8');
    expect(source).toMatch(/const\s*\{\s*addItem\s*\}\s*=\s*useCart\(\)/);
    expect(source).not.toMatch(/useCart\(\)\s+as\s+any/);
    expect(source).not.toMatch(/const\s*\{\s*addToCart\s*\}/);
    expect(source).toMatch(/await\s+addItem\s*\(/);
    expect(source).toMatch(/if\s*\(\s*!result\.success\s*\)/);
  });
});
