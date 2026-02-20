/**
 * Script para verificar e gerar assets gráficos para publicação nas lojas
 * Este script verifica quais assets estão pendentes e gera assets básicos
 * que podem ser usados como base para a criação dos assets finais.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Cores para console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Exibe uma mensagem formatada no console
 * @param {string} message - A mensagem a ser exibida
 * @param {string} type - O tipo de mensagem (info, success, error, warning)
 */
function logMessage(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  let color;
  let prefix;

  switch (type) {
    case 'success':
      color = colors.green;
      prefix = '✓';
      break;
    case 'error':
      color = colors.red;
      prefix = '✗';
      break;
    case 'warning':
      color = colors.yellow;
      prefix = '⚠';
      break;
    default:
      color = colors.blue;
      prefix = 'ℹ';
  }

  console.log(`${color}${prefix} ${timestamp} - ${message}${colors.reset}`);
}

// Configuração de caminhos
const rootDir = process.cwd();
const storeAssetsDir = path.join(rootDir, 'store_assets');
const screenshotsAndroidDir = path.join(storeAssetsDir, 'screenshots_android');
const screenshotsIOSDir = path.join(storeAssetsDir, 'screenshots_ios');
const promotionalGraphicsDir = path.join(storeAssetsDir, 'promotional_graphics');

// Verifica se um diretório existe, se não, cria-o
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logMessage(`Diretório criado: ${dir}`, 'success');
  }
}

// Verifica se um arquivo existe
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Lista as dimensões requeridas para os screenshots
const requiredScreenshots = {
  android: [
    { name: 'home', description: 'Tela inicial', size: '1080x1920' },
    { name: 'catalog', description: 'Catálogo de produtos', size: '1080x1920' },
    { name: 'product_detail', description: 'Detalhes do produto', size: '1080x1920' },
    { name: 'cart', description: 'Carrinho de compras', size: '1080x1920' },
    { name: 'checkout', description: 'Finalização de compra', size: '1080x1920' },
    { name: 'orders', description: 'Histórico de pedidos', size: '1080x1920' },
  ],
  ios: [
    { name: 'home', description: 'Tela inicial', size: '1242x2688', device: 'iphone_xs_max' },
    {
      name: 'catalog',
      description: 'Catálogo de produtos',
      size: '1242x2688',
      device: 'iphone_xs_max',
    },
    {
      name: 'product_detail',
      description: 'Detalhes do produto',
      size: '1242x2688',
      device: 'iphone_xs_max',
    },
    {
      name: 'cart',
      description: 'Carrinho de compras',
      size: '1242x2688',
      device: 'iphone_xs_max',
    },
    {
      name: 'checkout',
      description: 'Finalização de compra',
      size: '1242x2688',
      device: 'iphone_xs_max',
    },
    {
      name: 'orders',
      description: 'Histórico de pedidos',
      size: '1242x2688',
      device: 'iphone_xs_max',
    },
    {
      name: 'home_ipad',
      description: 'Tela inicial (iPad)',
      size: '2048x2732',
      device: 'ipad_pro',
    },
    { name: 'catalog_ipad', description: 'Catálogo (iPad)', size: '2048x2732', device: 'ipad_pro' },
    { name: 'cart_ipad', description: 'Carrinho (iPad)', size: '2048x2732', device: 'ipad_pro' },
  ],
};

// Lista os assets promocionais necessários
const promotionalAssets = [
  { name: 'feature_graphic', description: 'Feature Graphic (Play Store)', size: '1024x500' },
  { name: 'promo_banner', description: 'Banner Promocional', size: '1200x630' },
  { name: 'newsletter_banner', description: 'Banner para Newsletter', size: '600x300' },
  { name: 'app_icon_hi_res', description: 'Ícone de Alta Resolução', size: '512x512' },
];

