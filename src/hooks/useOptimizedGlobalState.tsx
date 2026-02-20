import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import cacheService from '../services/cacheService';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

// Tipos para o estado global
interface GlobalState {
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
    isAuthenticated: boolean;
    preferences: {
      theme: 'light' | 'dark';
      notifications: boolean;
      language: 'pt' | 'en';
    };
  };
  cart: {
    items: CartItem[];
    total: number;
    itemCount: number;
  };
  app: {
    isLoading: boolean;
    isOnline: boolean;
    lastSync: number | null;
    version: string;
  };
  products: {
    categories: Category[];
    featured: Product[];
    searchHistory: string[];
  };
}

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  rating: number;
}

// Ações do reducer
type GlobalAction =
  | { type: 'SET_USER'; payload: Partial<GlobalState['user']> }
  | { type: 'LOGOUT' }
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_ITEM'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_FEATURED_PRODUCTS'; payload: Product[] }
  | { type: 'ADD_SEARCH_TERM'; payload: string }
  | { type: 'SET_PREFERENCES'; payload: Partial<GlobalState['user']['preferences']> }
  | { type: 'HYDRATE_STATE'; payload: Partial<GlobalState> };

// Estado inicial
const initialState: GlobalState = {
  user: {
    id: null,
    name: null,
    email: null,
    isAuthenticated: false,
    preferences: {
      theme: 'light',
      notifications: true,
      language: 'pt',
    },
  },
  cart: {
    items: [],
    total: 0,
    itemCount: 0,
  },
  app: {
    isLoading: false,
    isOnline: true,
    lastSync: null,
    version: '1.0.0',
  },
  products: {
    categories: [],
    featured: [],
    searchHistory: [],
  },
};

// Reducer otimizado com memoização
const globalReducer = (state: GlobalState, action: GlobalAction): GlobalState => {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: {
          ...state.user,
          ...action.payload,
        },
      };

    case 'LOGOUT':
      return {
        ...state,
        user: {
          ...initialState.user,
        },
        cart: {
          ...initialState.cart,
        },
      };

    case 'ADD_TO_CART': {
      const existingItem = state.cart.items.find(item => item.productId === action.payload.productId);
      
      if (existingItem) {
        const updatedItems = state.cart.items.map(item =>
          item.productId === action.payload.productId
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
        
        const total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
        
        return {
          ...state,
          cart: {
            items: updatedItems,
            total,
            itemCount,
          },
        };
      }
      
      const newItems = [...state.cart.items, action.payload];
      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      
      return {
        ...state,
        cart: {
          items: newItems,
          total,
          itemCount,
        },
      };
    }

    case 'REMOVE_FROM_CART': {
      const filteredItems = state.cart.items.filter(item => item.id !== action.payload);
      const total = filteredItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
      
      return {
        ...state,
        cart: {
          items: filteredItems,
          total,
          itemCount,
        },
      };
    }

    case 'UPDATE_CART_ITEM': {
      const updatedItems = state.cart.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      
      const total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      
      return {
        ...state,
        cart: {
          items: updatedItems,
          total,
          itemCount,
        },
      };
    }

    case 'CLEAR_CART':
      return {
        ...state,
        cart: {
          ...initialState.cart,
        },
      };

    case 'SET_LOADING':
      return {
        ...state,
        app: {
          ...state.app,
          isLoading: action.payload,
        },
      };

    case 'SET_ONLINE_STATUS':
      return {
        ...state,
        app: {
          ...state.app,
          isOnline: action.payload,
        },
      };

    case 'SET_CATEGORIES':
      return {
        ...state,
        products: {
          ...state.products,
          categories: action.payload,
        },
      };

    case 'SET_FEATURED_PRODUCTS':
      return {
        ...state,
        products: {
          ...state.products,
          featured: action.payload,
        },
      };

    case 'ADD_SEARCH_TERM': {
      const searchHistory = [action.payload, ...state.products.searchHistory.filter(term => term !== action.payload)]
        .slice(0, 10); // Manter apenas os 10 termos mais recentes
      
      return {
        ...state,
        products: {
          ...state.products,
          searchHistory,
        },
      };
    }

    case 'SET_PREFERENCES':
      return {
        ...state,
        user: {
          ...state.user,
          preferences: {
            ...state.user.preferences,
            ...action.payload,
          },
        },
      };

    case 'HYDRATE_STATE':
      return {
        ...state,
        ...action.payload,
      };

    default:
      return state;
  }
};

// Context
interface GlobalContextType {
  state: GlobalState;
  dispatch: React.Dispatch<GlobalAction>;
  actions: {
    // User actions
    setUser: (user: Partial<GlobalState['user']>) => void;
    logout: () => void;
    setPreferences: (preferences: Partial<GlobalState['user']['preferences']>) => void;
    
    // Cart actions
    addToCart: (item: CartItem) => void;
    removeFromCart: (itemId: string) => void;
    updateCartItem: (itemId: string, quantity: number) => void;
    clearCart: () => void;
    
    // App actions
    setLoading: (loading: boolean) => void;
    setOnlineStatus: (online: boolean) => void;
    
    // Product actions
    setCategories: (categories: Category[]) => void;
    setFeaturedProducts: (products: Product[]) => void;
    addSearchTerm: (term: string) => void;
    
    // Persistence
    persistState: () => Promise<void>;
    hydrateState: () => Promise<void>;
  };
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

// Provider component
interface OptimizedStateProviderProps {
  children: React.ReactNode;
}

export const OptimizedStateProvider: React.FC<OptimizedStateProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(globalReducer, initialState);
  const cache = cacheService;

