import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, useTheme, SegmentedButtons, Snackbar } from 'react-native-paper';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { PermissionsService, Role as AppRole } from '../src/services/PermissionsService';
import { setPendingHref } from '../src/navigation/pendingNavigation';

export default function Produtos() {
  const theme = useTheme();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { user, logout } = useAuth();
  const [welcomeVisible, setWelcomeVisible] = React.useState(true);

  const safeReplace = (href: string) => {
    if (!rootNavigationState?.key) {
      setPendingHref(href);
      return;
    }
    router.replace(href as any);
  };

  const safePush = (href: string) => {
    if (!rootNavigationState?.key) {
      setPendingHref(href);
      return;
    }
    router.push(href as any);
  };
  React.useEffect(() => {
    const t = setTimeout(() => setWelcomeVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const initialRole = (user as any)?.role ?? 'customer';
  const [isProducer, setIsProducer] = React.useState<boolean>(initialRole === 'producer' || initialRole === 'admin' || initialRole === 'gerente');
  const [activeRole, setActiveRole] = React.useState<'customer' | 'producer' | 'courier'>(initialRole === 'admin' || initialRole === 'gerente' || initialRole === 'producer' ? 'producer' : 'customer');
  const [availableRoles, setAvailableRoles] = React.useState<Array<'customer' | 'producer' | 'courier'>>([initialRole as any]);

  React.useEffect(() => {
    (async () => {
      try {
        const roleEnum = await PermissionsService.getInstance().getUserRole();
        const isProd = roleEnum === AppRole.GERENTE || roleEnum === AppRole.ADMIN;
        setIsProducer(isProd);
        const rolesEnum = await PermissionsService.getInstance().getUserRoles();
        const mapped = rolesEnum.map(r => r === AppRole.GERENTE ? 'producer' : r === AppRole.ENTREGADOR ? 'courier' : 'customer');
        const uniq = Array.from(new Set(mapped));
        setAvailableRoles(uniq);
        setActiveRole(isProd ? 'producer' : uniq.includes('courier') ? 'courier' : 'customer');
      } catch {}
    })();
  }, [user?.id]);

  const trocarPapel = async (value: 'customer' | 'producer' | 'courier') => {
    setActiveRole(value);
    const enumRole = value === 'producer' ? AppRole.GERENTE : value === 'courier' ? AppRole.ENTREGADOR : AppRole.CLIENTE;
    await PermissionsService.getInstance().setActiveRole(enumRole);
    const next = value === 'courier' ? '/painel-entregador' : value === 'producer' ? '/perfil' : '/dashboard-comprador';
    safeReplace(next);
  };

  const sair = async () => {
    await logout();
    safeReplace('/login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} testID="produtos-screen">
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Produtos</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button mode="outlined" onPress={() => safePush('/configuracoes')}>Configurações</Button>
          <Button mode="outlined" onPress={sair}>Sair</Button>
        </View>
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
          style={{ marginBottom: 12 }}
        />
      )}
      {!isProducer ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Área do Produtor</Text>
            <Text variant="bodyMedium" style={styles.description}>
              Para acessar o painel do produtor, altere seu tipo de conta para Produtor.
            </Text>
            <Button mode="contained" onPress={() => safeReplace('/pedidos')}>Voltar aos pedidos</Button>
          </Card.Content>
        </Card>
      ) : (
        <>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium">Cadastrar novo produto</Text>
              <Text variant="bodyMedium" style={styles.description}>
                Em breve: formulário completo de produto com fotos, categorias e estoque.
              </Text>
              <Button mode="contained" onPress={() => safePush('/novo-produto')}>Cadastrar</Button>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium">Relatórios de vendas</Text>
              <Text variant="bodyMedium" style={styles.description}>
                Acompanhe desempenho por período, produtos e categorias.
              </Text>
              <Button mode="outlined" onPress={() => safePush('/relatorios')}>Ver Relatórios</Button>
            </Card.Content>
          </Card>
        </>
      )}
      <Snackbar
        visible={welcomeVisible}
        onDismiss={() => setWelcomeVisible(false)}
        duration={3000}
      >
        {`Bem-vindo(a)${(user as any)?.nome ? `, ${(user as any).nome}` : ''}!`}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { marginBottom: 0 },
  card: { marginBottom: 12 },
  description: { marginVertical: 8 },
});
