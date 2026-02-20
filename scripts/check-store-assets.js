const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const sizeOf = promisify(require('image-size'));

// Códigos de saída
const EXIT_SUCCESS = 0;
const EXIT_ERROR = 1;
const EXIT_WARNING = 2;

// Cores para console
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

// Contador de problemas
let problemCount = 0;
let warningCount = 0;

// Diretorios de assets
const ASSETS_DIR = 'assets/store';
const ANDROID_DIR = path.join(ASSETS_DIR, 'android');
const IOS_DIR = path.join(ASSETS_DIR, 'ios');

// Especificações dos assets
const ASSETS_SPECS = {
  android: {
    icon: { width: 512, height: 512, required: true },
    featureGraphic: { width: 1024, height: 500, required: true },
    promoGraphic: { width: 1024, height: 500, required: false },
    screenshots: { minCount: 2, sizes: [{ width: 1920, height: 1080 }] },
  },
  ios: {
    icon: { width: 1024, height: 1024, required: true },
    screenshots: {
      minCount: 3,
      sizes: [
        { width: 1284, height: 2778 }, // iPhone 12 Pro Max
        { width: 1170, height: 2532 }, // iPhone 12, 12 Pro
        { width: 1242, height: 2688 }, // iPhone 11 Pro Max, XS Max
      ],
    },
  },
  common: {
    appPreviewVideo: { required: false, maxDuration: 30 }, // em segundos
  },
};

/**
 * Exibir mensagem de sucesso
 */
function logSuccess(message) {
  console.log(`${GREEN}✓ ${message}${RESET}`);
}

/**
 * Exibir mensagem de erro
 */
function logError(message) {
  console.log(`${RED}✗ ${message}${RESET}`);
  problemCount++;
}

/**
 * Exibir mensagem de aviso
 */
function logWarning(message) {
  console.log(`${YELLOW}! ${message}${RESET}`);
  warningCount++;
}

/**
 * Exibir título de seção
 */
function logSection(title) {
  console.log(`\n${BLUE}### ${title} ###${RESET}\n`);
}

/**
 * Verifica se um diretório existe
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    logError(`Diretório ${dirPath} não encontrado`);
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      logWarning(`Diretório ${dirPath} foi criado automaticamente, adicione seus assets nele`);
    } catch (err) {
      logError(`Falha ao criar diretório ${dirPath}: ${err.message}`);
      return false;
    }
  }
  return true;
}

/**
 * Verifica a existência e dimensões de um arquivo de imagem
 */
