/**
 * M050 — Producer query-prep targeted tests (indirect consumers)
 * Cases: IC-01, IC-02
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const AUTH_UID = 'producer-auth-uid-001';

const mockGetProducerOrders = jest.fn();
const mockGetProducerOrderSummary = jest.fn();
const mockGetUserOrders = jest.fn();
const mockGetOrderSummary = jest.fn();
const mockGetOrders = jest.fn();

jest.mock('../../services/OrderService', () => ({
  OrderService: {
    getInstance: () => ({
      getProducerOrders: mockGetProducerOrders,
      getProducerOrderSummary: mockGetProducerOrderSummary,
      getUserOrders: mockGetUserOrders,
      getOrderSummary: mockGetOrderSummary,
      getOrders: mockGetOrders,
    }),
  },
}));

jest.mock('../../services/DeliveryDriverService', () => ({
  DeliveryDriverService: jest.fn().mockImplementation(() => ({
    getDriverByUserId: jest.fn(),
    getDriversByStatus: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('../../services/OrderWatchdogService', () => ({
  OrderWatchdogService: { getInstance: () => ({}) },
}));

jest.mock('../../services/SalesAutomationService', () => ({
  SalesAutomationService: { getInstance: () => ({}) },
}));

jest.mock('../../services/DemandForecastService', () => ({
  DemandForecastService: {
    getInstance: () => ({
      generateDemandInsights: jest.fn().mockResolvedValue([]),
    }),
  },
}));

jest.mock('../../services/RecommendationService', () => ({
  RecommendationService: { getInstance: () => ({}) },
}));

jest.mock('../../services/GrowthIntelligenceService', () => ({
  GrowthIntelligenceService: { getInstance: () => ({}) },
}));

jest.mock('../../services/MarketplaceExpansionService', () => ({
  MarketplaceExpansionService: { getInstance: () => ({}) },
}));

jest.mock('../../services/AutonomousGrowthOrchestrator', () => ({
  AutonomousGrowthOrchestrator: { getInstance: () => ({}) },
}));

jest.mock('../../services/ReleaseService', () => ({
  ReleaseService: { getInstance: () => ({}) },
}));

jest.mock('../../services/StoreAvailabilityService', () => ({
  StoreAvailabilityService: {
    parseLocalDate: jest.fn((d: string) => new Date(`${d}T00:00:00`)),
  },
}));

jest.mock('../../config/firebase', () => ({
  f: {},
  dbFunctions: {},
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Marker: View,
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../hooks/usePermissions', () => ({
  usePermissions: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('../../components/ThemeProvider', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        primary: '#FF4FD8',
        secondary: '#9C27B0',
        tertiary: '#FFEB3B',
        warning: '#F57C00',
        info: '#2196F3',
        success: '#4CAF50',
        error: '#FF0000',
        outline: '#999999',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        onSurface: '#000000',
        text: { primary: '#000000', secondary: '#666666' },
      },
      spacing: { sm: 8, md: 16 },
    },
  }),
}));

jest.mock('../../components/base/LoadingState', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    LoadingState: ({ message }: { message?: string }) =>
      React.createElement(Text, { testID: 'loading-state' }, message || 'loading'),
  };
});

jest.mock('../../components/ErrorMessage', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ErrorMessage: ({ message }: { message: string }) =>
      React.createElement(Text, { testID: 'error-message' }, message),
  };
});

jest.mock('../../utils/formatters', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
}));

jest.mock('../../utils/UserUtils', () => ({
  UserUtils: {
    getUserId: (user: any) => user?.id || user?.uid,
  },
}));

import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { OrdersScreen } from '../../screens/OrdersScreen';
import { AdminDashboardScreen } from '../../screens/AdminDashboardScreen';

describe('ProducerQueryPrep indirect consumers — M050', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProducerOrders.mockResolvedValue([]);
    mockGetProducerOrderSummary.mockResolvedValue({
      total: 0,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      delivering: 0,
      delivered: 0,
      cancelled: 0,
      scheduledOrders: 0,
    });
    mockGetUserOrders.mockResolvedValue([]);
    mockGetOrderSummary.mockResolvedValue({
      total: 0,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      delivering: 0,
      delivered: 0,
      cancelled: 0,
      scheduledOrders: 0,
    });
    mockGetOrders.mockResolvedValue([]);
  });

  it('IC-01: OrdersScreen producer calls getProducerOrders(userId) and getProducerOrderSummary', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: { id: AUTH_UID, uid: AUTH_UID } });
    (usePermissions as jest.Mock).mockReturnValue({
      isProdutor: true,
      isAdmin: false,
      isEntregador: false,
    });

    render(<OrdersScreen />);

    await waitFor(() => {
      expect(mockGetProducerOrders).toHaveBeenCalledWith(AUTH_UID);
      expect(mockGetProducerOrderSummary).toHaveBeenCalledWith(AUTH_UID);
    });
    expect(mockGetUserOrders).not.toHaveBeenCalled();
    expect(mockGetOrderSummary).not.toHaveBeenCalled();
  });

  it('IC-02: AdminDashboard producer/produtor uses getProducerOrders; admin uses getOrders', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id: AUTH_UID,
        uid: AUTH_UID,
        role: 'produtor',
        activeRole: 'produtor',
        nome: 'Produtor Teste',
      },
    });

    render(<AdminDashboardScreen />);

    await waitFor(() => {
      expect(mockGetProducerOrders).toHaveBeenCalledWith(AUTH_UID);
    });
    expect(mockGetOrders).not.toHaveBeenCalled();

    jest.clearAllMocks();
    mockGetOrders.mockResolvedValue([]);

    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id: 'admin-1',
        uid: 'admin-1',
        role: 'admin',
        activeRole: 'admin',
        nome: 'Admin',
      },
    });

    render(<AdminDashboardScreen />);

    await waitFor(() => {
      expect(mockGetOrders).toHaveBeenCalled();
    });
    expect(mockGetProducerOrders).not.toHaveBeenCalled();
  });
});
