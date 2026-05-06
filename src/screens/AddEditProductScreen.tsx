import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, Card, Chip, HelperText, Divider, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePermissions } from '../hooks/usePermissions';
import { ErrorMessage } from '../components/ErrorMessage';
import * as ImagePicker from 'expo-image-picker';
import { ProductService } from '../services/ProductService';
import { Product } from '../types/Product';

import { useAppTheme } from '../components/ThemeProvider';

// --- CONFIGURAÇÕES DE DADOS (MARKETPLACE EXPANDIDO) ---
const SUGGESTIONS = [
  { title: 'Brigadeiro Gourmet', category: 'Brigadeiros', listingType: 'product' },
  { title: 'Bala de Coco', category: 'Bala de Coco', listingType: 'product' },
  { title: 'Bento Cake', category: 'Bento Cakes', listingType: 'product' },
  { title: 'Brownie', category: 'Brownies', listingType: 'product' },
  { title: 'Copo da Felicidade', category: 'Sobremesas', listingType: 'product' },
  { title: 'Cone Trufado', category: 'Sobremesas', listingType: 'product' },
  { title: 'Banoffee', category: 'Banoffee', listingType: 'product' },
];

const DIETARY_TAGS = [
  'Sem Lactose', 'Sem Glúten', 'Diet', 'Vegano', 'Vegetariano',
  'Zero Açúcar', 'Low Carb', 'Fit', 'Artesanal', 'Gourmet', 'Orgânico'
];

const EVENT_TAGS = [
  'Casamento', 'Infantil', 'Corporativo', 'Chá Revelação', 'Formatura', '15 anos'
];

const CATEGORY_GROUPS = {
  'Doces': ['Bala de Coco', 'Brigadeiros', 'Docinhos de Festa', 'Beijinhos', 'Cajuzinhos', 'Casadinhos'],
  'Gourmet': ['Brownies', 'Cookies', 'Donuts', 'Macarons'],
  'Bolos': ['Bento Cakes', 'Naked Cakes', 'Bolo no Pote', 'Bolos'], // Mantém 'Bolos'
  'Sobremesas': ['Pudins', 'Banoffee', 'Cheesecakes', 'Palha Italiana', 'Sobremesas', 'Tortas'],
  'Eventos': ['Kit Festa', 'Lembrancinhas', 'Mesa de Festa'],
  'Decoração': ['Balões', 'Painéis', 'Flores', 'Arcos'],
  'Aluguel': ['Mesas', 'Cadeiras', 'Louças', 'Boleiras', 'Rechauds', 'Kit Provençal'],
  'Espaços': ['Salão de Festa', 'Espaço Kids', 'Chácara', 'Área Gourmet'],
  'Serviços': ['DJ', 'Fotógrafo', 'Recreador', 'Garçom', 'Cerimonialista'],
  'Outros': ['Cupcakes', 'Salgados', 'Bebidas'] // Categorias antigas para compatibilidade
};

interface RouteParams {
  product?: Product;
  isEditing?: boolean;
}

