const fs = require('fs');
const path = require('path');

const podfilePath = path.join(process.cwd(), 'ios', 'Podfile');

if (fs.existsSync(podfilePath)) {
  let content = fs.readFileSync(podfilePath, 'utf8');

  if (!content.includes("sentry_enabled = ENV['SENTRY_ENABLED'] == '1'")) {
    const sentrySnippet = "\nsentry_enabled = ENV['SENTRY_ENABLED'] == '1'\nENV['SENTRY_SKIP_AUTO_INSTALL'] = '1' unless sentry_enabled\n";
    if (/^platform :ios.*$/m.test(content)) {
      content = content.replace(/^platform :ios.*$/m, (match) => `${match}${sentrySnippet}`);
    } else {
      content = `${sentrySnippet}\n${content}`;
    }
  }

  if (content.includes('use_expo_modules!') && !content.includes("use_expo_modules!(:exclude => ['expo-sentry', 'sentry-expo'])")) {
    content = content.replace(/^\s*use_expo_modules!\s*$/m, (match) => {
      return `if sentry_enabled\n  ${match}\nelse\n  use_expo_modules!(:exclude => ['expo-sentry', 'sentry-expo'])\nend`;
    });
  }

  // 1. Garantir que o target da extensão tenha as dependências do OneSignal
  if (!content.includes("target 'OneSignalNotificationServiceExtension'")) {
    console.log('Adicionando target OneSignalNotificationServiceExtension ao Podfile...');
    const targetExtension = `
target 'OneSignalNotificationServiceExtension' do
  pod 'OneSignalXCFramework', '>= 5.0.0', '< 6.0.0'
end

# Forçar o uso de frameworks dinâmicos para evitar conflitos de linkagem estática
use_frameworks! :linkage => :static
`;
    content += targetExtension;
  } else if (!content.includes("'OneSignalXCFramework'")) {
    console.log('Injetando pod OneSignalXCFramework no target existente...');
    content = content.replace(
      /target 'OneSignalNotificationServiceExtension' do/,
      "target 'OneSignalNotificationServiceExtension' do\n  pod 'OneSignalXCFramework', '>= 5.0.0', '< 6.0.0'"
    );
  }

  // 2. Este snippet corrige objetos órfãos no projeto Xcode que causam erro de consistência
  const fixSnippet = `
    # Fix para erro de consistência do OneSignal e outros (no parent for object)
    installer.aggregate_targets.each do |target|
      project = target.user_project
      
      # 1. Limpar build files órfãos
      project.objects.each do |obj|
        if obj.is_a?(Xcodeproj::Project::Object::PBXBuildFile)
          if obj.file_ref.nil?
            obj.remove_from_project
          elsif obj.file_ref.parent.nil?
            obj.remove_from_project
          end
        end
      end

      # 2. Corrigir inconsistência específica do NotificationService.m e OneSignal
      project.targets.each do |t|
        t.build_phases.each do |phase|
          if phase.is_a?(Xcodeproj::Project::Object::PBXSourcesBuildPhase)
            phase.files.each do |build_file|
              if build_file.file_ref && build_file.file_ref.path
                path_str = build_file.file_ref.path.to_s
                if path_str.include?('NotificationService.m') || path_str.include?('OneSignal')
                  if build_file.file_ref.parent.nil?
                    puts "Corrigindo inconsistência em #{t.name}: #{path_str}"
                    build_file.remove_from_project
                  end
                end
              end
            end
          end
        end
        
        # 3. Garantir que o target da extensão tenha as configurações corretas
        if t.name.include?('OneSignalNotificationServiceExtension')
          t.build_configurations.each do |config|
            config.build_settings['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
            config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
            config.build_settings['DEVELOPMENT_TEAM'] = '4G75MX4TPA'
            config.build_settings['CODE_SIGN_STYLE'] = 'Manual'
          end
        end
      end
      
      project.save
    end
  `;

  if (content.includes('post_install do |installer|')) {
    console.log('Aplicando fix de consistência no Podfile...');
    content = content.replace(
      'post_install do |installer|',
      'post_install do |installer|\n' + fixSnippet
    );
    fs.writeFileSync(podfilePath, content);
    console.log('Podfile atualizado com sucesso.');
  } else {
    console.log('Aviso: post_install não encontrado no Podfile.');
  }
} else {
  console.log('Erro: Podfile não encontrado em ios/Podfile');
  process.exit(1);
}
