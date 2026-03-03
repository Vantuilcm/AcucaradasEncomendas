import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, TextInput, Chip, IconButton, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { SocialService } from '../services/SocialService';
import { LoadingState } from '../components/base/LoadingState';
import * as Haptics from 'expo-haptics';
import { Toast, FeedbackType } from '../components/FeedbackEffects';
import { isValidEmail } from '../utils/validationUtils';

export function InviteFriendsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: FeedbackType.SUCCESS,
  });

  const socialService = SocialService.getInstance();

  // Adicionar email à lista
  const addEmail = () => {
    // Verificar se o email é válido
    if (!email.trim() || !isValidEmail(email.trim())) {
      showToast('Email inválido', FeedbackType.ERROR);
      return;
    }

    const trimmedEmail = email.trim();

    // Verificar se o email já está na lista
    if (emails.includes(trimmedEmail)) {
      showToast('Email já adicionado', FeedbackType.WARNING);
      return;
    }

    // Adicionar email à lista
    setEmails([...emails, trimmedEmail]);
    setEmail('');

    // Feedback tátil
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Remover email da lista
  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));

    // Feedback tátil
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Enviar convites
  const sendInvites = async () => {
    if (!user) {
      showToast('Você precisa estar logado', FeedbackType.ERROR);
      return;
    }

    if (emails.length === 0) {
      showToast('Adicione pelo menos um email', FeedbackType.WARNING);
      return;
    }

    try {
      setLoading(true);

      const success = await socialService.inviteFriends(user, emails, message.trim() || undefined);

      if (success) {
        // Feedback tátil
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Feedback visual
        showToast(`Convites enviados com sucesso!`, FeedbackType.SUCCESS);

        // Limpar formulário
        setEmails([]);
        setMessage('');

        // Navegar de volta após um tempo
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else {
        throw new Error('Falha ao enviar convites');
      }
    } catch (error) {
      console.error('Erro ao enviar convites:', error);
      showToast('Erro ao enviar convites', FeedbackType.ERROR);

      // Feedback tátil de erro
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // Mostrar toast
  const showToast = (message: string, type: FeedbackType = FeedbackType.SUCCESS) => {
    setToast({
      visible: true,
      message,
      type,
    });

    // Esconder toast após um tempo
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  if (!user) {
    return (
      <View style={styles.centeredContainer}>
        <Text>Você precisa estar logado para convidar amigos.</Text>
        <Button
          mode="contained"
          style={{ marginTop: 16 }}
          onPress={() => navigation.navigate('Login')}
        >
          Fazer Login
        </Button>
      </View>
    );
  }

  if (loading) {
    return <LoadingState message="Enviando convites..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text variant="headlineMedium" style={styles.title}>
          Convide seus amigos
        </Text>

        <Text style={styles.subtitle}>
          Compartilhe a Açucaradas Encomendas com seus amigos e familiares.
        </Text>

        {/* Input para adicionar emails */}
        <View style={styles.emailInputContainer}>
          <TextInput
            label="Email do convidado"
            value={email}
            onChangeText={setEmail}
            style={styles.emailInput}
            keyboardType="email-address"
            autoCapitalize="none"
            right={<TextInput.Icon icon="plus" onPress={addEmail} />}
            onSubmitEditing={addEmail}
          />
        </View>

        {/* Lista de emails adicionados */}
        {emails.length > 0 && (
          <View style={styles.emailChipsContainer}>
            {emails.map((email, index) => (
              <Chip
                key={index}
                style={styles.emailChip}
                onClose={() => removeEmail(email)}
                onPress={() => {}}
                textStyle={{ fontSize: 12 }}
              >
                {email}
              </Chip>
            ))}
          </View>
        )}

        {/* Input para mensagem personalizada */}
        <TextInput
          label="Mensagem personalizada (opcional)"
          value={message}
          onChangeText={setMessage}
          style={styles.messageInput}
          multiline
          numberOfLines={4}
        />

        {/* Botão de enviar */}
        <Button
          mode="contained"
          onPress={sendInvites}
          style={styles.sendButton}
          loading={loading}
          disabled={emails.length === 0 || loading}
        >
          Enviar {emails.length} convite{emails.length !== 1 ? 's' : ''}
        </Button>
      </ScrollView>

      {/* Toast de feedback */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  emailInputContainer: {
    marginBottom: 16,
  },
  emailInput: {
    marginBottom: 8,
  },
  emailChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  emailChip: {
    margin: 4,
  },
  messageInput: {
    marginBottom: 24,
  },
  sendButton: {
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: '#FF69B4',
  },
});
