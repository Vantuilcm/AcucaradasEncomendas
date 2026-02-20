import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, List, FAB, useTheme, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Address } from '../types/Address';
import { AddressService } from '../services/AddressService';

export function AddressScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      const addressService = new AddressService();
      const userId = (user?.uid ?? user?.id) as string;
      const userAddresses = await addressService.getUserAddresses(userId);
      setAddresses(userAddresses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar endereços');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = () => {
    navigation.navigate('AddressForm');
  };

  const handleEditAddress = (address: Address) => {
    navigation.navigate('AddressForm', { addressId: address.id });
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      setError(null);
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      const addressService = new AddressService();
      await addressService.deleteAddress(addressId);
      await loadAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir endereço');
    }
  };

  if (loading) {
    return <LoadingState message="Carregando endereços..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {error && <ErrorMessage message={error ?? ''} onRetry={loadAddresses} />}

        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              Nenhum endereço cadastrado
            </Text>
            <Button mode="contained" onPress={handleAddAddress}>
              Adicionar Endereço
            </Button>
          </View>
        ) : (
          <List.Section>
            <List.Subheader>Meus Endereços</List.Subheader>
            {addresses.map(address => (
              <List.Item
                key={address.id}
                title={address.name}
                description={`${address.street}, ${address.number} - ${address.neighborhood}, ${address.city} - ${address.state}`}
                left={props => <List.Icon {...props} icon="map-marker" />}
                right={props => (
                  <View style={styles.actions}>
                    <IconButton
                      {...props}
                      icon="pencil"
                      onPress={() => handleEditAddress(address)}
                    />
                    <IconButton
                      {...props}
                      icon="delete"
                      iconColor={theme.colors.error}
                      onPress={() => handleDeleteAddress(address.id)}
                    />
                  </View>
                )}
              />
            ))}
          </List.Section>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleAddAddress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

