#!/bin/bash

# CI Check Script
# This script runs the same checks as the GitHub CI workflow locally
# Usage: ./scripts/check.sh [--frontend] [--backend] [--build] [--all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track what to run
RUN_FRONTEND=false
RUN_BACKEND=false
RUN_BUILD=false

# Parse arguments
if [ $# -eq 0 ]; then
    # Default: run all checks except build
    RUN_FRONTEND=true
    RUN_BACKEND=true
else
    for arg in "$@"; do
        case $arg in
            --frontend|-f)
                RUN_FRONTEND=true
                ;;
            --backend|-b)
                RUN_BACKEND=true
                ;;
            --build)
                RUN_BUILD=true
                ;;
            --all|-a)
                RUN_FRONTEND=true
                RUN_BACKEND=true
                RUN_BUILD=true
                ;;
            --help|-h)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --frontend, -f    Run frontend checks (ESLint, Prettier, TypeScript)"
                echo "  --backend, -b     Run backend checks (cargo fmt, clippy)"
                echo "  --build           Run build verification"
                echo "  --all, -a         Run all checks including build"
                echo "  --help, -h        Show this help message"
                echo ""
                echo "Default (no args): Run frontend and backend checks without build"
                exit 0
                ;;
            *)
                echo -e "${RED}Unknown option: $arg${NC}"
                exit 1
                ;;
        esac
    done
fi

# Track failures
FAILURES=()

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_step() {
    echo -e "${YELLOW}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

run_check() {
    local name="$1"
    local cmd="$2"
    
    print_step "$name"
    if eval "$cmd"; then
        print_success "$name passed"
        return 0
    else
        print_error "$name failed"
        FAILURES+=("$name")
        return 1
    fi
}

# Frontend checks
if [ "$RUN_FRONTEND" = true ]; then
    print_header "Frontend Lint & Format Checks"
    
    run_check "ESLint" "pnpm lint" || true
    run_check "Prettier formatting" "pnpm format:check" || true
    run_check "TypeScript type check" "pnpm type-check" || true
fi

# Backend (Rust) checks
if [ "$RUN_BACKEND" = true ]; then
    print_header "Rust Lint & Format Checks"
    
    run_check "Rust formatting" "cd src-tauri && cargo fmt --all -- --check" || true
    run_check "Clippy lints" "cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings" || true
fi

# Build verification
if [ "$RUN_BUILD" = true ]; then
    print_header "Build Verification"
    
    run_check "Frontend build" "pnpm build" || true
    run_check "Tauri check" "cd src-tauri && cargo check --all-targets" || true
fi

# Summary
echo ""
print_header "Summary"

if [ ${#FAILURES[@]} -eq 0 ]; then
    echo -e "${GREEN}All checks passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}The following checks failed:${NC}"
    for failure in "${FAILURES[@]}"; do
        echo -e "${RED}  • $failure${NC}"
    done
    echo ""
    echo -e "${YELLOW}Tip: Run 'pnpm lint:fix' and 'pnpm format' to auto-fix some issues${NC}"
    echo -e "${YELLOW}     Run 'pnpm tauri:fmt' to fix Rust formatting${NC}"
    exit 1
fi
