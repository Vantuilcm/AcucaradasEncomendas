import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CatalogScreen from '../../screens/CatalogScreen';
import { NavigationContainer } from '@react-navigation/native';
import { CartProvider } from '../../contexts/CartContext';
import { useNavigation } from '@react-navigation/native';

describe('E2E - Busca no Catálogo', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as unknown as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: jest.fn(),
    });
  });

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
