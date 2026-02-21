import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

import { Card } from '../src/components/base/Card';
import { Button } from '../src/components/base/Button';
import { LoadingSpinner, useLoading } from '../src/components/Loading/LoadingSpinner';
import {
  ENTRANCE_TIMING_CONFIG,
  BUTTON_SPRING_CONFIG,
  getStaggeredDelay,
} from '../src/utils/animations';

// Componentes da tela
const FormSection = ({ title, children, index = 0 }) => (
  <Animated.View
    entering={FadeInDown.delay(getStaggeredDelay(index)).duration(400)}
    style={styles.formSection}
  >
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </Animated.View>
);

const FormInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  index = 0,
}) => (
  <Animated.View
    entering={FadeInDown.delay(getStaggeredDelay(index + 1)).duration(400)}
    style={styles.inputContainer}
  >
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
    />
  </Animated.View>
);

// Mock de categorias de produtos
const categorias = [
  { id: '1', nome: 'Bolos' },
  { id: '2', nome: 'Doces' },
  { id: '3', nome: 'Salgados' },
  { id: '4', nome: 'Bebidas' },
];

// Mock de produtos
const produtos = [
  { id: '1', categoriaId: '1', nome: 'Bolo de Chocolate', valor: 90.0 },
  { id: '2', categoriaId: '1', nome: 'Bolo de Morango', valor: 85.0 },
  { id: '3', categoriaId: '2', nome: 'Brigadeiro', valor: 3.0, minimo: 20 },
  { id: '4', categoriaId: '2', nome: 'Beijinho', valor: 3.0, minimo: 20 },
  { id: '5', categoriaId: '3', nome: 'Coxinha', valor: 4.0, minimo: 10 },
  { id: '6', categoriaId: '3', nome: 'Pastel', valor: 5.0, minimo: 10 },
  { id: '7', categoriaId: '4', nome: 'Refrigerante', valor: 8.0 },
  { id: '8', categoriaId: '4', nome: 'Suco Natural', valor: 12.0 },
];

