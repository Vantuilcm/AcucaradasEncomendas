import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { PrivacySettings } from '../types/PrivacySettings';
import { loggingService } from './LoggingService';

const defaultPrivacySettings: PrivacySettings = {
  showProfile: true,
  showOrders: false,
  showReviews: true,
  showAddresses: false,
  showPaymentMethods: false,
  allowNotifications: true,
  allowLocation: true,
  allowAnalytics: true,
  allowMarketing: false,
};

export class PrivacySettingsService {
  private readonly collection = 'privacy_settings';

  async getUserPrivacySettings(userId: string): Promise<PrivacySettings> {
    try {
      const settingsRef = doc(db, this.collection, userId);
      const settingsDoc = await getDoc(settingsRef);
      if (!settingsDoc.exists()) {
        await setDoc(settingsRef, {
          ...defaultPrivacySettings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        return { ...defaultPrivacySettings };
      }

      const data = settingsDoc.data() as PrivacySettings;
      return {
        ...defaultPrivacySettings,
        ...data,
      };
    } catch (error) {
      loggingService.error('Erro ao obter configurações de privacidade', { error, userId });
      throw error;
    }
  }

  async updatePrivacySettings(userId: string, updates: Partial<PrivacySettings>): Promise<void> {
    try {
      const settingsRef = doc(db, this.collection, userId);
      await updateDoc(settingsRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      loggingService.error('Erro ao atualizar configurações de privacidade', {
        error,
        userId,
      });
      throw error;
    }
  }

  async resetPrivacySettings(userId: string): Promise<void> {
    try {
      const settingsRef = doc(db, this.collection, userId);
      await setDoc(settingsRef, {
        ...defaultPrivacySettings,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      loggingService.error('Erro ao redefinir configurações de privacidade', { error, userId });
      throw error;
    }
  }
}
