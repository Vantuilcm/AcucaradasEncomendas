import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PrivacySettings, PrivacySettingsUpdate } from '../types/PrivacySettings';
import { loggingService } from './LoggingService';

export class PrivacySettingsService {
  private readonly collection = 'privacy_settings';

  async getUserPrivacySettings(userId: string): Promise<PrivacySettings | null> {
    try {
      const settingsRef = doc(db, this.collection, userId);
      const settingsDoc = await getDoc(settingsRef);

      if (!settingsDoc.exists()) {
        // Criar configurações padrão se não existirem
        const defaultSettings: Omit<PrivacySettings, 'id'> = {
          userId,
          showProfile: true,
          showOrders: true,
          showReviews: true,
          showAddresses: true,
          showPaymentMethods: true,
          allowNotifications: true,
          allowLocation: true,
          allowAnalytics: true,
          allowMarketing: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(settingsRef, defaultSettings);
        return { id: userId, ...defaultSettings };
      }

      return {
        id: settingsDoc.id,
        ...settingsDoc.data(),
      } as PrivacySettings;
    } catch (error) {
      loggingService.error('Erro ao buscar configurações de privacidade', {
        userId,
        error,
      });
      throw error;
    }
  }

  async updatePrivacySettings(userId: string, updates: PrivacySettingsUpdate): Promise<void> {
    try {
      const settingsRef = doc(db, this.collection, userId);
      await updateDoc(settingsRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Configurações de privacidade atualizadas com sucesso', {
        userId,
        updates,
      });
    } catch (error) {
      loggingService.error('Erro ao atualizar configurações de privacidade', {
        userId,
        updates,
        error,
      });
      throw error;
    }
  }

  async resetPrivacySettings(userId: string): Promise<void> {
    try {
      const defaultSettings: Omit<PrivacySettings, 'id'> = {
        userId,
        showProfile: true,
        showOrders: true,
        showReviews: true,
        showAddresses: true,
        showPaymentMethods: true,
        allowNotifications: true,
        allowLocation: true,
        allowAnalytics: true,
        allowMarketing: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const settingsRef = doc(db, this.collection, userId);
      await setDoc(settingsRef, defaultSettings);

      loggingService.info('Configurações de privacidade redefinidas com sucesso', {
        userId,
      });
    } catch (error) {
      loggingService.error('Erro ao redefinir configurações de privacidade', {
        userId,
        error,
      });
      throw error;
    }
  }
}
