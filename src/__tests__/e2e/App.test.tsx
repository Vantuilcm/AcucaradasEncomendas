import React, { useState } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import App from '../../App.tsx';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock das dependências externas
jest.mock('expo-notifications');
jest.mock('../../config/onesignal');
jest.mock('../../services/NotificationService');

jest.mock('../../navigation/AppNavigator', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');
  return function MockNavigator() {
    const [loggedIn, setLoggedIn] = React.useState(false);
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    if (!loggedIn) {
      return React.createElement(
        View,
        { style: { flex: 1 }, testID: 'login-screen' },
        React.createElement(TextInput, { testID: 'email-input', value: email, onChangeText: setEmail }),
        React.createElement(TextInput, { testID: 'password-input', value: password, onChangeText: setPassword }),
        React.createElement(TouchableOpacity, { testID: 'login-button', onPress: () => setLoggedIn(true) }, React.createElement(Text, {}, 'Login'))
      );
    }
    return React.createElement(View, { style: { flex: 1 }, testID: 'home-screen' });
  };
});

describe('App E2E Tests', () => {
  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();
  });

  it('deve renderizar o aplicativo sem erros', () => {
    const { getByTestId } = render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(getByTestId('app-container')).toBeTruthy();
  });

  it('deve navegar para a tela de login quando não autenticado', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Verificar se a tela de login está visível
    expect(getByTestId('login-screen')).toBeTruthy();

    // Simular login
    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const loginButton = getByTestId('login-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    // Aguardar navegação
    await waitFor(() => {
      expect(getByTestId('home-screen')).toBeTruthy();
    });
  });

  it('deve mostrar notificações quando recebidas', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Simular recebimento de notificação
    const mockNotification = {
      request: {
        content: {
          title: 'Novo Pedido',
          body: 'Você tem um novo pedido para entregar',
          data: { type: 'new_order' },
        },
      },
    };

    // Disparar evento de notificação
    const notificationHandler = require('expo-notifications').setNotificationHandler;
    await notificationHandler.handleNotification(mockNotification);
    const themeToggle = getByTestId('theme-toggle');
    fireEvent.press(themeToggle);

    // Verificar se a notificação foi exibida
    await waitFor(() => {
      expect(getByTestId('notification-badge')).toBeTruthy();
    });
  });

  it('deve manter o tema consistente ao alternar entre claro/escuro', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    const themeToggle = getByTestId('theme-toggle');
    const initialTheme = getByTestId('app-container').props.style.backgroundColor;

    // Alternar tema
    await (async () => { fireEvent.press(themeToggle); })();

    // Verificar se o tema mudou
    await waitFor(() => {
      const newTheme = getByTestId('app-container').props.style.backgroundColor;
      expect(newTheme).not.toBe(initialTheme);
    });
  });
});
