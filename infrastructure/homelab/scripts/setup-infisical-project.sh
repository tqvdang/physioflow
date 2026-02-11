#!/bin/bash
set -e

# Setup Infisical project for PhysioFlow
# This script provides guidance for setting up secrets

INFISICAL_DOMAIN="https://secrets.trancloud.work"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════╗
║           PhysioFlow Infisical Setup Guide                        ║
╚═══════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${GREEN}Step 1: Create Project in Infisical${NC}"
echo "  1. Go to $INFISICAL_DOMAIN"
echo "  2. Click 'New Project'"
echo "  3. Name: physioflow"
echo "  4. Create environments: dev, staging, prod"
echo ""

echo -e "${GREEN}Step 2: Add Required Secrets${NC}"
echo "  Add the following secrets for each environment:"
echo ""
echo -e "${YELLOW}Database:${NC}"
echo "  DATABASE_URL=postgresql://physioflow_{env}:{password}@192.168.10.20:5432/physioflow_{env}"
echo ""
echo -e "${YELLOW}Keycloak:${NC}"
echo "  KEYCLOAK_URL=https://keycloak.trancloud.work"
echo "  KEYCLOAK_REALM=physioflow-{env}"
echo "  KEYCLOAK_CLIENT_ID=physioflow-api"
echo "  KEYCLOAK_CLIENT_SECRET={generate for each env}"
echo ""
echo -e "${YELLOW}Google OAuth:${NC}"
echo "  GOOGLE_OAUTH_CLIENT_ID={from Google Cloud Console}"
echo "  GOOGLE_OAUTH_CLIENT_SECRET={from Google Cloud Console}"
echo ""
echo -e "${YELLOW}MinIO/S3:${NC}"
echo "  S3_ENDPOINT=https://s3.trancloud.work"
echo "  S3_ACCESS_KEY={from MinIO}"
echo "  S3_SECRET_KEY={from MinIO}"
echo "  S3_BUCKET=physioflow-{env}"
echo ""
echo -e "${YELLOW}Redis:${NC}"
echo "  REDIS_URL=redis://192.168.10.60:30613"
echo ""

echo -e "${GREEN}Step 3: Install Infisical CLI${NC}"
echo "  curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash"
echo "  sudo apt-get update && sudo apt-get install infisical"
echo ""

echo -e "${GREEN}Step 4: Login to Infisical${NC}"
echo "  infisical login --domain=$INFISICAL_DOMAIN"
echo ""

echo -e "${GREEN}Step 5: Sync Secrets to Kubernetes${NC}"
echo "  ./sync-secrets.sh dev"
echo "  ./sync-secrets.sh staging"
echo "  ./sync-secrets.sh prod"
echo ""

echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}"
echo "For detailed instructions, see: infrastructure/homelab/DEPLOYMENT.md"
