import { dbFunctions } from '../config/firebase';
const { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } = dbFunctions;
import { Address } from '../types/Address';
import { loggingService } from './LoggingService';

export class AddressService {
  private readonly collection = 'addresses';

  async getUserAddresses(userId: string): Promise<Address[]> {
    try {
      const addressesRef = collection(this.collection);
      const q = query(addressesRef, where('userId', '==', userId));

      const querySnapshot = await getDocs(q);
      const addresses: Address[] = [];

      querySnapshot.docs.forEach((doc: any) => {
        addresses.push({
          id: doc.id,
          ...doc.data(),
        } as Address);
      });

      return addresses;
    } catch (error) {
      loggingService.error('Erro ao buscar endereços do usuário', {
        userId,
        error,
      });
      throw error;
    }
  }

  async createAddress(address: Omit<Address, 'id'>): Promise<Address> {
    try {
      const addressesRef = collection(this.collection);
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
      loggingService.error('Erro ao criar endereço', { error });
      throw error;
    }
  }

  async updateAddress(addressId: string, address: Partial<Address>): Promise<void> {
    try {
      const addressRef = doc(this.collection, addressId);
      await updateDoc(addressRef, {
        ...address,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Endereço atualizado com sucesso', { addressId });
    } catch (error) {
      loggingService.error('Erro ao atualizar endereço', {
        addressId,
        error,
      });
      throw error;
    }
  }

  async deleteAddress(addressId: string): Promise<void> {
    try {
      const addressRef = doc(this.collection, addressId);
      await deleteDoc(addressRef);

      loggingService.info('Endereço excluído com sucesso', { addressId });
    } catch (error) {
      loggingService.error('Erro ao excluir endereço', {
        addressId,
        error,
      });
      throw error;
    }
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    try {
      // Primeiro, remove o status de padrão de todos os endereços do usuário
      const addressesRef = collection(this.collection);
      const q = query(addressesRef, where('userId', '==', userId), where('isDefault', '==', true));

      const querySnapshot = await getDocs(q);
      const batch = dbFunctions.writeBatch();

      querySnapshot.docs.forEach((doc: any) => {
          batch.update(doc.ref, { isDefault: false });
        });

        // Define o novo endereço como padrão
        const newDefaultRef = doc(this.collection, addressId);
        batch.update(newDefaultRef, { isDefault: true });

        await batch.commit();

      loggingService.info('Endereço padrão atualizado com sucesso', { addressId });
    } catch (error) {
      loggingService.error('Erro ao definir endereço padrão', {
        userId,
        addressId,
        error,
      });
      throw error;
    }
  }
}
