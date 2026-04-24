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

    Write-Host "--- Restoring $pkgName ($version) ---"
    
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    }

    if (Test-Path $destPath) {
        Write-Host "Cleaning $destPath..."
        Remove-Item $destPath -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Download with retries
    $maxRetries = 3
    $retryCount = 0
    $downloadSuccess = $false
    
    while (-not $downloadSuccess -and $retryCount -lt $maxRetries) {
        try {
            Write-Host "Downloading $pkgName@$version (Attempt $($retryCount + 1))..."
            cmd /c "npm pack $pkgName@$version" | Out-Null
            $downloadSuccess = $true
        } catch {
            Write-Host "Download failed: $_"
            $retryCount++
            Start-Sleep -Seconds 2
        }
    }

    if (-not $downloadSuccess) {
        Write-Error "Failed to download $pkgName after $maxRetries attempts."
        return
    }

    # Wait for file to appear
    Start-Sleep -Seconds 1
    
    # Find the tarball
    # Handle different naming conventions (scoped vs non-scoped)
    # e.g. @firebase/app -> firebase-app-*.tgz
    # e.g. firebase -> firebase-*.tgz
    
    $searchName = $name
    if ($pkgName -like "@*/*") {
        # Remove scope from search if needed, but usually npm pack output contains the name without scope prefix or with scope replaced
        # @scope/pkg -> scope-pkg-version.tgz
        $scopeClean = $scope.Substring(1)
        $searchName = "*$scopeClean*$name*"
    } else {
        $searchName = "$name"
    }
    
    $tarNamePattern = "*$searchName*.tgz"
    $tgz = Get-ChildItem -Filter $tarNamePattern | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if (-not $tgz) {
        # Fallback to any tgz if specific fails (risky but we clean up)
        $tgz = Get-ChildItem -Filter "*.tgz" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    }

    if ($tgz) {
        Write-Host "Found tarball: $($tgz.Name)"
        
        if (-not (Test-Path $destPath)) {
            New-Item -ItemType Directory -Force -Path $destPath | Out-Null
        }
        
        Write-Host "Extracting to $destPath..."
        tar -xf $tgz.Name -C $destPath --strip-components=1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Extraction successful."
            Remove-Item $tgz.Name -Force
        } else {
            Write-Error "Tar extraction failed with code $LASTEXITCODE"
        }
    } else {
        Write-Error "Failed to find tarball for $pkgName"
    }
}

# List of missing dependencies based on Jest errors
$packages = @(
    @{name="firebase"; version="10.7.1"},
    @{name="bcryptjs"; version="2.4.3"},
    @{name="expo-device"; version="5.4.0"},
    @{name="@testing-library/react-hooks"; version="8.0.1"},
    @{name="expo-screen-capture"; version="5.3.0"},
    @{name="react-native-paper"; version="5.15.0"},
    @{name="expo-notifications"; version="0.20.1"}
)

foreach ($pkg in $packages) {
    Install-Package -pkgName $pkg.name -version $pkg.version
}

Write-Host "ALL DONE - Round 2 Restored"
