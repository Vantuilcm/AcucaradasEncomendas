#!/bin/bash

# 🍎 iOSNativePrivacyFixAI - Injetor Nativo de Info.plist
# Garante que as permissões obrigatórias estejam presentes no Info.plist nativo após o prebuild.

INFO_PLIST="ios/AucaradasEncomendas/Info.plist"

if [ ! -f "$INFO_PLIST" ]; then
    # Tentar localizar dinamicamente se o caminho fixo falhar
    INFO_PLIST=$(find ios -name "Info.plist" | grep -v "Tests" | head -n 1)
fi

if [ ! -f "$INFO_PLIST" ]; then
    echo "❌ [FATAL] Info.plist nativo não encontrado em 'ios/'"
    exit 1
fi

echo "💉 [PLIST] Injetando permissões obrigatórias em: $INFO_PLIST"

# Função para adicionar chave via PlistBuddy se não existir
add_privacy_key() {
    local key=$1
    local value=$2
    
    # Verificar se a chave já existe
    if /usr/libexec/PlistBuddy -c "Print :$key" "$INFO_PLIST" > /dev/null 2>&1; then
        echo "   - [EXISTE] $key"
    else
        echo "   + [ADD] $key"
        /usr/libexec/PlistBuddy -c "Add :$key string '$value'" "$INFO_PLIST"
    fi
}

# Permissões Obrigatórias Apple (Textos curtos e diretos para aceitação rápida)
add_privacy_key "NSSpeechRecognitionUsageDescription" "Este aplicativo utiliza o reconhecimento de voz para permitir buscas de produtos e navegação por voz."
add_privacy_key "NSLocationWhenInUseUsageDescription" "Sua localização é utilizada para exibir lojas próximas e calcular valores de entrega."
add_privacy_key "NSCameraUsageDescription" "O acesso à câmera permite capturar fotos para o seu perfil e pedidos."
add_privacy_key "NSPhotoLibraryUsageDescription" "O acesso à galeria permite selecionar fotos para o seu perfil e pedidos."
add_privacy_key "NSMicrophoneUsageDescription" "O acesso ao microfone é necessário para comandos de voz e buscas."

# Validação Final Nativa
echo "🔍 [VALIDATE] Validando injeção nativa..."
if /usr/libexec/PlistBuddy -c "Print :NSSpeechRecognitionUsageDescription" "$INFO_PLIST" > /dev/null 2>&1; then
    echo "✅ [SUCCESS] Info.plist nativo atualizado e validado."
else
    echo "❌ [ERROR] Falha ao injetar chaves no Info.plist nativo."
    exit 1
fi
