import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, Button, TextInput, Card, useTheme, Chip, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { ErrorMessage } from '../components/ErrorMessage';
import * as ImagePicker from 'expo-image-picker';

// Categorias disponíveis
const CATEGORIES = ['Bolos', 'Cupcakes', 'Tortas', 'Doces', 'Salgados', 'Bebidas'];

export function AddProductScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [productData, setProductData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '1',
    available: true,
  });

  const [image, setImage] = useState<string | null>(null);
  const [errors, setErrors] = useState({
    name: false,
    price: false,
    category: false,
  });

  // Verificar se o usuário é administrador ou produtor
  if (user?.role !== 'admin' && user?.role !== 'producer') {
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

  const handleSaveProduct = () => {
    if (!validateForm()) {
      return;
    }

    // Aqui seria feita a chamada para a API para salvar o produto
    // Como estamos simulando, apenas mostramos um alerta e voltamos para a tela anterior

    Alert.alert('Sucesso', 'Produto adicionado com sucesso!', [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
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
            Adicionar Novo Produto
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
              label="Estoque inicial"
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
                style={[styles.imageButton, { backgroundColor: theme.colors.primary }]}
              >
                Selecionar Imagem
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
            Salvar Produto
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
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
