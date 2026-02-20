#!/bin/bash

# Script para preparar a build do iOS para produção
# Este script deve ser executado antes de iniciar o build EAS

# Verificar se estamos no ambiente de produção
if [ "$EXPO_PUBLIC_APP_ENV" = "production" ]; then
  echo "Preparando ambiente de produção para iOS..."
  
  # Criar diretório iOS se não existir
  mkdir -p ios
  
  # Copiar GoogleService-Info.plist para a pasta iOS
  echo "Copiando GoogleService-Info.plist para pasta iOS..."
  cp GoogleService-Info.prod.plist ios/GoogleService-Info.plist
  
  # Verificar se o arquivo de entitlements existe
  if [ ! -f ios/my-app.entitlements ]; then
    echo "Criando arquivo de entitlements para iOS..."
    cat > ios/my-app.entitlements << 'EOL'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>aps-environment</key>
	<string>production</string>
	<key>com.apple.developer.applesignin</key>
	<array>
		<string>Default</string>
	</array>
</dict>
</plist>
EOL
  fi
  
  echo "Configuração de iOS para produção concluída!"
else
  echo "Usando configuração de desenvolvimento para iOS..."
  
  # Criar diretório iOS se não existir
  mkdir -p ios
  
  # Copiar GoogleService-Info.plist de desenvolvimento para a pasta iOS
  echo "Copiando GoogleService-Info.plist de desenvolvimento..."
  cp GoogleService-Info.dev.plist ios/GoogleService-Info.plist
  
  # Configurar entitlements para desenvolvimento
  echo "Criando arquivo de entitlements para iOS (desenvolvimento)..."
  cat > ios/my-app.entitlements << 'EOL'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>aps-environment</key>
	<string>development</string>
	<key>com.apple.developer.applesignin</key>
	<array>
		<string>Default</string>
	</array>
</dict>
</plist>
EOL
fi

echo "Script de pré-build concluído com sucesso!"
exit 0 