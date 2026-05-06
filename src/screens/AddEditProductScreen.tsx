import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, Button, TextInput, Card, Chip, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePermissions } from '../hooks/usePermissions';
import { ErrorMessage } from '../components/ErrorMessage';
import * as ImagePicker from 'expo-image-picker';
import { ProductService } from '../services/ProductService';
import { Product } from '../types/Product';

import { useAppTheme } from '../components/ThemeProvider';

// Categorias disponíveis
const CATEGORIES = ['Bolos', 'Cupcakes', 'Tortas', 'Doces', 'Salgados', 'Bebidas'];

// Interface para os parâmetros da rota
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
  
  // Extrair parâmetros da rota
  const { product, isEditing } = route.params as RouteParams || {};
  
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '1',
    available: true,
  });

  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: false,
    price: false,
    category: false,
  });

  // Carregar dados do produto se estiver editando
  useEffect(() => {
    if (isEditing && product) {
      setProductData({
        name: product.nome || '',
        description: product.descricao || '',
        price: product.preco?.toString() || '',
        category: product.categoria || '',
        stock: product.estoque?.toString() || '0',
        available: product.disponivel ?? true,
      });
      
      if (product.imagens && product.imagens.length > 0) {
        setImage(product.imagens[0]);
      }
    }
  }, [isEditing, product]);

  // Verificar se o usuário é administrador ou produtor
  if (!isAdmin && !isProdutor) {
    return (
      <ErrorMessage
        message="Você não tem permissão para acessar esta área"
        onRetry={() => navigation.goBack()}
        retryLabel="Voltar"
      />
    );
  }

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
    if (!validateForm()) {
      return;
    }

    if (isEditing && !product?.id) {
      throw new Error('Produto sem ID para edição');
    }

    console.log('Saving product:', { 
      productId: product?.id, 
      isEditing 
    });

    try {
      setLoading(true);
      const payload: Partial<Product> = {
        nome: productData.name,
        descricao: productData.description,
        preco: parseFloat(productData.price),
        categoria: productData.category,
        estoque: parseInt(productData.stock),
        disponivel: productData.available,
        temEstoque: parseInt(productData.stock) > 0,
        imagens: image ? [image] : [],
      };

      if (isEditing && product?.id) {
        await productService.atualizarProduto(product.id, payload);
      } else {
        await productService.criarProduto(payload);
      }
      
      const successMessage = isEditing ? 'Produto atualizado com sucesso!' : 'Produto adicionado com sucesso!';

      Alert.alert('Sucesso', successMessage, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível salvar o produto.');
    } finally {
      setLoading(false);
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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
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
              label="Estoque"
              value={productData.stock}
              onChangeText={text => setProductData({ ...productData, stock: text })}
              keyboardType="numeric"
              style={styles.input}
            />

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
                disabled={loading}
                style={[styles.imageButton, { backgroundColor: theme.colors.primary }]}
              >
                {image ? 'Trocar Imagem' : 'Selecionar Imagem'}
              </Button>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actionsContainer}>
          <Button 
            mode="outlined" 
            onPress={() => navigation.goBack()} 
            style={styles.cancelButton}
            disabled={loading}
          >
            Cancelar
          </Button>

          <Button
            mode="contained"
            onPress={handleSaveProduct}
            loading={loading}
            disabled={loading}
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          >
            {isEditing ? 'Atualizar Produto' : 'Salvar Produto'}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: { colors: any }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    color: theme.colors.text.primary,
  },
  formCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: theme.colors.card,
  },
  input: {
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  },
  label: {
    fontSize: 16,
    color: theme.colors.text.primary,
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
    backgroundColor: theme.colors.success,
  },
  unavailableChip: {
    backgroundColor: theme.colors.error,
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
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  placeholderText: {
    color: theme.colors.text.secondary,
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