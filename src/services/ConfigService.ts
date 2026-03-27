import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoggingService } from './LoggingService';

export interface FeatureFlags {
  enableDemandForecast: boolean;
  enableDynamicPricing: boolean;
  enableRiskSystem: boolean;
  enableSentry: boolean;
}

export class ConfigService {
  private static instance: ConfigService;
  private readonly STORAGE_KEY = '@acucaradas:config:flags';
  private flags: FeatureFlags = {
    enableDemandForecast: false, // Inicia desativado por segurança
    enableDynamicPricing: false, // Inicia desativado por segurança
    enableRiskSystem: true,     // Sistema de risco padrão ativado
    enableSentry: true,         // Sentry ativado por padrão se configurado
  };

  private constructor() {
    this.loadFlags();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private async loadFlags() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.flags = { ...this.flags, ...JSON.parse(stored) };
      }
    } catch (error) {
      LoggingService.getInstance().error('Falha ao carregar feature flags', error as Error);
    }
  }

  public getFlag<K extends keyof FeatureFlags>(key: K): boolean {
    return this.flags[key];
  }

  public async setFlag<K extends keyof FeatureFlags>(key: K, value: boolean) {
    this.flags[key] = value;
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.flags));
      LoggingService.getInstance().info(`Feature flag ${key} alterada para ${value}`);
    } catch (error) {
      LoggingService.getInstance().error(`Falha ao salvar feature flag ${key}`, error as Error);
    }
  }

  public getFlags(): FeatureFlags {
    return { ...this.flags };
  }
}

export const configService = ConfigService.getInstance();
