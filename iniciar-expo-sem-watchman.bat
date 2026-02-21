@echo off
echo Iniciando Expo sem Watchman...

echo Limpando cache do Metro...
if exist ".metro-cache" (
    rmdir /s /q .metro-cache
    echo Cache do Metro removido.
)

echo Limpando cache do Expo...
if exist ".expo" (
    rmdir /s /q .expo
    echo Cache do Expo removido.
)

echo Iniciando Expo sem usar Watchman...
npx expo start --clear --no-watchman

pause