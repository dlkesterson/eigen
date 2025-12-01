# CI Check Script for Windows PowerShell
# This script runs the same checks as the GitHub CI workflow locally
# Usage: .\scripts\check.ps1 [-Frontend] [-Backend] [-Build] [-All]

param(
    [switch]$Frontend,
    [switch]$Backend,
    [switch]$Build,
    [switch]$All,
    [switch]$Help
)

# Set error action preference
$ErrorActionPreference = "Continue"

# Track what to run
$RunFrontend = $false
$RunBackend = $false
$RunBuild = $false

# Parse arguments
if ($Help) {
    Write-Host "Usage: .\scripts\check.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Frontend    Run frontend checks (ESLint, Prettier, TypeScript)"
    Write-Host "  -Backend     Run backend checks (cargo fmt, clippy)"
    Write-Host "  -Build       Run build verification"
    Write-Host "  -All         Run all checks including build"
    Write-Host "  -Help        Show this help message"
    Write-Host ""
    Write-Host "Default (no args): Run frontend and backend checks without build"
    exit 0
}

if ($All) {
    $RunFrontend = $true
    $RunBackend = $true
    $RunBuild = $true
} elseif ($Frontend -or $Backend -or $Build) {
    $RunFrontend = $Frontend
    $RunBackend = $Backend
    $RunBuild = $Build
} else {
    # Default: run all checks except build
    $RunFrontend = $true
    $RunBackend = $true
}

# Track failures
$Failures = @()

function Print-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "  $Message" -ForegroundColor Blue
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
}

function Print-Step {
    param([string]$Message)
    Write-Host "▶ $Message" -ForegroundColor Yellow
}

function Print-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Run-Check {
    param(
        [string]$Name,
        [scriptblock]$Command
    )
    
    Print-Step $Name
    try {
        & $Command
        if ($LASTEXITCODE -eq 0) {
            Print-Success "$Name passed"
            return $true
        } else {
            Print-Error "$Name failed"
            return $false
        }
    } catch {
        Print-Error "$Name failed: $_"
        return $false
    }
}

# Frontend checks
if ($RunFrontend) {
    Print-Header "Frontend Lint & Format Checks"
    
    if (-not (Run-Check "ESLint" { pnpm lint })) {
        $Failures += "ESLint"
    }
    
    if (-not (Run-Check "Prettier formatting" { pnpm format:check })) {
        $Failures += "Prettier formatting"
    }
    
    if (-not (Run-Check "TypeScript type check" { pnpm type-check })) {
        $Failures += "TypeScript type check"
    }
}

# Backend (Rust) checks
if ($RunBackend) {
    Print-Header "Rust Lint & Format Checks"
    
    Push-Location src-tauri
    try {
        if (-not (Run-Check "Rust formatting" { cargo fmt --all -- --check })) {
            $Failures += "Rust formatting"
        }
        
        if (-not (Run-Check "Clippy lints" { cargo clippy --all-targets --all-features -- -D warnings })) {
            $Failures += "Clippy lints"
        }
    } finally {
        Pop-Location
    }
}

# Build verification
if ($RunBuild) {
    Print-Header "Build Verification"
    
    if (-not (Run-Check "Frontend build" { pnpm build })) {
        $Failures += "Frontend build"
    }
    
    Push-Location src-tauri
    try {
        if (-not (Run-Check "Tauri check" { cargo check --all-targets })) {
            $Failures += "Tauri check"
        }
    } finally {
        Pop-Location
    }
}

# Summary
Write-Host ""
Print-Header "Summary"

if ($Failures.Count -eq 0) {
    Write-Host "All checks passed! ✓" -ForegroundColor Green
    exit 0
} else {
    Write-Host "The following checks failed:" -ForegroundColor Red
    foreach ($failure in $Failures) {
        Write-Host "  • $failure" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Tip: Run 'pnpm lint:fix' and 'pnpm format' to auto-fix some issues" -ForegroundColor Yellow
    Write-Host "     Run 'pnpm tauri:fmt' to fix Rust formatting" -ForegroundColor Yellow
    exit 1
}
