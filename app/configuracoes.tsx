import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, SegmentedButtons, Switch, Snackbar, Card, useTheme } from 'react-native-paper';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { PermissionsService, Role as AppRole } from '../src/services/PermissionsService';
import { setPendingHref } from '../src/navigation/pendingNavigation';

export default function Configuracoes() {
  const theme = useTheme();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { user } = useAuth();
  const [availableRoles, setAvailableRoles] = React.useState<Array<'customer' | 'producer' | 'courier'>>(['customer']);
  const [activeRole, setActiveRole] = React.useState<'customer' | 'producer' | 'courier'>('customer');
  const [producerEnabled, setProducerEnabled] = React.useState<boolean>(false);
  const [courierEnabled, setCourierEnabled] = React.useState<boolean>(false);
  const [snackVisible, setSnackVisible] = React.useState(false);
  const [snackMsg, setSnackMsg] = React.useState('');

  React.useEffect(() => {
    (async () => {
      try {
        const roleEnum = await PermissionsService.getInstance().getUserRole();
        const isProd = roleEnum === AppRole.GERENTE || roleEnum === AppRole.ADMIN;
        const isCourier = roleEnum === AppRole.ENTREGADOR;
        const rolesEnum = await PermissionsService.getInstance().getUserRoles();
        const mapped = rolesEnum.map(r => r === AppRole.GERENTE ? 'producer' : r === AppRole.ENTREGADOR ? 'courier' : 'customer');
        const uniq = Array.from(new Set(mapped));
        setAvailableRoles(uniq);
        setProducerEnabled(uniq.includes('producer'));
        setCourierEnabled(uniq.includes('courier'));
        setActiveRole(isCourier ? 'courier' : isProd ? 'producer' : 'customer');
      } catch {}
    })();
  }, [user?.id]);

  const showSnack = (msg: string) => { setSnackMsg(msg); setSnackVisible(true); };

  const safeReplace = (href: string) => {
    if (!rootNavigationState?.key) {
      setPendingHref(href);
      return;
    }
    router.replace(href as any);
  };

  const safeBack = () => {
    if (!rootNavigationState?.key) return;
    router.back();
  };

  const toggleProducer = async (value: boolean) => {
    try {
      setProducerEnabled(value);
      if (value) {
        await PermissionsService.getInstance().addUserRole(AppRole.GERENTE, true);
        setAvailableRoles(prev => Array.from(new Set([...prev, 'producer'])));
        await trocarPapel('producer');
        showSnack('Produtor habilitado');
      } else {
        await PermissionsService.getInstance().removeUserRole(AppRole.GERENTE);
        setAvailableRoles(prev => prev.filter(r => r !== 'producer'));
        if (activeRole === 'producer') {
          const next = availableRoles.includes('courier') ? 'courier' : 'customer';
          await trocarPapel(next as any);
        }
        showSnack('Produtor desabilitado');
      }
    } catch { showSnack('Não foi possível atualizar papel Produtor'); }
  };

  const toggleCourier = async (value: boolean) => {
    try {
      setCourierEnabled(value);
      if (value) {
        await PermissionsService.getInstance().addUserRole(AppRole.ENTREGADOR, false);
        setAvailableRoles(prev => Array.from(new Set([...prev, 'courier'])));
        showSnack('Entregador habilitado');
      } else {
        await PermissionsService.getInstance().removeUserRole(AppRole.ENTREGADOR);
        setAvailableRoles(prev => prev.filter(r => r !== 'courier'));
        if (activeRole === 'courier') {
          const next = availableRoles.includes('producer') ? 'producer' : 'customer';
          setActiveRole(next);
        }
        showSnack('Entregador desabilitado');
      }
    } catch { showSnack('Não foi possível atualizar papel Entregador'); }
  };

  const trocarPapel = async (value: 'customer' | 'producer' | 'courier') => {
    try {
      setActiveRole(value);
      const enumRole = value === 'producer' ? AppRole.GERENTE : value === 'courier' ? AppRole.ENTREGADOR : AppRole.CLIENTE;
      await PermissionsService.getInstance().setActiveRole(enumRole);
      const next = value === 'courier' ? '/painel-entregador' : value === 'producer' ? '/perfil' : '/dashboard-comprador';
      safeReplace(next);
    } catch {
      showSnack('Não foi possível trocar o papel ativo');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Configurações</Text>
        <Text variant="bodyMedium">Gerencie seus papéis e preferências</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Gerenciar Papéis</Text>
          <View style={styles.switchRow}>
            <Text>Habilitar Produtor</Text>
            <Switch value={producerEnabled} onValueChange={toggleProducer} />
          </View>
          <View style={styles.switchRow}>
            <Text>Habilitar Entregador</Text>
            <Switch value={courierEnabled} onValueChange={toggleCourier} />
          </View>
          {availableRoles.length > 1 && (
            <SegmentedButtons
              value={activeRole}
              onValueChange={v => trocarPapel(v as any)}
              buttons={[
                { value: 'customer', label: 'Comprador' },
                { value: 'producer', label: 'Produtor', disabled: !availableRoles.includes('producer') },
                { value: 'courier', label: 'Entregador', disabled: !availableRoles.includes('courier') },
              ]}
              style={{ marginTop: 12 }}
            />
          )}
        </Card.Content>
      </Card>

      <View style={styles.footer}>
        <Button mode="contained" onPress={safeBack}>Voltar</Button>
      </View>

      <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={2500}>
        {snackMsg}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { marginBottom: 16 },
  title: { marginBottom: 6 },
  card: { marginBottom: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  footer: { marginTop: 8 },
});
