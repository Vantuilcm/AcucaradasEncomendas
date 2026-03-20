$targetDir = "..\node_modules\@babel"
if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir }

Function Install-Package {
    param([string]$pkgName, [string]$version)
    
    $name = $pkgName -split "/" | Select-Object -Last 1
    if ($pkgName -eq "babel-plugin-transform-flow-enums") {
         $destPath = "..\node_modules\babel-plugin-transform-flow-enums"
         $tarPrefix = "babel-plugin-transform-flow-enums"
    } elseif ($pkgName -eq "react-refresh") {
         $destPath = "..\node_modules\react-refresh"
         $tarPrefix = "react-refresh"
    } else {
         $destPath = Join-Path $targetDir $name
         $tarPrefix = "babel-plugin-" + $name
         if ($name -eq "template") { $tarPrefix = "babel-template" }
    }

    Write-Host "Restoring $pkgName..."
    
    # Clean old
    if (Test-Path $destPath) { Remove-Item $destPath -Recurse -Force -ErrorAction SilentlyContinue }
    
    # Download
    npm pack "$pkgName@$version"
    
    # Find tarball
    $tgz = Get-ChildItem -Filter "*$name*.tgz" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if ($tgz) {
        New-Item -ItemType Directory -Force -Path $destPath | Out-Null
        tar -xf $tgz.Name -C $destPath --strip-components=1
        Remove-Item $tgz.Name
    } else {
        Write-Error "Failed to download $pkgName"
    }
}

Install-Package "@babel/plugin-transform-named-capturing-groups-regex" "latest"
Install-Package "@babel/plugin-transform-react-jsx-self" "latest"
Install-Package "@babel/plugin-transform-runtime" "latest"
Install-Package "@babel/plugin-transform-typescript" "latest"
