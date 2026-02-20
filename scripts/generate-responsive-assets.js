const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configurações de diretórios
const sourceDir = path.join(__dirname, '../assets/icons');
const outputBaseDir = path.join(__dirname, '../assets/generated');
const sizeConfigs = {
  mdpi: { factor: 1, folder: 'drawable-mdpi' },
  hdpi: { factor: 1.5, folder: 'drawable-hdpi' },
  xhdpi: { factor: 2, folder: 'drawable-xhdpi' },
  xxhdpi: { factor: 3, folder: 'drawable-xxhdpi' },
  xxxhdpi: { factor: 4, folder: 'drawable-xxxhdpi' },
};

// Tamanhos para ícones iOS
const iosSizes = [
  { size: 20, scales: [1, 2, 3] },
  { size: 29, scales: [1, 2, 3] },
  { size: 40, scales: [1, 2, 3] },
  { size: 60, scales: [2, 3] },
  { size: 76, scales: [1, 2] },
  { size: 83.5, scales: [2] },
  { size: 1024, scales: [1] }, // App Store
];

// Certificar que diretórios existem
const ensureDir = dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Processar imagens para Android
const processAndroidIcons = async () => {
  console.log('Processando ícones para Android...');

  // Criar diretórios de saída
  Object.values(sizeConfigs).forEach(config => {
    const outputDir = path.join(outputBaseDir, 'android', config.folder);
    ensureDir(outputDir);
  });

  // Encontrar todos os ícones PNG e SVG
  const iconFiles = glob.sync(`${sourceDir}/**/*.{png,svg}`);

  for (const iconFile of iconFiles) {
    const filename = path.basename(iconFile);
    const name = path.parse(filename).name;

    // Usar sharp para redimensionar
    for (const [density, config] of Object.entries(sizeConfigs)) {
      const outputFile = path.join(outputBaseDir, 'android', config.folder, `${name}.png`);

      try {
        // Obter informações da imagem original
        const metadata = await sharp(iconFile).metadata();
        const originalWidth = metadata.width;

        // Calcular novo tamanho
        const newWidth = Math.round(originalWidth * config.factor);

        // Redimensionar
        await sharp(iconFile).resize(newWidth).toFile(outputFile);

        console.log(`Gerado: ${outputFile}`);
      } catch (error) {
        console.error(`Erro ao processar ${iconFile} para ${density}:`, error);
      }
    }
  }
};

// Processar imagens para iOS
const processIosIcons = async () => {
  console.log('Processando ícones para iOS...');

  // Criar diretório de saída
  const outputDir = path.join(outputBaseDir, 'ios');
  ensureDir(outputDir);

  // Encontrar todos os ícones
  const iconFiles = glob.sync(`${sourceDir}/**/*.{png,svg}`);

  for (const iconFile of iconFiles) {
    const filename = path.basename(iconFile);
    const name = path.parse(filename).name;

    // Gerar todos os tamanhos necessários para iOS
    for (const sizeConfig of iosSizes) {
      for (const scale of sizeConfig.scales) {
        const size = sizeConfig.size * scale;
        const outputFile = path.join(outputDir, `${name}-${sizeConfig.size}@${scale}x.png`);

        try {
          await sharp(iconFile).resize(size, size).toFile(outputFile);

          console.log(`Gerado: ${outputFile}`);
        } catch (error) {
          console.error(
            `Erro ao processar ${iconFile} para iOS ${sizeConfig.size}@${scale}x:`,
            error
          );
        }
      }
    }
  }
};

// Função principal
const generateResponsiveAssets = async () => {
  try {
    ensureDir(outputBaseDir);

    // Processar para Android e iOS
    await processAndroidIcons();
    await processIosIcons();

    console.log('Geração de assets concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar assets:', error);
    process.exit(1);
  }
};

// Executar
generateResponsiveAssets();
