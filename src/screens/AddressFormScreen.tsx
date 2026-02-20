import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Switch, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Address } from '../types/Address';
import { AddressService } from '../services/AddressService';
import { validationService } from '../services/validationService';
import { UserProfileService } from '../services/UserProfileService';

interface RouteParams {
  addressId?: string;
}

export function AddressFormScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = (route.params as RouteParams) || {};
  const { user } = useAuth();
  const addressId = params.addressId || '';

  const [loading, setLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Address>>({
    name: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    isDefault: false,
  });

  useEffect(() => {
    (async () => {
      try {
        if (!addressId) return;
        const addressService = new AddressService();
        const existing = await addressService.getAddressById(addressId);
        if (existing) setFormData(existing);
      } catch {}
    })();
  }, [addressId]);

  const validateForm = () => {
    if (!formData.name?.trim()) {
      setError('Nome do endereço é obrigatório');
      return false;
    }

    if (!formData.street?.trim()) {
      setError('Rua é obrigatória');
      return false;
    }

    if (!formData.number?.trim()) {
      setError('Número é obrigatório');
      return false;
    }

    if (!formData.neighborhood?.trim()) {
      setError('Bairro é obrigatório');
      return false;
    }

    if (!formData.city?.trim()) {
      setError('Cidade é obrigatória');
      return false;
    }

    if (!formData.state?.trim()) {
      setError('Estado é obrigatório');
      return false;
    }

    if (!formData.zipCode?.trim()) {
      setError('CEP é obrigatório');
      return false;
    }

    if (!validationService.validateZipCode(formData.zipCode)) {
      setError('CEP inválido. Use o formato 00000-000');
      return false;
    }

    return true;
  };

  const formatZipCode = (zipCode: string) => {
    return validationService.formatZipCode(zipCode);
  };

  const syncUserProfileAddress = async (userId: string, data: Partial<Address>) => {
    try {
      const service = UserProfileService.getInstance();
      const userAddress = {
        cep: data.zipCode || '',
        rua: data.street || '',
        numero: data.number || '',
        complemento: data.complement || '',
        bairro: data.neighborhood || '',
        cidade: data.city || '',
        estado: data.state || '',
        principal: data.isDefault ?? false,
      };
      await service.addUserAddress(userId, userAddress as any);
    } catch {}
  };

  const handleZipCodeChange = async (text: string) => {
    // Remove caracteres não numéricos
    const numericValue = text.replace(/[^0-9]/g, '');

    // Limita a 8 dígitos
    const truncatedValue = numericValue.slice(0, 8);

    // Formata o CEP quando tem 8 dígitos
    const formattedZipCode = formatZipCode(truncatedValue);

    setFormData(prev => ({ ...prev, zipCode: formattedZipCode }));

    if (truncatedValue.length === 8 && validationService.validateZipCode(formattedZipCode)) {
      try {
        setZipLoading(true);
        const response = await fetch(`https://viacep.com.br/ws/${truncatedValue}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            street: prev.street || data.logradouro || '',
            neighborhood: prev.neighborhood || data.bairro || '',
            city: prev.city || data.localidade || '',
            state: prev.state || data.uf || '',
          }));
        }
      } catch (e) {
        setError('Não foi possível buscar o endereço pelo CEP.');
      } finally {
        setZipLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      setLoading(true);

      if (!validateForm()) {
        return;
      }

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const addressService = new AddressService();
      const addressData = {
        ...formData,
        userId: user.id,
      } as Omit<Address, 'id'>;

      let savedAddressId = addressId;
      if (addressId) {
        await addressService.updateAddress(addressId, addressData);
      } else {
        const created = await addressService.createAddress(addressData);
        savedAddressId = created.id;
      }

      if (formData.isDefault && savedAddressId) {
        await addressService.setDefaultAddress(user.id, savedAddressId);
      }

      await syncUserProfileAddress(user.id, {
        ...addressData,
        isDefault: formData.isDefault,
      });

      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar endereço');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <Text variant="headlineSmall" style={styles.title}>
              {addressId ? 'Editar Endereço' : 'Novo Endereço'}
            </Text>

            {error && <ErrorMessage message={error} />}

            <TextInput
              label="Nome do Endereço"
              value={formData.name}
              onChangeText={text => setFormData({ ...formData, name: text })}
              style={styles.input}
            />

            <TextInput
              label="CEP"
              value={formData.zipCode}
              onChangeText={handleZipCodeChange}
              keyboardType="numeric"
              style={styles.input}
              placeholder="00000-000"
              maxLength={9}
            />

            <TextInput
              label="Rua"
              value={formData.street}
              onChangeText={text => setFormData({ ...formData, street: text })}
              style={styles.input}
            />

            <TextInput
              label="Número"
              value={formData.number}
              onChangeText={text => setFormData({ ...formData, number: text })}
              style={styles.input}
            />

            <TextInput
              label="Complemento"
              value={formData.complement}
              onChangeText={text => setFormData({ ...formData, complement: text })}
              style={styles.input}
            />

            <TextInput
              label="Bairro"
              value={formData.neighborhood}
              onChangeText={text => setFormData({ ...formData, neighborhood: text })}
              style={styles.input}
            />

            <TextInput
              label="Cidade"
              value={formData.city}
              onChangeText={text => setFormData({ ...formData, city: text })}
              style={styles.input}
            />

            <TextInput
              label="Estado"
              value={formData.state}
              onChangeText={text => setFormData({ ...formData, state: text })}
              style={styles.input}
            />

            <View style={styles.switchContainer}>
              <Text variant="bodyLarge">Endereço Padrão</Text>
              <Switch
                value={formData.isDefault}
                onValueChange={value => setFormData({ ...formData, isDefault: value })}
              />
            </View>

            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              {addressId ? 'Atualizar' : 'Salvar'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  button: {
    marginTop: 8,
  },
});