export function AddEditProductScreen() {
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const route = useRoute();
  const { isProdutor, isAdmin } = usePermissions();
  const productService = React.useMemo(() => ProductService.getInstance(), []);
  
  const { product, isEditing } = route.params as RouteParams || {};
  
  // Estados principais
  const [listingType, setListingType] = useState<'product' | 'service' | 'rental' | 'space'>('product');
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '1',
    available: true,
  });

  // Campos dinâmicos
  const [dynamicFields, setDynamicFields] = useState({
    validade: '',
    peso: '',
    duracao: '',
    deslocamento: false,
    diaria: '',
    caucao: '',
    capacidade: '',
    estacionamento: false,
  });

  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [eventTags, setEventTags] = useState<string[]>([]);

  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: false,
    price: false,
    category: false,
  });

  // Carregar dados
  useEffect(() => {
    if (isEditing && product) {
      setListingType(product.listingType || 'product');
      setProductData({
        name: product.nome || '',
        description: product.descricao || '',
        price: product.preco?.toString() || '',
        category: product.categoria || '',
        stock: product.estoque?.toString() || '0',
        available: product.disponivel ?? true,
      });
      
      setDietaryTags(product.dietaryTags || []);
      setEventTags(product.eventTags || []);

      setDynamicFields({
        validade: product.validade || '',
        peso: product.peso?.toString() || '',
        duracao: product.duracao?.toString() || '',
        deslocamento: product.deslocamento || false,
        diaria: product.diaria?.toString() || '',
        caucao: product.caucao?.toString() || '',
        capacidade: product.capacidade?.toString() || '',
        estacionamento: product.estacionamento || false,
      });

      if (product.imagens && product.imagens.length > 0) {
        setImage(product.imagens[0]);
      }
    }
  }, [isEditing, product]);

  if (!isAdmin && !isProdutor) {
    return (
      <ErrorMessage
        message="Você não tem permissão para acessar esta área"
        onRetry={() => navigation.goBack()}
        retryLabel="Voltar"
      />
    );
  }

  const toggleTag = (tag: string, type: 'dietary' | 'event') => {
    if (type === 'dietary') {
      setDietaryTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    } else {
      setEventTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    }
  };

  const applySuggestion = (suggestion: typeof SUGGESTIONS[0]) => {
    setProductData(prev => ({
      ...prev,
      name: suggestion.title,
      category: suggestion.category,
    }));
    setListingType(suggestion.listingType as any);
  };

  const validateForm = () => {
    const newErrors = {
      name: !productData.name.trim(),
      price:
        !productData.price.trim() ||
        isNaN(parseFloat(productData.price)) ||
        parseFloat(productData.price) <= 0,
      category: !productData.category.trim(),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSaveProduct = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Preparar payload. Valores vazios não numéricos serão deixados como undefined para o ProductService limpar.
      const payload: Partial<Product> = {
        nome: productData.name,
        descricao: productData.description,
        preco: parseFloat(productData.price),
        categoria: productData.category,
        estoque: parseInt(productData.stock) || 0,
        disponivel: productData.available,
        temEstoque: (parseInt(productData.stock) || 0) > 0,
        imagens: image ? [image] : [],
        listingType,
        dietaryTags: dietaryTags.length > 0 ? dietaryTags : undefined,
        eventTags: eventTags.length > 0 ? eventTags : undefined,
      };

      // Campos dinâmicos (convertidos adequadamente)
      if (listingType === 'product') {
        payload.validade = dynamicFields.validade || undefined;
        payload.peso = dynamicFields.peso ? parseFloat(dynamicFields.peso) : undefined;
      } else if (listingType === 'service') {
        payload.duracao = dynamicFields.duracao ? parseInt(dynamicFields.duracao) : undefined;
        payload.deslocamento = dynamicFields.deslocamento;
      } else if (listingType === 'rental') {
        payload.diaria = dynamicFields.diaria ? parseFloat(dynamicFields.diaria) : undefined;
        payload.caucao = dynamicFields.caucao ? parseFloat(dynamicFields.caucao) : undefined;
      } else if (listingType === 'space') {
        payload.capacidade = dynamicFields.capacidade ? parseInt(dynamicFields.capacidade) : undefined;
        payload.estacionamento = dynamicFields.estacionamento;
      }

      if (isEditing && product?.id) {
        await productService.atualizarProduto(product.id, payload);
      } else {
        await productService.criarProduto(payload);
      }
      
      Alert.alert('Sucesso', isEditing ? 'Atualizado com sucesso!' : 'Adicionado com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível salvar.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar sua galeria.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            {isEditing ? 'Editar Anúncio' : 'Novo Anúncio'}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Marketplace de Festas & Eventos
          </Text>
        </View>

        {!isEditing && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.sectionTitle}>Sugestões Populares</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {SUGGESTIONS.map((s, i) => (
                <TouchableOpacity key={i} onPress={() => applySuggestion(s)}>
                  <Chip style={styles.suggestionChip} icon="star" mode="outlined">
                    {s.title}
                  </Chip>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Card style={styles.formCard}>
          <Card.Content>
            
            <Text style={styles.label}>Tipo de Anúncio</Text>
            <SegmentedButtons
              value={listingType}
              onValueChange={(val) => setListingType(val as any)}
              buttons={[
                { value: 'product', label: 'Produto' },
                { value: 'service', label: 'Serviço' },
                { value: 'rental', label: 'Aluguel' },
                { value: 'space', label: 'Espaço' },
              ]}
              style={styles.segmented}
            />

            <Divider style={styles.divider} />

            <TextInput
              label="Título *"
              value={productData.name}
              onChangeText={text => setProductData({ ...productData, name: text })}
              style={styles.input}
              error={errors.name}
              mode="outlined"
            />

            <TextInput
              label="Descrição"
              value={productData.description}
              onChangeText={text => setProductData({ ...productData, description: text })}
              multiline
              numberOfLines={3}
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Preço (R$) *"
              value={productData.price}
              onChangeText={text => setProductData({ ...productData, price: text })}
              keyboardType="numeric"
              style={styles.input}
              error={errors.price}
              mode="outlined"
              left={<TextInput.Affix text="R$ " />}
            />

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Categoria *</Text>
            {Object.entries(CATEGORY_GROUPS).map(([group, cats]) => (
              <View key={group} style={styles.categoryGroup}>
                <Text style={styles.groupTitle}>{group}</Text>
                <View style={styles.chipRow}>
                  {cats.map(cat => (
                    <Chip
                      key={cat}
                      mode={productData.category === cat ? 'flat' : 'outlined'}
                      selected={productData.category === cat}
                      onPress={() => setProductData({ ...productData, category: cat })}
                      style={styles.chip}
                    >
                      {cat}
                    </Chip>
                  ))}
                </View>
              </View>
            ))}
            {errors.category && <HelperText type="error">Selecione uma categoria</HelperText>}

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Características Alimentares</Text>
            <View style={styles.chipRow}>
              {DIETARY_TAGS.map(tag => (
                <Chip
                  key={tag}
                  mode={dietaryTags.includes(tag) ? 'flat' : 'outlined'}
                  selected={dietaryTags.includes(tag)}
                  onPress={() => toggleTag(tag, 'dietary')}
                  style={styles.chip}
                  selectedColor={theme.colors.primary}
                >
                  {tag}
                </Chip>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Ideal para Eventos</Text>
            <View style={styles.chipRow}>
              {EVENT_TAGS.map(tag => (
                <Chip
                  key={tag}
                  mode={eventTags.includes(tag) ? 'flat' : 'outlined'}
                  selected={eventTags.includes(tag)}
                  onPress={() => toggleTag(tag, 'event')}
                  style={styles.chip}
                  selectedColor={theme.colors.secondary}
                >
                  {tag}
                </Chip>
              ))}
            </View>

            <Divider style={styles.divider} />

            {/* Campos Dinâmicos Seguros */}
            <Text style={styles.sectionTitle}>Detalhes Específicos</Text>
            
            {listingType === 'product' && (
              <View>
                <View style={styles.dynamicRow}>
                  <TextInput label="Estoque" value={productData.stock} onChangeText={t => setProductData({ ...productData, stock: t })} keyboardType="numeric" style={[styles.input, styles.flex1]} mode="outlined" />
                  <View style={styles.spacer} />
                  <TextInput label="Peso (g)" value={dynamicFields.peso} onChangeText={t => setDynamicFields({ ...dynamicFields, peso: t })} keyboardType="numeric" style={[styles.input, styles.flex1]} mode="outlined" />
                </View>
                <TextInput label="Validade" value={dynamicFields.validade} onChangeText={t => setDynamicFields({ ...dynamicFields, validade: t })} placeholder="Ex: 5 dias" style={styles.input} mode="outlined" />
              </View>
            )}

            {listingType === 'service' && (
              <View style={styles.dynamicRow}>
                <TextInput label="Duração (horas)" value={dynamicFields.duracao} onChangeText={t => setDynamicFields({ ...dynamicFields, duracao: t })} keyboardType="numeric" style={[styles.input, styles.flex1]} mode="outlined" />
                <View style={styles.spacer} />
                <Chip mode={dynamicFields.deslocamento ? 'flat' : 'outlined'} onPress={() => setDynamicFields({ ...dynamicFields, deslocamento: !dynamicFields.deslocamento })} style={styles.toggleChip}>
                  Deslocamento Incluso? {dynamicFields.deslocamento ? 'Sim' : 'Não'}
                </Chip>
              </View>
            )}

            {listingType === 'rental' && (
              <View style={styles.dynamicRow}>
                <TextInput label="Diária (R$)" value={dynamicFields.diaria} onChangeText={t => setDynamicFields({ ...dynamicFields, diaria: t })} keyboardType="numeric" style={[styles.input, styles.flex1]} mode="outlined" />
                <View style={styles.spacer} />
                <TextInput label="Caução (R$)" value={dynamicFields.caucao} onChangeText={t => setDynamicFields({ ...dynamicFields, caucao: t })} keyboardType="numeric" style={[styles.input, styles.flex1]} mode="outlined" />
              </View>
            )}

            {listingType === 'space' && (
              <View style={styles.dynamicRow}>
                <TextInput label="Capacidade (pessoas)" value={dynamicFields.capacidade} onChangeText={t => setDynamicFields({ ...dynamicFields, capacidade: t })} keyboardType="numeric" style={[styles.input, styles.flex1]} mode="outlined" />
                <View style={styles.spacer} />
                <Chip mode={dynamicFields.estacionamento ? 'flat' : 'outlined'} onPress={() => setDynamicFields({ ...dynamicFields, estacionamento: !dynamicFields.estacionamento })} style={styles.toggleChip}>
                  Estacionamento? {dynamicFields.estacionamento ? 'Sim' : 'Não'}
                </Chip>
              </View>
            )}

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Disponibilidade Imediata</Text>
              <View style={styles.availabilityContainer}>
                <Chip mode={productData.available ? 'flat' : 'outlined'} selected={productData.available} onPress={() => setProductData({ ...productData, available: true })} style={[styles.chip, productData.available && styles.availableChip]}>Sim</Chip>
                <Chip mode={!productData.available ? 'flat' : 'outlined'} selected={!productData.available} onPress={() => setProductData({ ...productData, available: false })} style={[styles.chip, !productData.available && styles.unavailableChip]}>Não</Chip>
              </View>
            </View>

            <Text style={styles.label}>Imagem *</Text>
            <View style={styles.imageContainer}>
              {image ? (
                <Image source={{ uri: image }} style={styles.productImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderText}>Toque abaixo para adicionar</Text>
                </View>
              )}
              <Button mode="contained-tonal" icon="camera" onPress={pickImage} disabled={loading} style={styles.imageButton}>
                {image ? 'Trocar Imagem' : 'Selecionar Imagem'}
              </Button>
            </View>

          </Card.Content>
        </Card>

        <View style={styles.actionsContainer}>
          <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.cancelButton} disabled={loading}>
            Cancelar
          </Button>
          <Button mode="contained" onPress={handleSaveProduct} loading={loading} disabled={loading} style={styles.saveButton}>
            {isEditing ? 'Atualizar' : 'Publicar'}
          </Button>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: { colors: any }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: { padding: 20, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { color: theme.colors.text.primary, fontWeight: 'bold' },
  subtitle: { color: theme.colors.text.secondary, marginTop: 4 },
  
  suggestionsContainer: { padding: 16, backgroundColor: theme.colors.surface, marginBottom: 8 },
  suggestionChip: { marginRight: 8, backgroundColor: theme.colors.background },
  
  formCard: { margin: 16, borderRadius: 16, elevation: 3, backgroundColor: theme.colors.card },
  input: { marginBottom: 12, backgroundColor: theme.colors.surface },
  
  segmented: { marginBottom: 16 },
  divider: { marginVertical: 16 },
  
  label: { fontSize: 16, color: theme.colors.text.primary, fontWeight: '600', marginBottom: 8 },
  sectionTitle: { fontSize: 18, color: theme.colors.text.primary, fontWeight: 'bold', marginTop: 8, marginBottom: 12 },
  
  categoryGroup: { marginBottom: 16 },
  groupTitle: { fontSize: 14, color: theme.colors.text.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { marginBottom: 8 },
  
  dynamicRow: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1 },
  spacer: { width: 12 },
  toggleChip: { flex: 1, justifyContent: 'center', height: 48, marginBottom: 12 },

  section: { marginTop: 8, marginBottom: 16 },
  availabilityContainer: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  availableChip: { backgroundColor: theme.colors.success },
  unavailableChip: { backgroundColor: theme.colors.error },
  
  imageContainer: { alignItems: 'center', marginVertical: 8, padding: 16, backgroundColor: theme.colors.background, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed' },
  productImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 16 },
  imagePlaceholder: { width: '100%', height: 150, borderRadius: 8, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  placeholderText: { color: theme.colors.text.secondary },
  imageButton: { width: '100%' },
  
  actionsContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 16 },
  cancelButton: { flex: 1 },
  saveButton: { flex: 2 },
});