<#
.SYNOPSIS
    GalEngine Editor -- Production Build & Package Script

.DESCRIPTION
    Full pipeline:
      1. Generate app icons (if missing)
      2. Compile main-process TypeScript
      3. Build renderer (Vite + React)
      4. Package with electron-builder (NSIS installer)

    Output in: release/
      - GalEngine Editor Setup x.x.x.exe  (installer)
      - win-unpacked/                      (portable folder)

.PARAMETER SkipIcon
    Skip icon generation step.

.PARAMETER DirOnly
    Package as directory only (no installer). Produces win-unpacked/.

.PARAMETER Platform
    Target platform: "win" (default), "mac", "linux".

.EXAMPLE
    .\scripts\build-package.ps1
    .\scripts\build-package.ps1 -DirOnly
    .\scripts\build-package.ps1 -SkipIcon
#>

param(
    [switch]$SkipIcon,
    [switch]$DirOnly,
    [string]$Platform = "win"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

# ---------------------------------------------------------------------------
# China mirror for Electron binary downloads
# ---------------------------------------------------------------------------
# electron-builder downloads Electron from GitHub by default (blocked in China).
# Set these env vars to use npmmirror.com instead.
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_CACHE = Join-Path $env:LOCALAPPDATA "electron-builder\cache"

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  GalEngine Editor -- Build Package" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# Step 1: Generate icons
# ---------------------------------------------------------------------------

$IconPath = "resources\icons\icon.ico"
if (-not $SkipIcon -and -not (Test-Path $IconPath)) {
    Write-Host "[1/4] Generating app icons..." -ForegroundColor Yellow
    $pythonCmd = $null
    foreach ($py in @("python", "python3", "py")) {
        try {
            $null = & $py --version 2>$null
            $pythonCmd = $py
            break
        } catch { }
    }

    if ($pythonCmd) {
        & $pythonCmd scripts/generate-icon.py
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [WARN] Icon generation failed -- using default icon." -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [WARN] Python not found -- skipping icon generation. Install Pillow and run manually:" -ForegroundColor Yellow
        Write-Host "         pip install Pillow && python scripts/generate-icon.py" -ForegroundColor Yellow
    }
} else {
    Write-Host "[1/4] Icons: $IconPath -- OK" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Step 2: Clean & compile main process
# ---------------------------------------------------------------------------

Write-Host "[2/4] Compiling main process TypeScript..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
}
& npx tsc -p tsconfig.main.json
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Main process compilation failed." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] dist/main.js, dist/preload.js" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Step 3: Build renderer (Vite)
# ---------------------------------------------------------------------------

Write-Host "[3/4] Building renderer (Vite)..." -ForegroundColor Yellow
& npx vite build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Renderer build failed." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] dist/renderer/" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Step 4: Clean stale release output
# ---------------------------------------------------------------------------

$StepNum = 4; $TotalSteps = if ($DirOnly) { 5 } else { 5 }
Write-Host "[$StepNum/$TotalSteps] Cleaning old release output..." -ForegroundColor Yellow

if (Test-Path "release") {
    # Attempt graceful removal first (wrapped in try to handle locked files)
    $cleaned = $false
    try {
        Remove-Item -Recurse -Force "release" -ErrorAction Stop
        $cleaned = $true
    } catch {
        # Retry once after a short delay (antivirus may release the lock)
        Start-Sleep -Seconds 2
        try {
            Remove-Item -Recurse -Force "release" -ErrorAction Stop
            $cleaned = $true
        } catch {
            Write-Host "  [WARN] Could not delete release/ -- some files may be locked." -ForegroundColor Yellow
            Write-Host "         Close any GalEngine Editor windows and antivirus, then retry." -ForegroundColor Yellow
            Write-Host "         You can also manually delete: release\" -ForegroundColor Yellow
            Write-Host "         Locked file(s): $($_.Exception.Message)" -ForegroundColor DarkYellow
            exit 1
        }
    }
    if ($cleaned) {
        Write-Host "  [OK] release/ cleaned" -ForegroundColor Green
    }
} else {
    Write-Host "  [OK] No stale release/ to clean" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Step 5: Package with electron-builder
# ---------------------------------------------------------------------------

$StepNum = 5
Write-Host "[$StepNum/$TotalSteps] Packaging with electron-builder..." -ForegroundColor Yellow

$builderArgs = @(
    "--$Platform",
    "--config", "electron-builder.yml"
)

if ($DirOnly) {
    $builderArgs += "--dir"
}

& npx electron-builder @builderArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] electron-builder packaging failed." -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "===================================" -ForegroundColor Green
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""
if (Test-Path "release") {
    Write-Host "Output:" -ForegroundColor White
    Get-ChildItem "release" -Recurse -Name | ForEach-Object {
        Write-Host "  $_"
    }
}
Write-Host ""
