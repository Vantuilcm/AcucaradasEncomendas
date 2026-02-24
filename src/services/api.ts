import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configuração da API com fallbacks para diferentes ambientes
const getApiUrl = () => {
  return (
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl ||
    'https://api.acucaradas.com'
  );
};

const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Função para obter token de autenticação
const getAuthToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem('@auth_token');
    } else {
      return await AsyncStorage.getItem('@auth_token');
    }
  } catch (error) {
    console.error('Erro ao obter token de autenticação:', error);
    return null;
  }
};

// Função para remover token de autenticação
const removeAuthToken = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem('@auth_token');
    } else {
      await AsyncStorage.removeItem('@auth_token');
    }
  } catch (error) {
    console.error('Erro ao remover token de autenticação:', error);
  }
};

// Interceptor para adicionar o token de autenticação
api.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Adicionar headers específicos para mobile
    if (Platform.OS !== 'web') {
      config.headers['X-Platform'] = Platform.OS;
      config.headers['X-App-Version'] = Constants.expoConfig?.version || '1.0.0';
    }
    
    return config;
  },
  (error) => {
    console.error('Erro no interceptor de request:', error);
    return Promise.reject(error);
  }
);

// Função de retry para requisições
const retryRequest = async (
  config: AxiosRequestConfig,
  retryCount: number = 3,
  delay: number = 1000
): Promise<AxiosResponse> => {
  for (let i = 0; i < retryCount; i++) {
    try {
      return await api.request(config);
    } catch (error: any) {
      if (i === retryCount - 1) throw error;
      
      // Não fazer retry para erros 4xx (exceto 408, 429)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        if (error.response.status !== 408 && error.response.status !== 429) {
          throw error;
        }
      }
      
      // Aguardar antes do próximo retry com backoff exponencial
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Máximo de tentativas excedido');
};

// Interceptor para tratar erros e implementar retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response) {
      // Erro com resposta do servidor
      console.error('Erro de resposta da API:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });

      // Tratamento específico para erros de autenticação
      if (error.response.status === 401) {
        await removeAuthToken();
        // Em aplicações React Native, você pode usar navigation ou outro método
        // window.location.href = '/login'; // Apenas para web
      }
      
      // Retry para erros de servidor (5xx) e alguns 4xx específicos
      if (
        (error.response.status >= 500 || 
         error.response.status === 408 || 
         error.response.status === 429) &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;
        try {
          return await retryRequest(originalRequest, 2, 1000);
        } catch (retryError) {
          return Promise.reject(retryError);
        }
      }
    } else if (error.request) {
      // Erro sem resposta do servidor (timeout, rede, etc.)
      console.error('Erro de rede:', error.message);
      
      // Retry para erros de rede
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        try {
          return await retryRequest(originalRequest, 3, 2000);
        } catch (retryError) {
          return Promise.reject(retryError);
        }
      }
    } else {
      // Erro na configuração da requisição
      console.error('Erro de configuração da API:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export { api };

export class ApiService {
  static async getProducts() {
    try {
      // Verificar cache primeiro
      const cachedData = await AsyncStorage.getItem('products');
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Se não houver cache, buscar dados
      const response = await fetch('sua-api-aqui/products');
      const data = await response.json();

      // Salvar no cache
      await AsyncStorage.setItem('products', JSON.stringify(data));

      return data;
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }
  }

  static async placeOrder(orderData) {
    try {
      // Implementar lógica de pedido
      return true;
    } catch (error) {
      console.error('Erro ao fazer pedido:', error);
      return false;
    }
  }
}
