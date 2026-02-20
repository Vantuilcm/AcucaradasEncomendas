import React from 'react';
import { View, StyleSheet, FlatList, Image, Text } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';
import { Card } from '../src/components/base/Card';
import { Button } from '../src/components/base/Button';
import { Snackbar } from 'react-native-paper';
import { setPendingHref } from '../src/navigation/pendingNavigation';

type Loja = { id: string; nome: string; imagem?: string; categoria?: string; descricao?: string };

const lojasSample: Loja[] = [
  { id: 'loja1', nome: 'Doces da Maria', imagem: 'https://via.placeholder.com/400x300', categoria: 'Doces', descricao: 'Brigadeiros, beijinhos e mais' },
  { id: 'loja2', nome: 'Delícias do João', imagem: 'https://via.placeholder.com/400x300', categoria: 'Bolos', descricao: 'Bolos caseiros fresquinhos' },
  { id: 'loja3', nome: 'Salgados da Ana', imagem: 'https://via.placeholder.com/400x300', categoria: 'Salgados', descricao: 'Coxinha, pastel e empadas' },
];

export default function Lojas() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [welcomeVisible, setWelcomeVisible] = React.useState(true);

  const safePush = (href: string) => {
    if (!rootNavigationState?.key) {
      setPendingHref(href);
      return;
    }
    router.push(href as any);
  };

  React.useEffect(() => {
    const t = setTimeout(() => setWelcomeVisible(false), 2000);
    return () => clearTimeout(t);
  }, []);

  const abrirProdutosDaLoja = (loja: Loja) => {
    const qs = new URLSearchParams({
      loja: loja.id,
      lojaNome: loja.nome,
      start: 'produtos',
      imagem: loja.imagem || '',
      descricao: loja.descricao || '',
      categoria: loja.categoria || '',
    }).toString();
    safePush(`/novo-pedido?${qs}`);
  };

  const renderItem = ({ item }: { item: Loja }) => (
    <Card style={styles.card} onPress={() => abrirProdutosDaLoja(item)}>
      {item.imagem ? <Image source={{ uri: item.imagem }} style={styles.imagem} /> : null}
      <View style={styles.infoRow}>
        <Text style={styles.nome}>{item.nome}</Text>
        {item.categoria ? <Text style={styles.categoria}>{item.categoria}</Text> : null}
      </View>
      {item.descricao ? <Text style={styles.descricao}>{item.descricao}</Text> : null}
      <View style={styles.actions}>
        <Button title="Ver produtos" onPress={() => abrirProdutosDaLoja(item)} variant="primary" />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lojas</Text>
      <FlatList
        data={lojasSample}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
      <Snackbar visible={welcomeVisible} onDismiss={() => setWelcomeVisible(false)} duration={2000}>
        Selecione uma loja para começar
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  listContent: { paddingBottom: 24 },
  card: { marginBottom: 12 },
  imagem: { width: '100%', height: 160, borderRadius: 8, marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nome: { fontSize: 18, fontWeight: '600', color: '#333' },
  categoria: { fontSize: 12, color: '#666' },
  descricao: { fontSize: 14, color: '#666', marginTop: 4 },
  actions: { marginTop: 8 },
});
