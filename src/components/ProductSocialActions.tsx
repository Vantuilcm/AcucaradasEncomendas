import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { IconButton, Text, useTheme, Badge } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { Product } from '../types/Product';
import { SocialService } from '../services/SocialService';
import { WishlistService } from '../services/WishlistService';
import * as Haptics from 'expo-haptics';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

interface ProductSocialActionsProps {
  product: Product;
  onShare?: () => void;
}

export function ProductSocialActions({ product, onShare }: ProductSocialActionsProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  const socialService = SocialService.getInstance();
  const wishlistService = WishlistService.getInstance();

  // Verificar se o produto está na lista de desejos do usuário
  useEffect(() => {
    if (!user) return;

    const checkWishlist = async () => {
      try {
        const isInList = await wishlistService.isInWishlist(user.id, product.id);
        setInWishlist(isInList);
      } catch (error) {
        logger.error('Erro ao verificar lista de desejos:', error instanceof Error ? error : new Error(String(error)));
      }
    };

    checkWishlist();
  }, [user, product.id]);

  // Função para compartilhar o produto
  const handleShare = async () => {
    try {
      setLoading(true);
      await socialService.shareProduct(product);

      // Feedback tátil
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Callback após compartilhamento bem-sucedido
      if (onShare) {
        onShare();
      }
    } catch (error) {
      logger.error('Erro ao compartilhar:', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Erro', 'Não foi possível compartilhar o produto.');
    } finally {
      setLoading(false);
    }
  };

  // Função para adicionar/remover da lista de desejos
  const handleWishlist = async () => {
    if (!user) {
      Alert.alert(
        'Faça login',
        'Para adicionar produtos à sua lista de desejos, você precisa estar logado.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Fazer Login',
            onPress: () => {
              /* TODO: Navegar para tela de login */
            },
          },
        ]
      );
      return;
    }

    try {
      setLoading(true);

      if (inWishlist) {
        await wishlistService.removeFromWishlist(user.id, product.id);
        setInWishlist(false);
        // Feedback tátil
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        await wishlistService.addToWishlist(user.id, product.id);
        setInWishlist(true);
        // Feedback tátil
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      logger.error('Erro na lista de desejos:', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Erro', 'Não foi possível atualizar sua lista de desejos.');
    } finally {
      setLoading(false);
    }
  };

  // Função para convidar amigos a conhecer o produto
  const handleInviteFriends = () => {
    if (!user) {
      Alert.alert('Faça login', 'Para convidar amigos, você precisa estar logado.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Fazer Login',
          onPress: () => {
            /* TODO: Navegar para tela de login */
          },
        },
      ]);
      return;
    }

    // TODO: Implementar modal para inserir emails dos amigos
    Alert.alert(
      'Convide seus amigos',
      'Em breve você poderá convidar seus amigos para conhecer este produto!',
      [{ text: 'OK', style: 'default' }]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.actionButton} onPress={handleWishlist} disabled={loading}>
        <IconButton
          icon={inWishlist ? 'heart' : 'heart-outline'}
          size={26}
          iconColor={inWishlist ? theme.colors.error : theme.colors.onSurface}
          disabled={loading}
        />
        <Text style={styles.actionText}>{inWishlist ? 'Adicionado' : 'Favoritar'}</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.actionButton} onPress={handleShare} disabled={loading}>
        <IconButton
          icon="share-variant"
          size={26}
          iconColor={theme.colors.onSurface}
          disabled={loading}
        />
        <Text style={styles.actionText}>Compartilhar</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleInviteFriends}
        disabled={loading}
      >
        <IconButton
          icon="account-multiple-plus"
          size={26}
          iconColor={theme.colors.onSurface}
          disabled={loading}
        />
        <Text style={styles.actionText}>Convidar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 12,
    marginTop: -4,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
  },
});
