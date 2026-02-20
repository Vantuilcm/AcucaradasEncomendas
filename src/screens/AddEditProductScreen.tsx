import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, TextInput, Card, useTheme, Chip, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useAuth } from '../contexts/AuthContext';
import { ErrorMessage } from '../components/ErrorMessage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { ProductService } from '../services/ProductService';
import { ProducerService } from '../services/ProducerService';
import { Permission } from '../services/PermissionsService';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { firebaseAvailable, storage } from '../config/firebase';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';

// Categorias disponíveis
const CATEGORIES = ['Bolos', 'Cupcakes', 'Tortas', 'Doces', 'Salgados', 'Bebidas'];
const SPECIAL_TAGS = [
  { key: 'promocao', label: 'Promoção' },
  { key: 'novo', label: 'Novo' },
  { key: 'mais_vendido', label: 'Mais vendido' },
  { key: 'sem_gluten', label: 'Sem glúten' },
  { key: 'sem_lactose', label: 'Sem lactose' },
  { key: 'vegano', label: 'Vegano' },
  { key: 'light', label: 'Light' },
  { key: 'organico', label: 'Orgânico' },
  { key: 'diet', label: 'Diet' },
];

// Interface para o produto
interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
  available: boolean;
  stock: number;
}

// Interface para os parâmetros da rota
interface RouteParams {
  product?: Product;
  isEditing?: boolean;
}