// Verifica quais screenshots estão faltando
function checkMissingScreenshots() {
  logMessage('Verificando screenshots pendentes...', 'info');

  const missing = {
    android: [],
    ios: [],
  };

  // Verifica screenshots Android
  requiredScreenshots.android.forEach(screenshot => {
    const pngFilename = `screenshot_${screenshot.name}_${screenshot.size}.png`;
    const jpgFilename = `screenshot_${screenshot.name}_${screenshot.size}.jpg`;
    const svgFilename = `screenshot_${screenshot.name}_${screenshot.size}.svg`;

    const pngPath = path.join(screenshotsAndroidDir, pngFilename);
    const jpgPath = path.join(screenshotsAndroidDir, jpgFilename);
    const svgPath = path.join(screenshotsAndroidDir, svgFilename);

    if (!fileExists(pngPath) && !fileExists(jpgPath) && !fileExists(svgPath)) {
      missing.android.push({
        ...screenshot,
        filename: pngFilename,
      });
    }
  });

  // Verifica screenshots iOS
  requiredScreenshots.ios.forEach(screenshot => {
    const pngFilename = `screenshot_${screenshot.name}_${screenshot.device}.png`;
    const jpgFilename = `screenshot_${screenshot.name}_${screenshot.device}.jpg`;
    const svgFilename = `screenshot_${screenshot.name}_${screenshot.device}.svg`;

    const pngPath = path.join(screenshotsIOSDir, pngFilename);
    const jpgPath = path.join(screenshotsIOSDir, jpgFilename);
    const svgPath = path.join(screenshotsIOSDir, svgFilename);

    if (!fileExists(pngPath) && !fileExists(jpgPath) && !fileExists(svgPath)) {
      missing.ios.push({
        ...screenshot,
        filename: pngFilename,
      });
    }
  });

  return missing;
}

// Verifica quais assets promocionais estão faltando
function checkMissingPromotionalAssets() {
  logMessage('Verificando assets promocionais pendentes...', 'info');

  const missing = [];

  promotionalAssets.forEach(asset => {
    const pngFilename = `${asset.name}_${asset.size}.png`;
    const jpgFilename = `${asset.name}_${asset.size}.jpg`;
    const svgFilename = `${asset.name}_${asset.size}.svg`;

    const pngPath = path.join(promotionalGraphicsDir, pngFilename);
    const jpgPath = path.join(promotionalGraphicsDir, jpgFilename);
    const svgPath = path.join(promotionalGraphicsDir, svgFilename);

    if (!fileExists(pngPath) && !fileExists(jpgPath) && !fileExists(svgPath)) {
      missing.push({
        ...asset,
        filename: pngFilename,
      });
    }
  });

  return missing;
}

// Cria um arquivo de placeholder para um screenshot
function createScreenshotPlaceholder(platform, screenshot) {
  const targetDir = platform === 'android' ? screenshotsAndroidDir : screenshotsIOSDir;
  const templateFile =
    platform === 'android'
      ? path.join(storeAssetsDir, 'screenshot_template_android.html')
      : path.join(storeAssetsDir, 'screenshot_template.html');

  // Verifica se o template existe
  if (!fileExists(templateFile)) {
    logMessage(`Template não encontrado: ${templateFile}`, 'error');
    return false;
  }

  // Lê o template
  let templateContent = fs.readFileSync(templateFile, 'utf8');

  // Modifica o template
  const [width, height] = screenshot.size.split('x');
  templateContent = templateContent
    .replace(/\{\{TITLE\}\}/g, `Açucaradas - ${screenshot.description}`)
    .replace(/\{\{SCREEN_NAME\}\}/g, screenshot.description)
    .replace(/\{\{WIDTH\}\}/g, width)
    .replace(/\{\{HEIGHT\}\}/g, height);

  // Nome do arquivo HTML
  const deviceSuffix = platform === 'ios' && screenshot.device ? `_${screenshot.device}` : '';
  const htmlFilename = `screenshot_${screenshot.name}${deviceSuffix}.html`;
  const htmlPath = path.join(targetDir, htmlFilename);

  // Salva o arquivo HTML
  fs.writeFileSync(htmlPath, templateContent);
  logMessage(`Placeholder HTML criado: ${htmlPath}`, 'success');

  return true;
}

