import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CatalogScreen from '../../screens/CatalogScreen';
import { NavigationContainer } from '@react-navigation/native';
import { CartProvider } from '../../contexts/CartContext';

describe('E2E - Busca no Catálogo', () => {
  it('exibe "Bolo de Chocolate" ao buscar por "chocolate"', async () => {
    const { getByPlaceholderText, getByText } = render(
      <CartProvider>
        <NavigationContainer>
          <CatalogScreen />
        </NavigationContainer>
      </CartProvider>
    );

    const searchbar = getByPlaceholderText('Buscar produtos...');
    fireEvent.changeText(searchbar, 'chocolate');
    fireEvent(searchbar, 'onSubmitEditing');

    await waitFor(() => {
      expect(getByText(/Bolo de Chocolate/i)).toBeTruthy();
    });
  });
});
