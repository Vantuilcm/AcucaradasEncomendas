# Guia de Solução de Problemas com React Native Reanimated

## Visão Geral

Este documento fornece instruções detalhadas para resolver problemas comuns com o React Native Reanimated no projeto Açucaradas Encomendas. As animações são um componente essencial da experiência do usuário em nosso aplicativo, e este guia ajudará a garantir que elas funcionem corretamente.

## Configuração Correta

### 1. Babel Config

O plugin do Reanimated deve estar configurado corretamente no `babel.config.js`. A configuração correta deve ser:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      '@babel/plugin-transform-export-namespace-from'
    ]
  };
};
```

### 2. Versões Compatíveis

Para o Expo SDK 50, as versões compatíveis são:

- `react-native-reanimated`: ~3.6.0
- `react-native-gesture-handler`: ~2.14.0
- `react-native`: 0.73.6

## Problemas Comuns e Soluções

### Problema 1: Animações não funcionam ou travam

**Sintomas:**
- Animações não são exibidas
- A interface trava ao tentar executar animações
- Erros no console relacionados ao Reanimated

**Soluções:**

1. **Verificar o plugin do Babel:**
   - Execute o script `corrigir-reanimated.ps1` para verificar e corrigir a configuração do Babel

2. **Limpar o cache:**
   ```
   npm cache clean --force
   npx expo start --clear
   ```

3. **Reiniciar o dispositivo/emulador:**
   - Às vezes, é necessário reiniciar completamente o dispositivo ou emulador

### Problema 2: Erros de importação

**Sintomas:**
- Erros como "Cannot find module 'react-native-reanimated'"
- Erros relacionados a funções específicas do Reanimated

**Soluções:**

1. **Verificar as importações:**
   - Certifique-se de que as importações estão corretas:
   ```javascript
   import Animated, {
     useSharedValue,
     useAnimatedStyle,
     withTiming,
     // outras funções...
   } from 'react-native-reanimated';
   ```

2. **Reinstalar a dependência:**
   ```
   npm uninstall react-native-reanimated
   npm install react-native-reanimated@3.6.0 --save
   ```

## Testando as Animações

Foi criada uma página de teste específica para verificar se as animações estão funcionando corretamente:

1. Inicie o aplicativo com `npx expo start`
2. Navegue para a rota `/teste-animacao`
3. Verifique se todas as animações estão funcionando corretamente:
   - Círculo girando
   - Quadrado flutuando
   - Triângulo pulsando
   - Animações ao tocar nos elementos

## Componente de Exemplo

O componente `AnimacaoExemplo` foi criado como referência para implementar animações corretamente usando o React Native Reanimated. Ele demonstra:

- Uso de `useSharedValue` para valores animados
- Uso de `useAnimatedStyle` para estilos dinâmicos
- Animações complexas com `withRepeat`, `withSequence`, etc.
- Animações de entrada como `FadeIn`, `ZoomIn`, etc.

## Scripts de Suporte

Foram criados dois scripts para ajudar na resolução de problemas:

1. **verificar-e-corrigir-app.ps1**: Verifica e corrige problemas gerais do aplicativo
2. **corrigir-reanimated.ps1**: Foca especificamente em problemas com o React Native Reanimated

Execute estes scripts quando encontrar problemas com animações.

## Próximos Passos

Após garantir que as animações estão funcionando corretamente:

1. Implemente animações em outros componentes do aplicativo
2. Otimize as animações para melhor desempenho
3. Considere adicionar animações mais complexas para melhorar a experiência do usuário

## Recursos Adicionais

- [Documentação oficial do React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [Exemplos de animações](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/animations)
- [Guia de migração para Reanimated 3](https://docs.swmansion.com/react-native-reanimated/docs/migration)

---

Este documento foi criado para ajudar a equipe a resolver problemas com animações no projeto Açucaradas Encomendas. Se você encontrar problemas não cobertos por este guia, por favor, atualize-o com as novas informações.