// Cria um arquivo de placeholder para um asset promocional
function createPromotionalAssetPlaceholder(asset) {
  const templateFile = path.join(storeAssetsDir, 'feature_graphic_template.html');

  // Verifica se o template existe
  if (!fileExists(templateFile)) {
    logMessage(`Template não encontrado: ${templateFile}`, 'error');
    return false;
  }

  // Lê o template
  let templateContent = fs.readFileSync(templateFile, 'utf8');

  // Modifica o template
  const [width, height] = asset.size.split('x');
  templateContent = templateContent
    .replace(/\{\{TITLE\}\}/g, `Açucaradas - ${asset.description}`)
    .replace(/\{\{ASSET_NAME\}\}/g, asset.description)
    .replace(/\{\{WIDTH\}\}/g, width)
    .replace(/\{\{HEIGHT\}\}/g, height);

  // Nome do arquivo HTML
  const htmlFilename = `${asset.name}_${asset.size}.html`;
  const htmlPath = path.join(promotionalGraphicsDir, htmlFilename);

  // Salva o arquivo HTML
  fs.writeFileSync(htmlPath, templateContent);
  logMessage(`Placeholder HTML criado: ${htmlPath}`, 'success');

  return true;
}

// Atualiza o arquivo ASSETS_PENDENTES.md com o status atual
function updateAssetsPendentesFile(missingScreenshots, missingPromotionalAssets) {
  const assetsPendentesPath = path.join(storeAssetsDir, 'ASSETS_PENDENTES.md');
  let content = `# Assets Gráficos Pendentes para Publicação (Atualizado)

Este documento lista os assets gráficos que ainda precisam ser criados antes da publicação do aplicativo Açucaradas Encomendas nas lojas.

## Google Play Store (Android)

### Screenshots (armazenar em \`/store_assets/screenshots_android/\`)
`;

  // Adiciona screenshots Android pendentes
  if (missingScreenshots.android.length > 0) {
    missingScreenshots.android.forEach(screenshot => {
      content += `- [ ] Screenshot da ${screenshot.description} (${screenshot.size})\n`;
    });
  } else {
    content += `- [x] Todos os screenshots Android foram criados!\n`;
  }

  content += `
### Gráfico de Recursos (Feature Graphic - 1024 x 500px)
`;

  // Verifica se o Feature Graphic está pendente
  const featureGraphic = missingPromotionalAssets.find(asset => asset.name === 'feature_graphic');
  if (featureGraphic) {
    content += `- [ ] Gráfico de Recursos para a Play Store (armazenar em \`/store_assets/promotional_graphics/feature_graphic.jpg\`)\n`;
  } else {
    content += `- [x] Gráfico de Recursos criado!\n`;
  }

  content += `
## App Store (iOS)

### Screenshots (armazenar em \`/store_assets/screenshots_ios/\`)
#### iPhone 6.5" Display (1242 x 2688px)
`;

  // Filtra screenshots iOS para iPhone
  const iPhoneScreenshots = missingScreenshots.ios.filter(
    s => s.device && s.device.includes('iphone')
  );
  if (iPhoneScreenshots.length > 0) {
    iPhoneScreenshots.forEach(screenshot => {
      content += `- [ ] Screenshot da ${screenshot.description}\n`;
    });
  } else {
    content += `- [x] Todos os screenshots de iPhone foram criados!\n`;
  }

  content += `
#### iPad 12.9" Display (2048 x 2732px)
`;

  // Filtra screenshots iOS para iPad
  const iPadScreenshots = missingScreenshots.ios.filter(s => s.device && s.device.includes('ipad'));
  if (iPadScreenshots.length > 0) {
    iPadScreenshots.forEach(screenshot => {
      content += `- [ ] Screenshot da ${screenshot.description}\n`;
    });
  } else {
    content += `- [x] Todos os screenshots de iPad foram criados!\n`;
  }

  content += `
### App Preview Video
- [ ] Vídeo de 15-30 segundos mostrando as principais funcionalidades do app

## Outros Assets

### Banner Promocional (armazenar em \`/store_assets/promotional_graphics/\`)
`;

  // Verifica banners promocionais
  const promoBanner = missingPromotionalAssets.find(asset => asset.name === 'promo_banner');
  const newsletterBanner = missingPromotionalAssets.find(
    asset => asset.name === 'newsletter_banner'
  );

  if (promoBanner) {
    content += `- [ ] Banner para site e redes sociais (${promoBanner.size})\n`;
  } else {
    content += `- [x] Banner para site e redes sociais criado!\n`;
  }

  if (newsletterBanner) {
    content += `- [ ] Banner para newsletter (${newsletterBanner.size})\n`;
  } else {
    content += `- [x] Banner para newsletter criado!\n`;
  }

  content += `
### Logotipo
- [ ] Logotipo com fundo transparente (PNG)
- [ ] Logotipo em vetor (SVG/AI)

## Especificações de Cores e Fontes

### Cores
- Rosa principal: \`#FF69B4\`
- Texto escuro: \`#333333\`
- Fundo claro: \`#FFFFFF\`
- Destaque: \`#FFD700\`

### Fontes
- Título: Montserrat Bold
- Texto: Roboto Regular

## Instruções para Criação dos Assets

1. Use os templates HTML criados como base para os screenshots e assets promocionais
2. Mantenha consistência visual entre todos os assets
3. Assegure-se de que os textos sejam legíveis em tamanhos menores
4. Evite colocar informações importantes próximas às bordas
5. Mantenha os arquivos otimizados para web (menos de 1MB por imagem)

## Prazos

- Data limite para entregar os screenshots: 01/05/2025
- Data limite para entregar o gráfico de recursos: 05/05/2025
- Data limite para entregar o vídeo de preview: 10/05/2025

---

Atualizado em: ${new Date().toLocaleDateString()} - Total de ${missingScreenshots.android.length + missingScreenshots.ios.length} screenshots e ${missingPromotionalAssets.length} assets promocionais pendentes.
`;

  fs.writeFileSync(assetsPendentesPath, content);
  logMessage(`Arquivo de assets pendentes atualizado: ${assetsPendentesPath}`, 'success');
}