export default function NovoPedido() {
  const router = useRouter();
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);
  const [itensSelecionados, setItensSelecionados] = useState([]);
  
  // Hook para controlar loading
  const { isLoading, showLoading, hideLoading, withLoading } = useLoading();

  // Animações
  const formOpacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const progress = useSharedValue(1 / 3); // Para a barra de progresso

  // Iniciar animações
  React.useEffect(() => {
    formOpacity.value = withTiming(1, ENTRANCE_TIMING_CONFIG);
    scale.value = withSpring(1, BUTTON_SPRING_CONFIG);
  }, []);

  // Estilo animado para o formulário
  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  // Animação de progresso
  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  // Avançar para a próxima etapa
  const avancarEtapa = async () => {
    // Salvar os valores da etapa atual (seria integrado com estado real)

    if (etapaAtual < 3) {
      // Animar saída do form atual
      formOpacity.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(setEtapaAtual)(etapaAtual + 1);
        formOpacity.value = withTiming(1, { duration: 300 });
        progress.value = withTiming((etapaAtual + 1) / 3);
      });
    } else {
      // Finalizar pedido com loading
      await withLoading(
        finalizarPedido(),
        "Finalizando pedido..."
      );
      router.push('/pedidos');
    }
  };

  // Simular finalização do pedido
  const finalizarPedido = async () => {
    // Simular chamada à API
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Pedido finalizado:', {
          etapa: etapaAtual,
          itens: itensSelecionados,
          total: calcularTotal()
        });
        resolve(true);
      }, 2000); // Simula 2 segundos de processamento
    });
  };

  // Voltar para a etapa anterior
  const voltarEtapa = () => {
    if (etapaAtual > 1) {
      // Animar saída do form atual
      formOpacity.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(setEtapaAtual)(etapaAtual - 1);
        formOpacity.value = withTiming(1, { duration: 300 });
        progress.value = withTiming((etapaAtual - 1) / 3);
      });
    } else {
      // Voltar para a tela anterior
      router.back();
    }
  };

  // Selecionar uma categoria
  const selecionarCategoria = categoria => {
    setCategoriaAtiva(categoria.id);
  };

  // Adicionar/remover um item
  const toggleItem = item => {
    const itemIndex = itensSelecionados.findIndex(i => i.id === item.id);

    if (itemIndex >= 0) {
      // Item já está selecionado, remover
      setItensSelecionados(itensSelecionados.filter(i => i.id !== item.id));
    } else {
      // Adicionar item com quantidade inicial 1
      setItensSelecionados([...itensSelecionados, { ...item, quantidade: 1 }]);
    }
  };

  // Atualizar quantidade de um item
  const atualizarQuantidade = (itemId, novaQuantidade) => {
    setItensSelecionados(
      itensSelecionados.map(item =>
        item.id === itemId ? { ...item, quantidade: novaQuantidade } : item
      )
    );
  };

  // Calcular total do pedido
  const calcularTotal = () => {
    return itensSelecionados.reduce((total, item) => total + item.valor * item.quantidade, 0);
  };

  // Renderizar conteúdo baseado na etapa atual
  const renderEtapa = () => {
    switch (etapaAtual) {
      case 1:
        return (
          <>
            <FormSection title="Dados do Cliente" index={0}>
              <FormInput
                label="Nome Completo"
                placeholder="Digite o nome completo"
                value=""
                onChangeText={() => {}}
                index={0}
              />

              <FormInput
                label="Telefone"
                placeholder="(00) 00000-0000"
                value=""
                onChangeText={() => {}}
                keyboardType="phone-pad"
                index={1}
              />

              <FormInput
                label="Endereço"
                placeholder="Rua, número, bairro"
                value=""
                onChangeText={() => {}}
                index={2}
              />

              <FormInput
                label="Complemento"
                placeholder="Apto, bloco, referência"
                value=""
                onChangeText={() => {}}
                index={3}
              />
            </FormSection>
          </>
        );

      case 2:
        return (
          <>
            <FormSection title="Produtos" index={0}>
              <Animated.View
                style={styles.categoriasContainer}
                entering={SlideInLeft.delay(50).duration(400)}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriasContent}
                >
                  {categorias.map((categoria, index) => (
                    <TouchableOpacity
                      key={categoria.id}
                      onPress={() => selecionarCategoria(categoria)}
                      style={[
                        styles.categoriaItem,
                        categoriaAtiva === categoria.id && styles.categoriaAtiva,
                      ]}
                    >
                      <Animated.Text
                        style={[
                          styles.categoriaNome,
                          categoriaAtiva === categoria.id && styles.categoriaTextoAtivo,
                        ]}
                        entering={FadeIn.delay(getStaggeredDelay(index)).duration(300)}
                      >
                        {categoria.nome}
                      </Animated.Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>

              <Animated.View
                style={styles.produtosContainer}
                entering={FadeInDown.delay(150).duration(400)}
              >
                {produtos
                  .filter(produto => !categoriaAtiva || produto.categoriaId === categoriaAtiva)
                  .map((produto, index) => {
                    const selecionado = itensSelecionados.some(item => item.id === produto.id);
                    const itemSelecionado = itensSelecionados.find(item => item.id === produto.id);

                    return (
                      <Animated.View
                        key={produto.id}
                        entering={FadeInDown.delay(getStaggeredDelay(index + 2)).duration(300)}
                        style={styles.produtoItem}
                      >
                        <TouchableOpacity
                          onPress={() => toggleItem(produto)}
                          style={[styles.produtoInfo, selecionado && styles.produtoSelecionado]}
                        >
                          <View>
                            <Text style={styles.produtoNome}>{produto.nome}</Text>
                            <Text style={styles.produtoValor}>
                              R$ {produto.valor.toFixed(2)}
                              {produto.minimo ? ` (mín. ${produto.minimo})` : ''}
                            </Text>
                          </View>

                          {selecionado && (
                            <View style={styles.quantidadeContainer}>
                              <TouchableOpacity
                                onPress={() =>
                                  atualizarQuantidade(
                                    produto.id,
                                    Math.max(1, itemSelecionado.quantidade - 1)
                                  )
                                }
                                style={styles.quantidadeBtn}
                              >
                                <Text style={styles.quantidadeBtnText}>-</Text>
                              </TouchableOpacity>

                              <Text style={styles.quantidade}>{itemSelecionado.quantidade}</Text>

                              <TouchableOpacity
                                onPress={() =>
                                  atualizarQuantidade(produto.id, itemSelecionado.quantidade + 1)
                                }
                                style={styles.quantidadeBtn}
                              >
                                <Text style={styles.quantidadeBtnText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })}
              </Animated.View>
            </FormSection>

            {itensSelecionados.length > 0 && (
              <Animated.View
                style={styles.resumoContainer}
                entering={FadeInDown.delay(300).duration(400)}
              >
                <Text style={styles.resumoTitulo}>Resumo</Text>
                <View style={styles.itensSelecionados}>
                  {itensSelecionados.map((item, index) => (
                    <View key={item.id} style={styles.itemResumo}>
                      <Text style={styles.itemResumoNome}>
                        {item.quantidade}x {item.nome}
                      </Text>
                      <Text style={styles.itemResumoValor}>
                        R$ {(item.valor * item.quantidade).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValor}>R$ {calcularTotal().toFixed(2)}</Text>
                </View>
              </Animated.View>
            )}
          </>
        );

      case 3:
        return (
          <>
            <FormSection title="Dados do Pagamento" index={0}>
              <FormInput
                label="Forma de Pagamento"
                placeholder="Selecione a forma de pagamento"
                value=""
                onChangeText={() => {}}
                index={0}
              />

              <FormInput
                label="Data de Entrega"
                placeholder="DD/MM/AAAA"
                value=""
                onChangeText={() => {}}
                index={1}
              />

              <FormInput
                label="Horário de Entrega"
                placeholder="HH:MM"
                value=""
                onChangeText={() => {}}
                index={2}
              />

              <FormInput
                label="Observações"
                placeholder="Informações adicionais para o pedido"
                value=""
                onChangeText={() => {}}
                index={3}
              />
            </FormSection>

            <Animated.View
              style={styles.resumoContainer}
              entering={FadeInDown.delay(300).duration(400)}
            >
              <Text style={styles.resumoTitulo}>Resumo do Pedido</Text>
              <View style={styles.itensSelecionados}>
                {itensSelecionados.map((item, index) => (
                  <View key={item.id} style={styles.itemResumo}>
                    <Text style={styles.itemResumoNome}>
                      {item.quantidade}x {item.nome}
                    </Text>
                    <Text style={styles.itemResumoValor}>
                      R$ {(item.valor * item.quantidade).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValor}>R$ {calcularTotal().toFixed(2)}</Text>
              </View>
            </Animated.View>
          </>
        );
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={styles.header} entering={FadeIn.duration(500)}>
        <Animated.Text style={styles.title}>
          {etapaAtual === 1
            ? 'Novo Pedido'
            : etapaAtual === 2
              ? 'Selecionar Produtos'
              : 'Finalizar Pedido'}
        </Animated.Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
          </View>
          <Text style={styles.progressText}>Etapa {etapaAtual} de 3</Text>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={[styles.formContainer, formAnimatedStyle]}>
          {renderEtapa()}
        </Animated.View>
      </ScrollView>

      <Animated.View style={styles.buttonContainer} entering={SlideInLeft.delay(400).duration(500)}>
        <Button title="Voltar" onPress={voltarEtapa} variant="outline" style={styles.button} />

        <Button
          title={etapaAtual === 3 ? 'Finalizar' : 'Avançar'}
          onPress={avancarEtapa}
          variant="primary"
          style={styles.button}
          disabled={isLoading}
        />
      </Animated.View>

      <LoadingSpinner
        visible={isLoading}
        type="pulse"
        size="medium"
        color="#007bff"
        overlay={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498db',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Espaço para os botões
  },
  formContainer: {
    paddingBottom: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
  },
  categoriasContainer: {
    marginBottom: 16,
  },
  categoriasContent: {
    paddingBottom: 8,
  },
  categoriaItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  categoriaAtiva: {
    backgroundColor: '#3498db',
  },
  categoriaNome: {
    fontSize: 14,
    color: '#333',
  },
  categoriaTextoAtivo: {
    color: '#fff',
    fontWeight: '500',
  },
  produtosContainer: {
    marginBottom: 16,
  },
  produtoItem: {
    marginBottom: 8,
  },
  produtoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  produtoSelecionado: {
    borderColor: '#3498db',
    backgroundColor: 'rgba(52, 152, 219, 0.05)',
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  produtoValor: {
    fontSize: 14,
    color: '#666',
  },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantidadeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantidadeBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  quantidade: {
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 10,
  },
  resumoContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resumoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  itensSelecionados: {
    marginBottom: 16,
  },
  itemResumo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemResumoNome: {
    fontSize: 14,
    color: '#333',
  },
  itemResumoValor: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(249, 249, 249, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    flex: 1,
    marginHorizontal: 6,
  },
});
