import api from '../api/api';
import { getLocalStorage, setLocalStorage } from '../utils/localStorage';

const USER_PROFILE_KEY = 'user_profile';

class UserProfileService {
  /**
   * Obtém o perfil do usuário atual
   * @returns {Promise<Object>} Perfil do usuário
   */
  async getUserProfile() {
    try {
      // Tenta buscar do cache primeiro
      const cachedProfile = getLocalStorage(USER_PROFILE_KEY);
      if (cachedProfile) return JSON.parse(cachedProfile);

      // Busca do servidor se não tiver no cache
      const response = await api.get('/user/profile');
      const profile = response.data;

      // Salva no cache
      setLocalStorage(USER_PROFILE_KEY, JSON.stringify(profile));

      return profile;
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      throw error;
    }
  }

  /**
   * Atualiza o perfil do usuário
   * @param {Object} profileData Dados do perfil a serem atualizados
   * @returns {Promise<Object>} Perfil atualizado
   */
  async updateProfile(profileData) {
    try {
      const response = await api.put('/user/profile', profileData);
      const updatedProfile = response.data;

      // Atualiza o cache
      setLocalStorage(USER_PROFILE_KEY, JSON.stringify(updatedProfile));

      return updatedProfile;
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  }

  /**
   * Obtém os endereços do usuário
   * @returns {Promise<Array>} Lista de endereços
   */
  async getUserAddresses() {
    try {
      const response = await api.get('/user/addresses');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
      throw error;
    }
  }

  /**
   * Adiciona um novo endereço
   * @param {Object} addressData Dados do endereço
   * @returns {Promise<Object>} Endereço criado
   */
  async addAddress(addressData) {
    try {
      const response = await api.post('/user/addresses', addressData);
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar endereço:', error);
      throw error;
    }
  }

  /**
   * Atualiza um endereço existente
   * @param {string} addressId ID do endereço
   * @param {Object} addressData Dados do endereço
   * @returns {Promise<Object>} Endereço atualizado
   */
  async updateAddress(addressId, addressData) {
    try {
      const response = await api.put(`/user/addresses/${addressId}`, addressData);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar endereço:', error);
      throw error;
    }
  }

  /**
   * Remove um endereço
   * @param {string} addressId ID do endereço
   * @returns {Promise<void>}
   */
  async deleteAddress(addressId) {
    try {
      await api.delete(`/user/addresses/${addressId}`);
    } catch (error) {
      console.error('Erro ao remover endereço:', error);
      throw error;
    }
  }

  /**
   * Atualiza as preferências do usuário
   * @param {Object} preferences Preferências a serem atualizadas
   * @returns {Promise<Object>} Preferências atualizadas
   */
  async updatePreferences(preferences) {
    try {
      const response = await api.put('/user/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error);
      throw error;
    }
  }

  /**
   * Atualiza a foto do perfil
   * @param {File} file Arquivo de imagem
   * @returns {Promise<string>} URL da imagem
   */
  async updateProfilePicture(file) {
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await api.post('/user/profile/picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Atualiza o cache com a nova URL da imagem
      const profile = JSON.parse(getLocalStorage(USER_PROFILE_KEY) || '{}');
      profile.profilePictureUrl = response.data.imageUrl;
      setLocalStorage(USER_PROFILE_KEY, JSON.stringify(profile));

      return response.data.imageUrl;
    } catch (error) {
      console.error('Erro ao atualizar foto do perfil:', error);
      throw error;
    }
  }

  /**
   * Obtém as avaliações do usuário (caso seja cliente)
   * @returns {Promise<Array>} Lista de avaliações
   */
  async getUserReviews() {
    try {
      const response = await api.get('/user/reviews');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
      throw error;
    }
  }

  /**
   * Limpa o cache do perfil de usuário
   */
  clearProfileCache() {
    localStorage.removeItem(USER_PROFILE_KEY);
  }
}

export default new UserProfileService();
