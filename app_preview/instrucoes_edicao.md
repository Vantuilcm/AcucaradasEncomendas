# Instruções para Edição do Vídeo de Preview

## Software Recomendado

### Edição Principal
- **Adobe Premiere Pro** (recomendado para edição principal)
- **Adobe After Effects** (para efeitos especiais e animações)

### Alternativas
- **DaVinci Resolve** (gratuito para recursos básicos)
- **Final Cut Pro** (para usuários de Mac)

## Configuração do Projeto

### Configurações Iniciais
1. **Criar novo projeto** com as seguintes configurações:
   - **Nome**: Açucaradas_Encomendas_Preview
   - **Resolução**: 1080x1920 (9:16 vertical)
   - **Taxa de quadros**: 30 fps
   - **Codec**: H.264
   - **Espaço de cor**: Rec. 709

### Organização
1. **Criar as seguintes pastas** no projeto:
   - **Footage**: Para os vídeos capturados
   - **Audio**: Para narração e música
   - **Graphics**: Para logos, textos e elementos gráficos
   - **Exports**: Para as renderizações

2. **Importar todos os arquivos** nas pastas correspondentes

## Estrutura da Timeline

### Organização por Cenas
1. **Criar sequências separadas** para cada cena:
   - Cena 1: Introdução (0-5s)
   - Cena 2: Navegação de Produtos (5-10s)
   - Cena 3: Detalhes do Produto (10-15s)
   - Cena 4: Carrinho de Compras (15-20s)
   - Cena 5: Métodos de Pagamento (20-25s)
   - Cena 6: Conclusão (25-30s)

2. **Criar uma sequência principal** onde todas as cenas serão combinadas

## Edição por Cena

