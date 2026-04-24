
$babelPackages = @(
    "plugin-transform-block-scoping@7.23.4",
    "helper-create-class-features-plugin@7.23.10",
    "helper-create-regexp-features-plugin@7.22.15",
    "plugin-transform-unicode-regex@7.23.3",
    "helper-skip-transparent-expression-wrappers@7.22.5",
    "helper-replace-supers@7.22.20",
    "plugin-proposal-class-properties@7.18.6",
    "plugin-proposal-nullish-coalescing-operator@7.18.6",
    "plugin-proposal-optional-chaining@7.21.0",
    "plugin-transform-arrow-functions@7.23.3",
    "plugin-transform-shorthand-properties@7.23.3",
    "plugin-transform-template-literals@7.23.3",
    "plugin-transform-computed-properties@7.23.3",
    "plugin-transform-for-of@7.23.6",
    "plugin-transform-spread@7.23.3",
    "plugin-transform-parameters@7.23.3",
    "plugin-transform-destructuring@7.23.3",
    "plugin-transform-react-jsx@7.23.4",
    "plugin-transform-react-display-name@7.23.3",
    "plugin-transform-flow-strip-types@7.23.3",
    "plugin-syntax-flow@7.23.3",
    "plugin-transform-modules-commonjs@7.23.3",
    "helper-plugin-utils@7.24.0",
    "helper-annotate-as-pure@7.22.5",
    "helper-compilation-targets@7.23.6",
    "helper-function-name@7.23.0",
    "helper-member-expression-to-functions@7.23.0",
    "helper-optimise-call-expression@7.22.5",
    "helper-remap-async-to-generator@7.22.20",
    "helper-simple-access@7.22.5",
    "helper-split-export-declaration@7.22.6",
    "helper-validator-identifier@7.22.20",
    "helper-validator-option@7.23.5",
    "helper-wrap-function@7.22.20"
)

$targetDir = "..\node_modules\@babel"

if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir
}

foreach ($pkg in $babelPackages) {
    $name = $pkg -split "@" | Select-Object -First 1
    $version = $pkg -split "@" | Select-Object -Last 1
    $fullName = "@babel/$pkg"
    
    Write-Host "Processando $fullName..."
    
    # Pack
    npm pack $fullName --quiet
    
    # Find tgz
    $tgzPattern = "babel-$name-$version.tgz"
    $tgzFile = Get-ChildItem -Filter "babel-$name-*.tgz" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if ($tgzFile) {
        $destPath = Join-Path $targetDir $name
        
        # CLEANUP FIRST: Remove existing directory to avoid conflicts and ensure clean install
        if (Test-Path $destPath) {
            Write-Host "Removendo versão antiga em $destPath..."
            Remove-Item $destPath -Recurse -Force
        }
        
        New-Item -ItemType Directory -Force -Path $destPath | Out-Null
        
        Write-Host "Extraindo $tgzFile para $destPath..."
        tar -xf $tgzFile.Name -C $destPath
        
        # Move contents from package/ to destPath root
        $packageDir = Join-Path $destPath "package"
        if (Test-Path $packageDir) {
            Get-ChildItem "$packageDir\*" -Recurse | Move-Item -Destination $destPath -Force
            Remove-Item $packageDir -Recurse -Force
        }
    } else {
        Write-Host "ERRO: Não foi possível encontrar o arquivo tgz para $fullName"
    }
}

Write-Host "Concluído!"
