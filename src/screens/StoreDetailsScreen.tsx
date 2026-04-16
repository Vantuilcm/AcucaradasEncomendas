import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Avatar, Title, Paragraph, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { EnhancedImage, PlaceholderType } from '../components/EnhancedImage';
import type { RootStackParamList } from '../navigation/AppNavigator';

type StoreDetailsRouteProp = RouteProp<RootStackParamList, 'StoreDetails'>;

export function StoreDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute<StoreDetailsRouteProp>();
  const { storeId, storeName } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Card.Cover 
            source={{ uri: 'https://via.placeholder.com/400x200?text=Loja+' + (storeName || 'Sua+Loja') }} 
            style={styles.banner}
          />
          <Card.Content style={styles.header}>
            <View style={styles.titleRow}>
              <Title style={styles.storeName}>{storeName || 'Loja'}</Title>
              <IconButton icon="share-variant" size={24} onPress={() => {}} />
            </View>
            <Paragraph>Esta loja está preparando deliciosas encomendas para você.</Paragraph>
          </Card.Content>
        </Card>

        <View style={styles.emptyState}>
          <IconButton icon="store-off" size={64} iconColor="#ccc" />
          <Text variant="bodyLarge" style={styles.emptyText}>
            O catálogo desta loja está sendo atualizado.
          </Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            Voltar para Início
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    paddingBottom: 24,
  },
  card: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
  },
  banner: {
    height: 180,
  },
  header: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeName: {
    fontWeight: 'bold',
    fontSize: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
  },
  backButton: {
    marginTop: 32,
    borderRadius: 12,
  },
});
