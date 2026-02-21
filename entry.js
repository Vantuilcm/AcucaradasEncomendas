// Arquivo entry.js personalizado para resolver problemas com expo-router
// Este arquivo serve como um ponto de entrada alternativo para o expo-router

// Importar o runtime do Metro para garantir que o Fast Refresh funcione na web
import '@expo/metro-runtime';

// Importar o componente de renderização do expo-router
import { renderRootComponent } from 'expo-router/src/renderRootComponent';

// Importar o componente App do expo-router
import { App } from 'expo-router/_app';

// Renderizar o componente raiz
renderRootComponent(App);