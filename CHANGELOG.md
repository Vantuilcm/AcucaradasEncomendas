# CHANGELOG - Açucaradas Encomendas

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) 
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1 - Build 1194] - 2026-04-28 (BLINDAGEM FASE BETA)

### 🔒 Blindado (Congelado e Funcional)
- **CI/CD iOS Local**: Script `ios-build-guardian.sh` validado. Build 1194 passou com sucesso e sem dependência de cotas da Expo.
- **Conformidade Apple**: Adicionada flag `ITSAppUsesNonExemptEncryption: false` no `app.json` para evitar prompt manual de criptografia.
- **Navegação (AppNavigator)**: Restauração da navegação nativa. Divisão estrutural de rotas concluída (Comprador vs Entregador/Produtor).
- **Core Providers**: `ThemeProvider`, `AuthProvider`, `CartProvider` integrados sem causar crashes na inicialização.
- **Componentes de UI**: Catálogo, Carrinho, Telas de Perfil e Diagnóstico de Build renderizados com sucesso.
- **Tratamento de Erros**: `ErrorBoundary` global ativo para capturar crashes do React.

### 🚧 Pendências para V1.0 (Desativado/Mockado)
- **Stripe**: Uso de inputs de texto plano no `CheckoutScreen.tsx` quebrando o PCI Compliance (precisa migrar para `CardField`).
- **OneSignal**: Hook `useNotifications` comentado no `AppNavigator.tsx` para evitar travamentos.
- **Firebase/Firestore**: Fluxos de Pedido e Carrinho dependentes de dados mockados/em memória (não gravando no banco real).
- **Auth Real**: Login permite passagem direta, não validando tokens reais do Firebase de forma estrita.