### Cena 1: Introdução (0-5s)
1. **Criar fundo** com gradiente rosa (#FF85A2 → #FFC0D3)
2. **Animar o logo** com fade-in suave (duração: 1s)
3. **Adicionar texto** "Gerencie suas encomendas de forma simples" com animação de entrada
4. **Aplicar transição** de fade para a próxima cena

### Cena 2: Navegação de Produtos (5-10s)
1. **Cortar o footage** para mostrar apenas a navegação fluida
2. **Adicionar texto** "Catálogo completo de produtos" com animação de entrada
3. **Aplicar efeito de destaque** nos elementos importantes da interface
4. **Aplicar transição** de deslize para a direita

### Cena 3: Detalhes do Produto (10-15s)
1. **Cortar o footage** para mostrar a tela de detalhes do produto
2. **Adicionar texto** "Detalhes completos e personalizáveis" com animação de entrada
3. **Aplicar efeito de zoom** em elementos importantes (foto, preço, descrição)
4. **Aplicar transição** de zoom out

### Cena 4: Carrinho de Compras (15-20s)
1. **Cortar o footage** para mostrar o carrinho com produtos
2. **Adicionar texto** "Gerenciamento de pedidos simplificado" com animação de entrada
3. **Aplicar efeito de destaque** nos valores e botão de finalização
4. **Aplicar transição** de deslize para cima

### Cena 5: Métodos de Pagamento (20-25s)
1. **Cortar o footage** para mostrar as opções de pagamento
2. **Adicionar texto** "Múltiplas opções de pagamento" com animação de entrada
3. **Aplicar efeito de destaque** nas opções de pagamento
4. **Aplicar transição** de fade out

### Cena 6: Conclusão (25-30s)
1. **Criar fundo** com gradiente rosa similar à primeira cena
2. **Animar o logo** com entrada suave
3. **Adicionar texto** "Baixe agora e transforme seu negócio!" com animação de entrada
4. **Animar botão de download** com efeito de pulsação

## Efeitos e Animações

### Textos
1. **Fonte**: 
   - Títulos: Montserrat Bold
   - Textos: Roboto Regular
2. **Animações de entrada**:
   - Fade In (duração: 0.3s)
   - Slide from Bottom (duração: 0.5s)
3. **Animações de saída**:
   - Fade Out (duração: 0.3s)

### Transições
1. **Entre cenas**:
   - Fade (duração: 0.5s)
   - Deslize (duração: 0.7s)
   - Zoom (duração: 0.8s)
2. **Dentro das cenas**:
   - Cortes limpos
   - Dissolve suave (duração: 0.3s)

### Efeitos Visuais
1. **Destaques**:
   - Brilho suave (opacidade: 30%)
   - Círculo de destaque (cor: #FF85A2, opacidade: 20%)
2. **Correção de cor**:
   - Aumentar saturação levemente (+10%)
   - Aumentar contraste levemente (+5%)
   - Temperatura de cor neutra

## Áudio

### Narração
1. **Importar arquivos** de narração para cada cena
2. **Sincronizar** com as cenas correspondentes
3. **Ajustar níveis** (pico: -6dB)
4. **Aplicar efeitos**:
   - Compressor leve
   - Redução de ruído (se necessário)
   - EQ para clareza vocal

### Música de Fundo
1. **Selecionar música** adequada (ritmo suave, profissional)
2. **Ajustar volume** (pico: -12dB, abaixo da narração)
3. **Fade in/out** no início e fim (duração: 1s)
4. **Sincronizar** com pontos-chave do vídeo

## Legendas

1. **Criar legendas** para toda a narração
2. **Estilo**:
   - Fonte: Roboto Medium
   - Tamanho: 14pt
   - Cor: Branco (#FFFFFF)
   - Contorno: Preto fino (1px)
   - Posição: Parte inferior da tela
3. **Timing**: Sincronizar precisamente com a narração

## Exportação

### Versão para Revisão
1. **Configurações**:
   - Resolução: 1080x1920
   - Codec: H.264
   - Bitrate: 5 Mbps
   - Formato: MP4
2. **Nomear**: Acucaradas_Preview_REVIEW_v1.mp4

### Versão Final para Android
1. **Configurações**:
   - Resolução: 1080x1920
   - Codec: H.264
   - Bitrate: 8-10 Mbps
   - Formato: MP4
   - Áudio: AAC, 48kHz, Stereo
2. **Nomear**: app_preview.mp4
3. **Salvar em**: `store_assets/promotional_graphics/app_preview.mp4`

### Versão Final para iOS (opcional)
1. **Configurações**:
   - Resolução: 1242x2688
   - Demais configurações iguais à versão Android
2. **Nomear**: app_preview_ios.mp4
3. **Salvar em**: `store_assets/promotional_graphics/app_preview_ios.mp4`

## Verificação Final

### Checklist de Qualidade
1. **Verificar duração total** (25-30 segundos)
2. **Verificar transições** entre todas as cenas
3. **Verificar sincronização** de áudio e vídeo
4. **Verificar legibilidade** de todos os textos
5. **Verificar qualidade de imagem** em tela cheia
6. **Verificar níveis de áudio** (narração e música)
7. **Verificar tamanho do arquivo** (ideal: menos de 8MB para Google Play)

### Testes
1. **Reproduzir em diferentes dispositivos**:
   - Smartphone Android
   - Smartphone iOS
   - Tablet
   - Desktop
2. **Verificar em diferentes players**:
   - VLC
   - Windows Media Player
   - QuickTime

## Backup e Entrega

1. **Salvar projeto completo** com todos os arquivos originais
2. **Criar backup** em local seguro
3. **Documentar processo** de edição para referência futura
4. **Entregar arquivo final** no formato e local especificados

## Observações Finais

- Mantenha o vídeo **dinâmico mas não frenético**
- Garanta que todas as **informações importantes** sejam legíveis
- Mantenha **consistência visual** com a identidade da marca
- Certifique-se de que o vídeo **funciona mesmo sem áudio**
- Verifique se o vídeo atende a **todos os requisitos** da Google Play Store