// Função principal
async function main() {
  try {
    logMessage('Iniciando verificação de assets gráficos para publicação nas lojas...', 'info');

    // Garante que os diretórios existam
    ensureDirectoryExists(screenshotsAndroidDir);
    ensureDirectoryExists(screenshotsIOSDir);
    ensureDirectoryExists(promotionalGraphicsDir);

    // Verifica quais screenshots estão faltando
    const missingScreenshots = checkMissingScreenshots();
    if (missingScreenshots.android.length === 0 && missingScreenshots.ios.length === 0) {
      logMessage('Todos os screenshots necessários já foram criados!', 'success');
    } else {
      logMessage(
        `Faltam ${missingScreenshots.android.length} screenshots para Android e ${missingScreenshots.ios.length} para iOS`,
        'warning'
      );

      // Cria placeholders para screenshots Android
      if (missingScreenshots.android.length > 0) {
        logMessage('Criando placeholders para screenshots Android...', 'info');
        missingScreenshots.android.forEach(screenshot => {
          createScreenshotPlaceholder('android', screenshot);
        });
      }

      // Cria placeholders para screenshots iOS
      if (missingScreenshots.ios.length > 0) {
        logMessage('Criando placeholders para screenshots iOS...', 'info');
        missingScreenshots.ios.forEach(screenshot => {
          createScreenshotPlaceholder('ios', screenshot);
        });
      }
    }

    // Verifica quais assets promocionais estão faltando
    const missingPromotionalAssets = checkMissingPromotionalAssets();
    if (missingPromotionalAssets.length === 0) {
      logMessage('Todos os assets promocionais necessários já foram criados!', 'success');
    } else {
      logMessage(`Faltam ${missingPromotionalAssets.length} assets promocionais`, 'warning');

      // Cria placeholders para assets promocionais
      logMessage('Criando placeholders para assets promocionais...', 'info');
      missingPromotionalAssets.forEach(asset => {
        createPromotionalAssetPlaceholder(asset);
      });
    }

    // Atualiza o arquivo ASSETS_PENDENTES.md
    updateAssetsPendentesFile(missingScreenshots, missingPromotionalAssets);

    logMessage('Verificação e geração de placeholders para assets concluída!', 'success');
    logMessage('Próximos passos:', 'info');
    logMessage('1. Edite os arquivos HTML gerados para criar os screenshots', 'info');
    logMessage(
      '2. Converta-os para PNG/JPG usando um navegador ou ferramenta de conversão',
      'info'
    );
    logMessage('3. Coloque-os nos diretórios corretos conforme especificado', 'info');
    logMessage('4. Execute este script novamente para verificar o progresso', 'info');
  } catch (error) {
    logMessage(`Erro: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Executar função principal
main();