async function checkImageFile(filePath, expectedWidth, expectedHeight, isRequired = true) {
  if (!fs.existsSync(filePath)) {
    if (isRequired) {
      logError(`Arquivo necessário não encontrado: ${filePath}`);
      return false;
    } else {
      logWarning(`Arquivo opcional não encontrado: ${filePath}`);
      return false;
    }
  }

  try {
    const dimensions = await sizeOf(filePath);
    const fileSize = fs.statSync(filePath).size / (1024 * 1024); // tamanho em MB

    if (expectedWidth && expectedHeight) {
      if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
        logError(
          `Dimensões incorretas para ${filePath}: esperado ${expectedWidth}x${expectedHeight}, encontrado ${dimensions.width}x${dimensions.height}`
        );
        return false;
      } else {
        logSuccess(`${filePath} tem dimensões corretas: ${dimensions.width}x${dimensions.height}`);
      }
    } else {
      logSuccess(`${filePath} encontrado (${dimensions.width}x${dimensions.height})`);
    }

    // Verificar se o arquivo não é muito grande (limite de 2MB para exemplo)
    if (fileSize > 2) {
      logWarning(
        `${filePath} é muito grande (${fileSize.toFixed(2)}MB). Considere otimizar para menos de 2MB.`
      );
    }

    return true;
  } catch (error) {
    logError(`Erro ao analisar imagem ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Verifica os screenshots
 */
async function checkScreenshots(dir, specs) {
  const screenshotFiles = fs
    .readdirSync(dir)
    .filter(
      file =>
        file.toLowerCase().includes('screenshot') &&
        (file.endsWith('.png') || file.endsWith('.jpg'))
    );

  if (screenshotFiles.length < specs.minCount) {
    logError(
      `Número insuficiente de screenshots em ${dir}: encontrados ${screenshotFiles.length}, mínimo necessário: ${specs.minCount}`
    );
    return false;
  } else {
    logSuccess(`Número suficiente de screenshots encontrados: ${screenshotFiles.length}`);
  }

  // Verificar dimensões de cada screenshot
  for (const file of screenshotFiles) {
    const filePath = path.join(dir, file);
    const dimensions = await sizeOf(filePath);

    const matchesDimensions = specs.sizes.some(
      size =>
        (dimensions.width === size.width && dimensions.height === size.height) ||
        (dimensions.width === size.height && dimensions.height === size.width) // Orientação em paisagem e retrato
    );

    if (!matchesDimensions) {
      const expectedSizes = specs.sizes.map(size => `${size.width}x${size.height}`).join(', ');
      logWarning(
        `Screenshot ${file} tem dimensões incompatíveis (${dimensions.width}x${dimensions.height}). Dimensões esperadas: ${expectedSizes}`
      );
    } else {
      logSuccess(
        `Screenshot ${file} tem dimensões compatíveis: ${dimensions.width}x${dimensions.height}`
      );
    }
  }

  return true;
}

/**
 * Verifica o vídeo de preview
 */
function checkAppPreviewVideo(dir) {
  const videoFiles = fs
    .readdirSync(dir)
    .filter(
      file =>
        file.toLowerCase().includes('preview') && (file.endsWith('.mp4') || file.endsWith('.mov'))
    );

  if (videoFiles.length === 0) {
    logWarning(
      `Nenhum vídeo de preview encontrado em ${dir}. Embora opcional, é recomendado para melhorar a conversão na loja.`
    );
    return false;
  } else if (videoFiles.length > 1) {
    logWarning(
      `Múltiplos vídeos de preview encontrados em ${dir}. Verifique se todos serão usados.`
    );
  }

  // Verificação básica do tamanho do arquivo (não podemos verificar duração sem bibliotecas adicionais)
  for (const file of videoFiles) {
    const filePath = path.join(dir, file);
    const fileSize = fs.statSync(filePath).size / (1024 * 1024); // tamanho em MB

    if (fileSize > 50) {
      logWarning(
        `Vídeo ${file} é muito grande (${fileSize.toFixed(2)}MB). As lojas podem ter limitações de tamanho.`
      );
    } else {
      logSuccess(`Vídeo ${file} encontrado (${fileSize.toFixed(2)}MB)`);
    }
  }

  return true;
}

/**
 * Verificar assets para Android
 */
async function checkAndroidAssets() {
  logSection('Verificando assets para Android');

  if (!ensureDirectoryExists(ANDROID_DIR)) {
    return false;
  }

  // Verificar ícone
  await checkImageFile(
    path.join(ANDROID_DIR, 'icon.png'),
    ASSETS_SPECS.android.icon.width,
    ASSETS_SPECS.android.icon.height,
    ASSETS_SPECS.android.icon.required
  );

  // Verificar Feature Graphic
  await checkImageFile(
    path.join(ANDROID_DIR, 'feature_graphic.png'),
    ASSETS_SPECS.android.featureGraphic.width,
    ASSETS_SPECS.android.featureGraphic.height,
    ASSETS_SPECS.android.featureGraphic.required
  );

  // Verificar Promo Graphic
  await checkImageFile(
    path.join(ANDROID_DIR, 'promo_graphic.png'),
    ASSETS_SPECS.android.promoGraphic.width,
    ASSETS_SPECS.android.promoGraphic.height,
    ASSETS_SPECS.android.promoGraphic.required
  );

  // Verificar screenshots
  const screenshotsDir = path.join(ANDROID_DIR, 'screenshots');
  if (ensureDirectoryExists(screenshotsDir)) {
    await checkScreenshots(screenshotsDir, ASSETS_SPECS.android.screenshots);
  }

  // Verificar vídeo de preview
  checkAppPreviewVideo(ANDROID_DIR);
}

/**
 * Verificar assets para iOS
 */
async function checkIosAssets() {
  logSection('Verificando assets para iOS');

  if (!ensureDirectoryExists(IOS_DIR)) {
    return false;
  }

  // Verificar ícone
  await checkImageFile(
    path.join(IOS_DIR, 'icon.png'),
    ASSETS_SPECS.ios.icon.width,
    ASSETS_SPECS.ios.icon.height,
    ASSETS_SPECS.ios.icon.required
  );

  // Verificar screenshots
  const screenshotsDir = path.join(IOS_DIR, 'screenshots');
  if (ensureDirectoryExists(screenshotsDir)) {
    await checkScreenshots(screenshotsDir, ASSETS_SPECS.ios.screenshots);
  }

  // Verificar vídeo de preview
  checkAppPreviewVideo(IOS_DIR);
}

/**
 * Exibir resumo das verificações
 */
function showSummary() {
  logSection('Resumo da verificação de assets');

  if (problemCount === 0 && warningCount === 0) {
    console.log(`${GREEN}Todos os assets estão presentes e com as dimensões corretas.${RESET}`);
    return EXIT_SUCCESS;
  } else if (problemCount > 0) {
    console.log(
      `${RED}Foram encontrados ${problemCount} problemas críticos e ${warningCount} avisos com os assets da loja.${RESET}`
    );
    console.log(
      `${YELLOW}Consulte o arquivo GUIA_ASSETS_LOJA.md para instruções sobre como criar os assets necessários.${RESET}`
    );
    return EXIT_ERROR;
  } else {
    console.log(`${YELLOW}Foram encontrados ${warningCount} avisos com os assets da loja.${RESET}`);
    console.log(
      `${YELLOW}Recomenda-se revisar esses avisos para melhorar a apresentação do aplicativo nas lojas.${RESET}`
    );
    return EXIT_WARNING;
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('Iniciando verificação de assets para lojas de aplicativos...\n');

  // Verificar se o diretório raiz existe
  ensureDirectoryExists(ASSETS_DIR);

  // Executar verificações
  await checkAndroidAssets();
  await checkIosAssets();

  // Mostrar resumo e definir código de saída
  const exitCode = showSummary();
  process.exit(exitCode);
}

// Executar script principal
main().catch(error => {
  console.error(`${RED}Erro ao executar verificação: ${error.message}${RESET}`);
  process.exit(EXIT_ERROR);
});
