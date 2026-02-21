 Solução para Problemas do Metro Bundler

## Problema Identificado

O aplicativo Acucaradas Encomendas está enfrentando problemas ao iniciar devido a falhas no Metro Bundler, especificamente com o erro:

```
Failed to construct transformer: Error: Failed to start watch mode.
```

Este erro ocorre quando o Metro Bundler não consegue iniciar o modo de observação de arquivos (watch mode), que é essencial para o desenvolvimento com React Native e Expo.

## Causas Possíveis

1. **Problemas com o Watchman**: O Watchman é uma ferramenta usada pelo Metro para monitorar alterações em arquivos, mas pode apresentar problemas em alguns sistemas.

2. **Conflitos de porta**: O Metro tenta usar a porta 8081 por padrão, mas essa porta pode estar em uso por outro processo.

3. **Limitações do sistema de arquivos**: Em alguns sistemas Windows, há limitações no número de arquivos que podem ser observados simultaneamente.

4. **Cache corrompido**: Caches antigos ou corrompidos podem causar problemas na inicialização do Metro.

## Soluções Implementadas

### 1. Script de Correção do Metro Bundler

Criamos o script `fix-metro-watch.js` que:

- Limpa os caches do Metro
- Configura o Metro para não usar o Watchman
- Atualiza o arquivo `metro.config.js` com configurações otimizadas
- Remove diretórios de cache que podem estar corrompidos

### 2. Configuração Otimizada do Metro

Atualizamos o arquivo `metro.config.js` com as seguintes otimizações:

- Desativação completa do Watchman
- Limitação do número de workers para evitar sobrecarga
- Configuração de um watcher alternativo baseado em Node
- Aumento do intervalo de polling para reduzir o uso de recursos

### 3. Scripts de Inicialização Alternativos

Criamos scripts alternativos para iniciar o aplicativo:

- `start-expo-safe.js`: Inicia o Expo com configurações seguras e contorna problemas comuns
- `start-minimal.js`: Versão minimalista focada apenas no essencial
- `start-app.bat`: Script batch para Windows que limpa caches e inicia o Expo

## Como Usar

### Opção 1: Usar o Script Batch

```
.\start-app.bat
```

Este script limpa os caches e inicia o Expo com configurações otimizadas.

### Opção 2: Iniciar Manualmente com Configurações Seguras

```
npx expo start --web --port 8082 --clear
```

Especificar uma porta alternativa (8082) e limpar o cache ajuda a evitar problemas comuns.

### Opção 3: Reiniciar o Ambiente de Desenvolvimento

Se os problemas persistirem, tente:

1. Fechar todos os terminais e processos relacionados ao Metro/Expo
2. Limpar caches manualmente:
   ```
   rd /s /q ".expo"
   rd /s /q "node_modules\.cache"
   ```
3. Reiniciar o computador
4. Iniciar o aplicativo com o script batch

## Próximos Passos

Se os problemas persistirem, considere:

1. Atualizar o React Native e o Expo para as versões mais recentes
2. Verificar se há conflitos entre dependências no `package.json`
3. Considerar o uso de uma ferramenta alternativa como o Vite para desenvolvimento web

## Referências

- [Documentação do Metro Bundler](https://facebook.github.io/metro/)
- [Troubleshooting Expo](https://docs.expo.dev/troubleshooting/)
- [React Native Debugging](https://reactnative.dev/docs/debugging)