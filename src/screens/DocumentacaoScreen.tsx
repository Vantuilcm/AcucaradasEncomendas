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
            Dados cadastrais e verificação segura para produtores.
          </Text>
        </View>

        <Text variant="bodyMedium" style={styles.intro}>
          Para vender na Açucaradas Encomendas, mantenha seus dados cadastrais completos e atualizados.
          Quando uma verificação de identidade ou KYC for necessária para recebimentos, ela será realizada no ambiente seguro da Stripe.
        </Text>

        <Divider style={styles.divider} />

        <List.Section>
          <List.Subheader>Como funciona a verificação</List.Subheader>
          <List.Item
            title="CPF ou CNPJ"
            description="Dado cadastral utilizado quando aplicável ao perfil do produtor; não é um arquivo obrigatório para envio nesta tela."
            left={(props) => <List.Icon {...props} icon="card-account-details-outline" />}
          />
          <List.Item
            title="RG ou documento com foto"
            description="Quando exigido para KYC, o processo é realizado pela Stripe no ambiente seguro de verificação."
            left={(props) => <List.Icon {...props} icon="badge-account-horizontal-outline" />}
          />
          <List.Item
            title="Comprovante de endereço"
            description="Quando solicitado pela Stripe, faz parte da verificação e não é enviado por esta tela."
            left={(props) => <List.Icon {...props} icon="home-outline" />}
          />
        </List.Section>

        <Text variant="bodySmall" style={styles.note}>
          Atualmente, não há documentos operacionais obrigatórios para envio nesta tela. Arquivos solicitados pela Stripe
          para identidade ou KYC permanecem no fluxo da Stripe e não são duplicados no Firebase pela Açucaradas Encomendas.
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