  // Ações memoizadas para evitar re-renders desnecessários
  const actions = useMemo(() => ({
    // User actions
    setUser: (user: Partial<GlobalState['user']>) => {
      dispatch({ type: 'SET_USER', payload: user });
    },
    
    logout: () => {
      dispatch({ type: 'LOGOUT' });
    },
    
    setPreferences: (preferences: Partial<GlobalState['user']['preferences']>) => {
      dispatch({ type: 'SET_PREFERENCES', payload: preferences });
    },
    
    // Cart actions
    addToCart: (item: CartItem) => {
      dispatch({ type: 'ADD_TO_CART', payload: item });
    },
    
    removeFromCart: (itemId: string) => {
      dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });
    },
    
    updateCartItem: (itemId: string, quantity: number) => {
      dispatch({ type: 'UPDATE_CART_ITEM', payload: { id: itemId, quantity } });
    },
    
    clearCart: () => {
      dispatch({ type: 'CLEAR_CART' });
    },
    
    // App actions
    setLoading: (loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    },
    
    setOnlineStatus: (online: boolean) => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: online });
    },
    
    // Product actions
    setCategories: (categories: Category[]) => {
      dispatch({ type: 'SET_CATEGORIES', payload: categories });
    },
    
    setFeaturedProducts: (products: Product[]) => {
      dispatch({ type: 'SET_FEATURED_PRODUCTS', payload: products });
    },
    
    addSearchTerm: (term: string) => {
      if (term.trim()) {
        dispatch({ type: 'ADD_SEARCH_TERM', payload: term.trim() });
      }
    },
    
    // Persistence
    persistState: async () => {
      try {
        await cache.setItem('global_state', state, { expiration: 7 * 24 * 60 * 60 * 1000 });
        await AsyncStorage.setItem('app_state_backup', JSON.stringify({
          user: state.user,
          cart: state.cart,
          products: {
            searchHistory: state.products.searchHistory,
          },
        }));
      } catch (error) {
        logger.error('Erro ao persistir estado:', error instanceof Error ? error : new Error(String(error)));
      }
    },
    
    hydrateState: async () => {
      try {
        // Tentar carregar do cache primeiro
        const cachedState = await cache.getItem<Partial<GlobalState>>('global_state');
        
        if (cachedState) {
          dispatch({ type: 'HYDRATE_STATE', payload: cachedState });
          return;
        }
        
        // Fallback para AsyncStorage
        const backupState = await AsyncStorage.getItem('app_state_backup');
        if (backupState) {
          const parsedState = JSON.parse(backupState);
          dispatch({ type: 'HYDRATE_STATE', payload: parsedState });
        }
      } catch (error) {
        logger.error('Erro ao hidratar estado:', error instanceof Error ? error : new Error(String(error)));
      }
    },
  }), [state, cache]);

  // Persistir estado automaticamente quando houver mudanças importantes
  useEffect(() => {
    const timer = setTimeout(() => {
      actions.persistState();
    }, 1000); // Debounce de 1 segundo

    return () => clearTimeout(timer);
  }, [state.user, state.cart, state.products.searchHistory]);

  // Hidratar estado na inicialização
  useEffect(() => {
    actions.hydrateState();
  }, []);

  const contextValue = useMemo(() => ({
    state,
    dispatch,
    actions,
  }), [state, actions]);

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};

// Hook para usar o contexto
export const useOptimizedGlobalState = () => {
  const context = useContext(GlobalContext);
  
  if (context === undefined) {
    throw new Error('useOptimizedGlobalState deve ser usado dentro de um OptimizedStateProvider');
  }
  
  return context;
};

// Hooks especializados para partes específicas do estado
export const useUser = () => {
  const { state, actions } = useOptimizedGlobalState();
  return {
    user: state.user,
    setUser: actions.setUser,
    logout: actions.logout,
    setPreferences: actions.setPreferences,
  };
};

export const useCart = () => {
  const { state, actions } = useOptimizedGlobalState();
  return {
    cart: state.cart,
    addToCart: actions.addToCart,
    removeFromCart: actions.removeFromCart,
    updateCartItem: actions.updateCartItem,
    clearCart: actions.clearCart,
  };
};

export const useApp = () => {
  const { state, actions } = useOptimizedGlobalState();
  return {
    app: state.app,
    setLoading: actions.setLoading,
    setOnlineStatus: actions.setOnlineStatus,
  };
};

export const useProducts = () => {
  const { state, actions } = useOptimizedGlobalState();
  return {
    products: state.products,
    setCategories: actions.setCategories,
    setFeaturedProducts: actions.setFeaturedProducts,
    addSearchTerm: actions.addSearchTerm,
  };
};

// Hook para seletores otimizados
export const useSelector = <T,>(selector: (state: GlobalState) => T): T => {
  const { state } = useOptimizedGlobalState();
  return useMemo(() => selector(state), [state, selector]);
};

// Tipos exportados
export type { GlobalState, CartItem, Category, Product };
