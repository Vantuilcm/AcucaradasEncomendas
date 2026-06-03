import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, List, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type DocumentacaoScreenProps = {
  onBack: () => void;
};

export const DocumentacaoScreen = ({ onBack }: DocumentacaoScreenProps) => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="file-document-outline" size={48} color="#FF9800" />
          <Text variant="headlineSmall" style={styles.title}>
            Documentação
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            CPF/CNPJ e verificação de identidade para produtores.
          </Text>
        </View>

        <Text variant="bodyMedium" style={styles.intro}>
          Para vender na Açucaradas Encomendas, seu cadastro precisa estar completo e verificado.
          Nesta área você poderá acompanhar o status da sua documentação.
        </Text>

        <Divider style={styles.divider} />

        <List.Section>
          <List.Subheader>Documentos usualmente solicitados</List.Subheader>
          <List.Item
            title="CPF ou CNPJ"
            description="Documento fiscal do responsável ou da empresa."
            left={(props) => <List.Icon {...props} icon="card-account-details-outline" />}
          />
          <List.Item
            title="RG ou documento com foto"
            description="Identificação do titular da conta."
            left={(props) => <List.Icon {...props} icon="badge-account-horizontal-outline" />}
          />
          <List.Item
            title="Comprovante de endereço"
            description="Conta de consumo ou extrato recente."
            left={(props) => <List.Icon {...props} icon="home-outline" />}
          />
        </List.Section>

        <Text variant="bodySmall" style={styles.note}>
          O envio de documentos será habilitado em uma próxima atualização. Por enquanto, esta tela
          serve como orientação sobre o que será necessário.
        </Text>

        <Button mode="contained" onPress={onBack} style={styles.backButton} buttonColor="#9C27B0">
          Voltar
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 16 },
  title: { fontWeight: 'bold', marginTop: 12, color: '#1A1A1A' },
  subtitle: { textAlign: 'center', color: '#666', marginTop: 4 },
  intro: { color: '#444', lineHeight: 22, marginBottom: 8 },
  divider: { marginVertical: 12 },
  note: { color: '#888', marginTop: 16, marginBottom: 24, lineHeight: 18 },
  backButton: { borderRadius: 12 },
});
