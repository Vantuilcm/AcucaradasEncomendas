import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { ActivityIndicator, Chip, Surface, Text, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { ProducerAccountService } from '../../services/ProducerAccountService';
import { ProducerDocumentationData } from '../../types/ProducerAccount';
import { formatStripeRequirement } from '../../utils/stripeRequirementLabels';

const service = ProducerAccountService.getInstance();

export const ProducerDocumentationScreen = () => {
  const { user } = useAuth();
  const uid = (user as any)?.uid || (user as any)?.id;
  const email = user?.email || null;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ProducerDocumentationData | null>(null);

  const loadData = useCallback(async () => {
    if (!uid) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      const doc = await service.getDocumentation(uid, email);
      setData(doc);
    } catch (error) {
      console.error('[PRODUCER_DOCS] load error', error);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uid, email]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#FF9800" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }
      >
        <Surface style={styles.card} elevation={1}>
          <Field label="Nome" value={data?.name || '—'} />
          <Divider style={styles.divider} />
          <Field label="E-mail" value={data?.email || '—'} />
          <Divider style={styles.divider} />
          <Field label="CPF/CNPJ" value={data?.cpfCnpj || 'Não informado'} />
          <Divider style={styles.divider} />
          <Field label="stripeAccountId" value={data?.stripeAccountId || 'Conta Stripe não vinculada'} />
          <Divider style={styles.divider} />
          <Field
            label="charges_enabled"
            value={formatBool(data?.chargesEnabled)}
          />
          <Divider style={styles.divider} />
          <Field
            label="payouts_enabled"
            value={formatBool(data?.payoutsEnabled)}
          />
          <Divider style={styles.divider} />
          <Field label="Status da verificação" value={data?.verificationLabel || '—'} />
        </Surface>

        <Text style={styles.sectionTitle}>Pendências imediatas (currently_due)</Text>
        <RequirementList items={data?.currentlyDue || []} emptyLabel="Nenhuma pendência imediata." />

        <Text style={styles.sectionTitle}>Pendências futuras (eventually_due)</Text>
        <RequirementList items={data?.eventuallyDue || []} emptyLabel="Nenhuma pendência futura registrada." />

        <Text style={styles.hint}>
          Dados sincronizados a partir do cadastro e da última atualização em Conta Bancária. Somente consulta.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

function formatBool(value: boolean | null | undefined): string {
  if (value === true) return 'Sim';
  if (value === false) return 'Não';
  return '—';
}

const Field = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value}</Text>
  </View>
);

const RequirementList = ({ items, emptyLabel }: { items: string[]; emptyLabel: string }) => (
  <Surface style={styles.card} elevation={1}>
    {items.length === 0 ? (
      <Text style={styles.emptyList}>{emptyLabel}</Text>
    ) : (
      items.map((item) => (
        <View key={item} style={styles.requirementRow}>
          <Chip icon="alert-circle-outline" style={styles.chip}>
            {formatStripeRequirement(item)}
          </Chip>
          <Text style={styles.requirementCode}>{item}</Text>
        </View>
      ))
    )}
  </Surface>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 16, padding: 16, backgroundColor: '#fff', marginBottom: 16 },
  field: { paddingVertical: 4 },
  fieldLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase' },
  fieldValue: { fontSize: 15, color: '#333', marginTop: 4, fontWeight: '600' },
  divider: { marginVertical: 10 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 8, marginTop: 4 },
  requirementRow: { marginBottom: 12 },
  chip: { alignSelf: 'flex-start', backgroundColor: '#FFF3E0' },
  requirementCode: { fontSize: 11, color: '#999', marginTop: 4 },
  emptyList: { fontSize: 14, color: '#666' },
  hint: { fontSize: 12, color: '#999', marginTop: 8, lineHeight: 18 },
});
