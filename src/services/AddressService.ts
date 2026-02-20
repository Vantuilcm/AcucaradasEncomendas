import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Address } from '../types/Address';
import { loggingService } from './LoggingService';

export class AddressService {
  private readonly collection = 'addresses';

  async getAddressById(addressId: string): Promise<Address | null> {
    try {
      const addressRef = doc(db, this.collection, addressId);
      const snap = await getDoc(addressRef as any);
      if (!snap || !(snap as any).exists?.()) {
        return null;
      }
      return { id: (snap as any).id, ...(snap as any).data() } as Address;
    } catch (error) {
      loggingService.error(
        'Erro ao buscar endereço por ID',
        error instanceof Error ? error : undefined,
        { addressId }
      );
      throw error;
    }
  }

  async getUserAddresses(userId: string): Promise<Address[]> {
    try {
      const addressesRef = collection(db, this.collection);
      const q = query(addressesRef, where('userId', '==', userId));

      const querySnapshot = await getDocs(q);
      const addresses: Address[] = [];

      querySnapshot.docs.forEach(docSnap => {
        addresses.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as Address);
      });

      return addresses;
    } catch (error) {
      loggingService.error(
        'Erro ao buscar endereços do usuário',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  async createAddress(address: Omit<Address, 'id'>): Promise<Address> {
    try {
      const addressesRef = collection(db, this.collection);
      const docRef = await addDoc(addressesRef, {
        ...address,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const newAddress: Address = {
        id: docRef.id,
        ...address,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      loggingService.info('Endereço criado com sucesso', { addressId: docRef.id });
      return newAddress;
    } catch (error) {
      loggingService.error('Erro ao criar endereço', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async updateAddress(addressId: string, address: Partial<Address>): Promise<void> {
    try {
      const addressRef = doc(db, this.collection, addressId);
      await updateDoc(addressRef, {
        ...address,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Endereço atualizado com sucesso', { addressId });
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar endereço',
        error instanceof Error ? error : undefined,
        { addressId }
      );
      throw error;
    }
  }

  async deleteAddress(addressId: string): Promise<void> {
    try {
      const addressRef = doc(db, this.collection, addressId);
      await deleteDoc(addressRef);

      loggingService.info('Endereço excluído com sucesso', { addressId });
    } catch (error) {
      loggingService.error(
        'Erro ao excluir endereço',
        error instanceof Error ? error : undefined,
        { addressId }
      );
      throw error;
    }
  }

  /**
   * Alias para getAddressById para compatibilidade
   */
  public async obterEnderecoPorId(addressId: string): Promise<Address | null> {
    return this.getAddressById(addressId);
  }

  /**
   * Alias para getUserAddresses para compatibilidade
   */
  public async obterEnderecosUsuario(userId: string): Promise<Address[]> {
    return this.getUserAddresses(userId);
  }

  /**
   * Alias para createAddress para compatibilidade
   */
  public async criarEndereco(address: Omit<Address, 'id'>): Promise<Address> {
    return this.createAddress(address);
  }

  /**
   * Alias para updateAddress para compatibilidade
   */
  public async atualizarEndereco(addressId: string, address: Partial<Address>): Promise<void> {
    return this.updateAddress(addressId, address);
  }

  /**
   * Alias para deleteAddress para compatibilidade
   */
  public async excluirEndereco(addressId: string): Promise<void> {
    return this.deleteAddress(addressId);
  }

  /**
   * Alias para setDefaultAddress para compatibilidade
   */
  public async definirEnderecoPadrao(userId: string, addressId: string): Promise<void> {
    return this.setDefaultAddress(userId, addressId);
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    try {
      // Primeiro, remove o status de padrão de todos os endereços do usuário
      const addressesRef = collection(db, this.collection);
      const q = query(addressesRef, where('userId', '==', userId), where('isDefault', '==', true));

      const querySnapshot = await getDocs(q);
      await Promise.all(
        querySnapshot.docs.map(docSnap => updateDoc(docSnap.ref, { isDefault: false }))
      );

      // Define o novo endereço padrão
      const newDefaultAddressRef = doc(db, this.collection, addressId);
      await updateDoc(newDefaultAddressRef, { isDefault: true });

      loggingService.info('Endereço padrão atualizado com sucesso', { addressId });
    } catch (error) {
      loggingService.error(
        'Erro ao definir endereço padrão',
        error instanceof Error ? error : undefined,
        { userId, addressId }
      );
      throw error;
    }
  }
}
