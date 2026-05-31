import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Surface, Text, TextInput, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/AuthService';
import { getAuth } from '../../config/firebase';

export const ProducerSecurityScreen = () => {
  const { user } = useAuth();
  const email = user?.email || getAuth().currentUser?.email || '—';
  const uid = (user as any)?.uid || (user as any)?.id || getAuth().currentUser?.uid;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!uid) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Atenção', 'Preencha todos os campos de senha.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Atenção', 'A confirmação da nova senha não confere.');
      return;
    }

    setLoading(true);
    try {
      await AuthService.getInstance().atualizarSenha({
        idUsuario: uid,
        senhaAtual: currentPassword,
        novaSenha: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(
        'Senha alterada',
        'Sua senha foi atualizada. Sessões em outros dispositivos serão encerradas automaticamente.'
      );
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAllDevices = () => {
    Alert.alert(
      'Encerrar sessões em outros dispositivos',
      'Para encerrar o acesso em outros aparelhos, altere sua senha abaixo. O Firebase Auth invalida tokens antigos após a troca de senha. Sua sessão atual permanece ativa.',
      [{ text: 'Entendi', style: 'default' }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.label}>E-mail cadastrado</Text>
          <Text style={styles.email}>{email}</Text>
        </Surface>

        <Text style={styles.sectionTitle}>Alterar senha</Text>
        <Surface style={styles.card} elevation={1}>
          <TextInput
            label="Senha atual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Nova senha"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Confirmar nova senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleChangePassword}
            loading={loading}
            disabled={loading}
            buttonColor="#607D8B"
            style={styles.actionBtn}
          >
            Alterar senha
          </Button>
        </Surface>

        <Divider style={styles.divider} />

        <Text style={styles.sectionTitle}>Sessões</Text>
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sessionHint}>
            Use a alteração de senha para encerrar automaticamente sessões abertas em outros celulares ou navegadores.
          </Text>
          <Button mode="outlined" onPress={handleLogoutAllDevices} style={styles.actionBtn}>
            Logout de todos os dispositivos
          </Button>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 16, padding: 16, backgroundColor: '#fff', marginBottom: 16 },
  label: { fontSize: 12, color: '#888', textTransform: 'uppercase' },
  email: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  input: { marginBottom: 12, backgroundColor: '#fff' },
  actionBtn: { marginTop: 4, borderRadius: 10 },
  divider: { marginVertical: 8 },
  sessionHint: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 12 },
});
