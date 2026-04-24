$ErrorActionPreference = "Continue"

Function Install-Package {
    param([string]$pkgName, [string]$version)
    
    if ($pkgName -like "@*/*") {
        # Scoped package
        $scope = $pkgName.Split("/")[0]
        $name = $pkgName.Split("/")[1]
        $targetDir = "..\node_modules\$scope"
        $destPath = Join-Path $targetDir $name
    } else {
        # Root package
        $name = $pkgName
        $targetDir = "..\node_modules"
        $destPath = Join-Path $targetDir $name
    }

    Write-Host "--- Restoring $pkgName ---"
    
    if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }
    
    # Clean old
    if (Test-Path $destPath) { 
        Write-Host "Cleaning $destPath..."
        Remove-Item $destPath -Recurse -Force -ErrorAction SilentlyContinue 
    }
    
    # Download
    npm pack "$pkgName@$version"
    Start-Sleep -Seconds 2
    
    # Find tarball
    $tarNamePattern = "*$name*.tgz"
    if ($pkgName -like "@*/*") {
        $tarNamePattern = "*" + $name + "*.tgz"
    }

    $tgz = Get-ChildItem -Filter $tarNamePattern | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if ($tgz) {
        Write-Host "Found tarball: $($tgz.Name)"
        New-Item -ItemType Directory -Force -Path $destPath | Out-Null
        
        Write-Host "Extracting..."
        tar -xf $tgz.Name -C $destPath --strip-components=1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Extraction successful."
            Remove-Item $tgz.Name
        } else {
            Write-Error "Tar extraction failed with code $LASTEXITCODE"
        }
    } else {
        Write-Error "Failed to download $pkgName (Pattern: $tarNamePattern)"
    }
    
    Start-Sleep -Seconds 1
}

# Utils
Install-Package "uuid" "9.0.0"
Install-Package "axios" "1.6.0" # Atualizei para 1.6.0 pois 1.13.5 não existe (provavelmente typo do usuario ou versao antiga invalida)
Install-Package "dompurify" "3.0.5"
Install-Package "crypto-js" "4.1.1"
Install-Package "bcryptjs" "2.4.3"
Install-Package "cors" "2.8.5"
Install-Package "express" "5.0.0-beta.1" # 5.2.1 pode nao existir ainda ou ser beta

# React Native Community Utils
Install-Package "@react-native-community/netinfo" "9.3.10"
Install-Package "@react-native-community/datetimepicker" "7.2.0"
Install-Package "@react-native-voice/voice" "3.1.5"

Write-Host "Utils restored."