export function AddEditProductScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { user } = useAuth();
  
  // Extrair parâmetros da rota
  const { product, isEditing } = route.params as RouteParams || {};
  
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '1',
    available: true,
    minimo: '1',
    preparationTime: '',
    leadTimeDays: '0',
    ingredients: '',
    destacado: false,
    specialTags: [] as string[],
    ingredientCost: '',
    laborCost: '',
    packagingCost: '',
  });

  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [producer, setProducer] = useState<any | null>(null);
  const [errors, setErrors] = useState({
    name: false,
    price: false,
    category: false,
  });

  // Carregar dados do produto se estiver editando
  useEffect(() => {
    if (isEditing && product) {
      setProductData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        category: product.category,
        stock: product.stock.toString(),
        available: product.available,
        minimo: String((product as any)?.detalhes?.minimo ?? '1'),
        preparationTime: String((product as any)?.tempoPreparacao ?? ''),
        leadTimeDays: String((product as any)?.leadTimeDays ?? '0'),
        ingredients: Array.isArray((product as any)?.ingredientes)
          ? ((product as any)?.ingredientes as string[]).join(', ')
          : '',
        destacado: Boolean((product as any)?.destacado ?? false),
        specialTags: Array.isArray((product as any)?.tagsEspeciais)
          ? ((product as any)?.tagsEspeciais as string[])
          : [],
        ingredientCost: (product as any)?.custoIngredientes != null ? String((product as any).custoIngredientes) : '',
        laborCost: (product as any)?.custoMaoDeObra != null ? String((product as any).custoMaoDeObra) : '',
        packagingCost: (product as any)?.custoEmbalagem != null ? String((product as any).custoEmbalagem) : '',
      });
      
      if (product.imageUrl) {
        setImage(product.imageUrl);
      }
    }
  }, [isEditing, product]);

  

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

  const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase();

  const uploadProductImage = async (uri: string, productName: string, ownerId: string): Promise<string> => {
    if (!firebaseAvailable || !storage) {
      throw new Error('Firebase Storage não está configurado neste build.');
    }

    const fileName = `${sanitizeFilename(productName)}_${Date.now()}.jpg`;
    const storagePath = `product_images/${ownerId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    let uploadCompleted = false;
    try {
      const res = await fetch(uri);
      if (!res.ok) {
        throw new Error('Falha ao ler a imagem selecionada');
      }
      const blob = await res.blob();
      await uploadBytes(storageRef, blob);
      uploadCompleted = true;
    } catch {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      await uploadString(storageRef, base64, 'base64', { contentType: 'image/jpeg' });
      uploadCompleted = true;
    }

    if (!uploadCompleted) {
      throw new Error('Falha ao enviar a imagem do produto');
    }

    const url = await getDownloadURL(storageRef);
    return url;
  };

  const handleSaveProduct = async () => {
    try {
      if (!validateForm()) {
        return;
      }
      if (!image) {
        Alert.alert('Imagem obrigatória', 'Selecione uma imagem do produto.');
        return;
      }
      if (!user) {
        Alert.alert('Erro', 'Usuário não identificado. Faça login novamente e tente de novo.');
        return;
      }

      let activeProducer = producer;
      try {
        if (!activeProducer) {
          const service = ProducerService.getInstance();
          const existing = await service.getProducerByUserId(user.id);
          if (existing) {
            activeProducer = existing;
            setProducer(existing);
          } else {
            const rawAddress = Array.isArray(user.endereco) ? user.endereco[0] : (user as any).address;
            const address = {
              street: rawAddress?.rua || rawAddress?.street || '',
              number: rawAddress?.numero || rawAddress?.number || '',
              complement: rawAddress?.complemento || rawAddress?.complement || '',
              neighborhood: rawAddress?.bairro || rawAddress?.neighborhood || '',
              city: rawAddress?.cidade || rawAddress?.city || '',
              state: rawAddress?.estado || rawAddress?.state || '',
              zipCode: rawAddress?.cep || rawAddress?.zipCode || '',
            };
            const created = await service.createProducer({
              userId: user.id,
              name: user.producerProfile?.storeName || user.displayName || user.name || user.nome || 'Loja do Produtor',
              email: user.email || '',
              phone: user.telefone || user.phone || '',
              cnpj: user.producerProfile?.cnpj || undefined,
              cpf: user.producerProfile?.cpf || user.cpf || undefined,
              address,
              isActive: false,
              status: 'pending',
            });
            activeProducer = created;
            setProducer(created);
          }
        }
      } catch {
        Alert.alert('Erro', 'Não foi possível carregar o perfil do produtor.');
        return;
      }

      if (!activeProducer) {
        Alert.alert('Erro', 'Perfil de produtor não encontrado. Atualize a tela e tente novamente.');
        return;
      }

      const producerIdForProduct = (product as any)?.producerId || activeProducer.id;

      setSaving(true);

      let imageUriForUpload = image;
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          image,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        imageUriForUpload = manipulated.uri;
      } catch {
      }

      const isRemote = /^https?:\/\//.test(imageUriForUpload);
      const uploadedUrl = isRemote ? imageUriForUpload : await uploadProductImage(imageUriForUpload, productData.name, producerIdForProduct);

      const payload: any = {
        producerId: producerIdForProduct,
        nome: productData.name.trim(),
        descricao: productData.description?.trim() || '',
        preco: parseFloat(productData.price),
        categoria: productData.category.trim().toLowerCase(),
        disponivel: !!productData.available,
        imagens: [uploadedUrl],
        estoque: parseInt(productData.stock, 10) || 0,
        temEstoque: true,
        leadTimeDays: productData.leadTimeDays ? parseInt(productData.leadTimeDays, 10) : 0,
        ingredientes: productData.ingredients
          ? productData.ingredients
              .split(',')
              .map(i => i.trim())
              .filter(i => i.length > 0)
          : [],
        destacado: !!productData.destacado,
        tagsEspeciais: productData.specialTags,
      };

      if (productData.preparationTime) {
        payload.tempoPreparacao = parseInt(productData.preparationTime, 10);
      }

      if (productData.minimo) {
        payload.detalhes = {
          minimo: parseInt(productData.minimo, 10),
        };
      }

      if (productData.ingredientCost) {
        payload.custoIngredientes = parseFloat(productData.ingredientCost);
      }
      if (productData.laborCost) {
        payload.custoMaoDeObra = parseFloat(productData.laborCost);
      }
      if (productData.packagingCost) {
        payload.custoEmbalagem = parseFloat(productData.packagingCost);
      }

      if (isEditing && product?.id) {
        await ProductService.getInstance().atualizarProduto(product.id, payload);
      } else {
        await ProductService.getInstance().criarProduto(payload);
      }

      const successMessage = isEditing ? 'Produto atualizado com sucesso!' : 'Produto adicionado com sucesso!';
      Alert.alert('Sucesso', successMessage, [
        { text: 'OK', onPress: () => navigation.navigate('ProductManagement') },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error?.message ?? 'Não foi possível salvar o produto.');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    // Solicitar permissão para acessar a galeria
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de permissão para acessar sua galeria de fotos.'
      );
      return;
    }

    // Abrir o seletor de imagens
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
    <ProtectedRoute
      requiredPermissions={[Permission.GERENCIAR_PRODUTOS]}
      requireAllPermissions={true}
      fallbackRoute={undefined}
      unauthorizedComponent={<ErrorMessage message="Você não tem permissão para acessar esta área" onRetry={() => navigation.goBack()} retryText="Voltar" />}
    >
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          {((Constants.expoConfig?.extra as any)?.brandLogoUrl) ? (
            <Image source={{ uri: (Constants.expoConfig?.extra as any)?.brandLogoUrl }} style={{ width: 60, height: 60, borderRadius: 12, marginBottom: 6 }} />
          ) : (
            <Text variant="titleSmall" style={{ color: '#FF69B4', fontWeight: '700' }}>Açucaradas Encomendas</Text>
          )}
          <Text variant="headlineMedium" style={styles.title}>
            {isEditing ? 'Editar Produto' : 'Adicionar Novo Produto'}
          </Text>
        </View>

        <Card style={styles.formCard}>
          <Card.Content>
            <TextInput
              label="Nome do produto *"
              value={productData.name}
              onChangeText={text => setProductData({ ...productData, name: text })}
              style={styles.input}
              error={errors.name}
            />
            {errors.name && <HelperText type="error">O nome do produto é obrigatório</HelperText>}

            <TextInput
              label="Descrição"
              value={productData.description}
              onChangeText={text => setProductData({ ...productData, description: text })}
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <TextInput
              label="Preço (R$) *"
              value={productData.price}
              onChangeText={text => setProductData({ ...productData, price: text })}
              keyboardType="numeric"
              style={styles.input}
              error={errors.price}
            />
            {errors.price && <HelperText type="error">Informe um preço válido</HelperText>}

            <Text style={styles.label}>Categoria *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesContainer}
            >
              {CATEGORIES.map(category => (
                <Chip
                  key={category}
                  mode={productData.category === category ? 'flat' : 'outlined'}
                  selected={productData.category === category}
                  onPress={() => setProductData({ ...productData, category })}
                  style={styles.categoryChip}
                >
                  {category}
                </Chip>
              ))}
            </ScrollView>
            {errors.category && <HelperText type="error">Selecione uma categoria</HelperText>}

            <TextInput
              label="Estoque disponível"
              value={productData.stock}
              onChangeText={text => setProductData({ ...productData, stock: text })}
              keyboardType="numeric"
              style={styles.input}
            />

            <TextInput
              label="Antecedência necessária (dias)"
              value={productData.leadTimeDays}
              onChangeText={text => setProductData({ ...productData, leadTimeDays: text })}
              keyboardType="numeric"
              style={styles.input}
              placeholder="0 (para pronta entrega)"
            />
            <HelperText type="info">Quantos dias de antecedência o cliente precisa para pedir este produto?</HelperText>

            <TextInput
              label="Quantidade mínima por pedido"
              value={productData.minimo}
              onChangeText={text => setProductData({ ...productData, minimo: text })}
              keyboardType="numeric"
              style={styles.input}
            />

            <TextInput
              label="Tempo de preparo (min)"
              value={productData.preparationTime}
              onChangeText={text => setProductData({ ...productData, preparationTime: text })}
              keyboardType="numeric"
              style={styles.input}
            />

            <TextInput
              label="Ingredientes (separados por vírgula)"
              value={productData.ingredients}
              onChangeText={text => setProductData({ ...productData, ingredients: text })}
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <Text style={styles.label}>Custos da receita (uso interno, não aparece para o cliente)</Text>
            <TextInput
              label="Custo dos ingredientes (R$)"
              value={productData.ingredientCost}
              onChangeText={text => setProductData({ ...productData, ingredientCost: text })}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              label="Custo de mão de obra (R$)"
              value={productData.laborCost}
              onChangeText={text => setProductData({ ...productData, laborCost: text })}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              label="Custo de embalagem (R$)"
              value={productData.packagingCost}
              onChangeText={text => setProductData({ ...productData, packagingCost: text })}
              keyboardType="numeric"
              style={styles.input}
            />

            <Text style={styles.label}>Destaque</Text>
            <View style={styles.availabilityContainer}>
              <Chip
                mode={productData.destacado ? 'flat' : 'outlined'}
                selected={productData.destacado}
                onPress={() => setProductData({ ...productData, destacado: true })}
                style={[styles.availabilityChip, productData.destacado && styles.availableChip]}
              >
                Destacar produto
              </Chip>
              <Chip
                mode={!productData.destacado ? 'flat' : 'outlined'}
                selected={!productData.destacado}
                onPress={() => setProductData({ ...productData, destacado: false })}
                style={[styles.availabilityChip, !productData.destacado && styles.unavailableChip]}
              >
                Não destacar
              </Chip>
            </View>

            <Text style={styles.label}>Tags especiais</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
              {SPECIAL_TAGS.map(tag => {
                const selected = productData.specialTags.includes(tag.key);
                return (
                  <Chip
                    key={tag.key}
                    mode={selected ? 'flat' : 'outlined'}
                    selected={selected}
                    onPress={() => {
                      const next = selected
                        ? productData.specialTags.filter(t => t !== tag.key)
                        : [...productData.specialTags, tag.key];
                      setProductData({ ...productData, specialTags: next });
                    }}
                    style={styles.categoryChip}
                  >
                    {tag.label}
                  </Chip>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Disponibilidade</Text>
            <View style={styles.availabilityContainer}>
              <Chip
                mode={productData.available ? 'flat' : 'outlined'}
                selected={productData.available}
                onPress={() => setProductData({ ...productData, available: true })}
                style={[styles.availabilityChip, productData.available && styles.availableChip]}
              >
                Disponível
              </Chip>
              <Chip
                mode={!productData.available ? 'flat' : 'outlined'}
                selected={!productData.available}
                onPress={() => setProductData({ ...productData, available: false })}
                style={[styles.availabilityChip, !productData.available && styles.unavailableChip]}
              >
                Indisponível
              </Chip>
            </View>

            <Text style={styles.label}>Imagem do Produto</Text>
            <View style={styles.imageContainer}>
              {image ? (
                <Image source={{ uri: image }} style={styles.productImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderText}>Sem imagem</Text>
                </View>
              )}

              <Button
                mode="contained"
                onPress={pickImage}
                style={[styles.imageButton, { backgroundColor: theme.colors.primary }]}
              >
                {image ? 'Trocar Imagem' : 'Selecionar Imagem'}
              </Button>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actionsContainer}>
          <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.cancelButton}>
            Cancelar
          </Button>

              <Button
                mode="contained"
                onPress={handleSaveProduct}
                style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
              >
                {saving ? 'Salvando...' : isEditing ? 'Atualizar Produto' : 'Salvar Produto'}
              </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    color: '#333',
  },
  formCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  input: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginTop: 8,
    marginBottom: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  availabilityContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  availabilityChip: {
    marginRight: 8,
  },
  availableChip: {
    backgroundColor: '#4CAF50',
  },
  unavailableChip: {
    backgroundColor: '#F44336',
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  productImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    color: '#757575',
  },
  imageButton: {
    marginTop: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
  },
});
