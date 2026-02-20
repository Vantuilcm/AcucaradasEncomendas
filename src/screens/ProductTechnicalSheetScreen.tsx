import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { Text, Card, Chip, Button, Divider, useTheme } from 'react-native-paper';
import type { RootStackParamList } from '../types/navigation';
import type { Product } from '../types/Product';

type ScreenRouteProp = RouteProp<RootStackParamList, 'ProductTechnicalSheet'>;
type ScreenNavProp = StackNavigationProp<RootStackParamList, 'ProductTechnicalSheet'>;

type Props = {
  route?: ScreenRouteProp;
  navigation?: ScreenNavProp;
};

export function ProductTechnicalSheetScreen(_: Props) {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<ScreenNavProp>();
  const theme = useTheme();
  const product = route.params?.product;

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text variant="titleMedium">Produto não encontrado</Text>
          <Button mode="contained" onPress={() => navigation.goBack()} style={styles.primaryButton}>
            Voltar
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const ingredients = Array.isArray(product.ingredientes) ? product.ingredientes : [];
  const specialTags = Array.isArray(product.tagsEspeciais) ? product.tagsEspeciais : [];
  const allergens = Array.isArray(product.alergenos) ? product.alergenos : [];

  const minQtyRaw = product.detalhes?.['minimo'];
  const minQty = typeof minQtyRaw === 'number' ? minQtyRaw : undefined;

  const ingredientCost =
    typeof product.custoIngredientes === 'number' ? product.custoIngredientes : undefined;
  const laborCost =
    typeof product.custoMaoDeObra === 'number' ? product.custoMaoDeObra : undefined;
  const packagingCost =
    typeof product.custoEmbalagem === 'number' ? product.custoEmbalagem : undefined;
  const ingredientCostValue = ingredientCost ?? 0;
  const laborCostValue = laborCost ?? 0;
  const packagingCostValue = packagingCost ?? 0;
  const totalCost = ingredientCostValue + laborCostValue + packagingCostValue;
  const margin = product.preco - totalCost;
  const marginPercent = product.preco > 0 ? (margin / product.preco) * 100 : 0;

  let optimizationHint = '';
  if (totalCost > 0 && product.preco > 0) {
    if (marginPercent < 30) {
      optimizationHint = 'Margem baixa: vale revisar fornecedores de ingredientes e embalagens.';
    } else if (ingredientCostValue > product.preco * 0.5) {
      optimizationHint = 'Ingredientes representam mais de 50% do preço: negociar compra em volume ou alternativas.';
    } else if (laborCostValue > product.preco * 0.3) {
      optimizationHint = 'Custo de mão de obra alto: considere otimizar o processo de produção ou tempo de preparo.';
    } else if (packagingCostValue > product.preco * 0.15) {
      optimizationHint = 'Custo de embalagem relevante: revisar tipo de embalagem ou fornecedor.';
    } else {
      optimizationHint = 'Estrutura de custos saudável para este preço.';
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.productName}>{product.nome}</Text>
            <View style={styles.rowBetween}>
              <Chip mode="flat" style={styles.categoryChip}>{product.categoria}</Chip>
              <Chip
                mode="flat"
                style={[styles.statusChip, { backgroundColor: product.disponivel ? '#4CAF50' : '#F44336' }]}
              >
                {product.disponivel ? 'Disponível' : 'Indisponível'}
              </Chip>
            </View>
            <Text variant="headlineSmall" style={styles.price}>R$ {product.preco.toFixed(2)}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Custos da receita" />
          <Card.Content>
            {totalCost === 0 ? (
              <Text variant="bodyMedium">Nenhum custo cadastrado para esta receita.</Text>
            ) : (
              <View>
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Custo dos ingredientes</Text>
                  <Text variant="bodyMedium">R$ {(ingredientCost || 0).toFixed(2)}</Text>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Custo de mão de obra</Text>
                  <Text variant="bodyMedium">R$ {(laborCost || 0).toFixed(2)}</Text>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Custo de embalagem</Text>
                  <Text variant="bodyMedium">R$ {(packagingCost || 0).toFixed(2)}</Text>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Custo total da receita</Text>
                  <Text variant="bodyMedium">R$ {totalCost.toFixed(2)}</Text>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Margem sobre o preço</Text>
                  <Text variant="bodyMedium">R$ {margin.toFixed(2)} ({marginPercent.toFixed(1)}%)</Text>
                </View>
                {optimizationHint ? (
                  <View style={styles.sectionBlock}>
                    <Text variant="bodyMedium" style={styles.sectionTitle}>Sugestão de otimização</Text>
                    <Text variant="bodyMedium">{optimizationHint}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Ficha técnica" />
          <Card.Content>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Tempo de preparo</Text>
              <Text variant="bodyMedium">{product.tempoPreparacao ? `${product.tempoPreparacao} min` : '—'}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Antecedência necessária</Text>
              <Text variant="bodyMedium">{typeof product.leadTimeDays === 'number' ? `${product.leadTimeDays} dias` : '—'}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Quantidade mínima por pedido</Text>
              <Text variant="bodyMedium">{typeof minQty === 'number' ? `${minQty} unidades` : '—'}</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Ingredientes" />
          <Card.Content>
            {ingredients.length === 0 ? (
              <Text variant="bodyMedium">Nenhum ingrediente cadastrado.</Text>
            ) : (
              <View style={styles.chipRow}>
                {ingredients.map((ingredient, index) => (
                  <Chip key={index} mode="outlined" style={styles.chip}>{ingredient}</Chip>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Informações nutricionais" />
          <Card.Content>
            {product.informacoesNutricionais || product.nutricional ? (
              <View>
                {typeof (product.informacoesNutricionais?.porcao ?? product.nutricional?.porcao) === 'number' && (
                  <View style={styles.infoRow}>
                    <Text variant="bodyMedium" style={styles.infoLabel}>Porção</Text>
                    <Text variant="bodyMedium">{(product.informacoesNutricionais?.porcao ?? product.nutricional?.porcao) || 0} g</Text>
                  </View>
                )}
                {product.informacoesNutricionais?.porcao || product.nutricional?.porcao ? (
                  <Divider style={styles.divider} />
                ) : null}
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Calorias</Text>
                  <Text variant="bodyMedium">{(product.informacoesNutricionais?.calorias ?? product.nutricional?.calorias) || 0}</Text>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Carboidratos</Text>
                  <Text variant="bodyMedium">{(product.informacoesNutricionais?.carboidratos ?? product.nutricional?.carboidratos) || 0} g</Text>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Proteínas</Text>
                  <Text variant="bodyMedium">{(product.informacoesNutricionais?.proteinas ?? product.nutricional?.proteinas) || 0} g</Text>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Gorduras</Text>
                  <Text variant="bodyMedium">{(product.informacoesNutricionais?.gorduras ?? product.nutricional?.gorduras) || 0} g</Text>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Sódio</Text>
                  <Text variant="bodyMedium">{(product.informacoesNutricionais?.sodio ?? product.nutricional?.sodio) || 0} mg</Text>
                </View>
              </View>
            ) : (
              <Text variant="bodyMedium">Nenhuma informação nutricional cadastrada.</Text>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Alergênicos e tags" />
          <Card.Content>
            {allergens.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text variant="bodyMedium" style={styles.sectionTitle}>Alergênicos</Text>
                <View style={styles.chipRow}>
                  {allergens.map((item, index) => (
                    <Chip key={index} mode="outlined" style={styles.chip}>{item}</Chip>
                  ))}
                </View>
              </View>
            )}
            {specialTags.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text variant="bodyMedium" style={styles.sectionTitle}>Tags especiais</Text>
                <View style={styles.chipRow}>
                  {specialTags.map((item, index) => (
                    <Chip key={index} mode="outlined" style={styles.chip}>{item}</Chip>
                  ))}
                </View>
              </View>
            )}
            {allergens.length === 0 && specialTags.length === 0 && (
              <Text variant="bodyMedium">Nenhuma informação adicional cadastrada.</Text>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Estoque e produção" />
          <Card.Content>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Controle de estoque</Text>
              <Text variant="bodyMedium">{product.temEstoque ? 'Ativado' : 'Desativado'}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Estoque atual</Text>
              <Text variant="bodyMedium">{product.temEstoque ? product.estoque ?? 0 : 'Sem controle'}</Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actionsRow}>
          <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.secondaryButton}>
            Voltar
          </Button>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('AddEditProduct', { product, isEditing: true })}
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
          >
            Editar produto
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  headerCard: { marginBottom: 12, borderRadius: 12 },
  productName: { marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryChip: { marginRight: 8 },
  statusChip: { height: 24 },
  price: { marginTop: 8, color: '#FF69B4' },
  card: { marginTop: 12, borderRadius: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  infoLabel: { color: '#666' },
  divider: { marginVertical: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginRight: 8, marginBottom: 8 },
  sectionBlock: { marginTop: 8 },
  sectionTitle: { marginBottom: 4 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  primaryButton: { flex: 1, marginLeft: 8 },
  secondaryButton: { flex: 1, marginRight: 8 },
});

export default ProductTechnicalSheetScreen;
