# PhysioFlow Homelab Deployment Guide

This guide covers deploying PhysioFlow to the TranCloud homelab infrastructure across dev, staging, and prod environments.

## Architecture Overview

```
                                    ┌─────────────────────────────────────┐
                                    │         Cloudflare DNS              │
                                    │  physioflow-dev.trancloud.work      │
                                    │  physioflow-staging.trancloud.work  │
                                    │  physioflow.trancloud.work          │
                                    └──────────────┬──────────────────────┘
                                                   │
                                    ┌──────────────▼──────────────────────┐
                                    │    pfSense HAProxy (192.168.10.1)   │
                                    │    SSL Termination + Routing        │
                                    └──────────────┬──────────────────────┘
                                                   │
                    ┌──────────────────────────────┼───────────────────────────────┐
                    │                              │                               │
         ┌──────────▼──────────┐       ┌──────────▼──────────┐       ┌────────────▼────────────┐
         │   physioflow-dev    │       │ physioflow-staging  │       │    physioflow-prod      │
         │   NodePort: 30200   │       │   NodePort: 30210   │       │    NodePort: 30220      │
         │   NodePort: 30201   │       │   NodePort: 30211   │       │    NodePort: 30221      │
         └─────────────────────┘       └─────────────────────┘       └─────────────────────────┘
                                                   │
                                    ┌──────────────▼──────────────────────┐
                                    │     K3s Cluster (192.168.10.60-62)  │
                                    └─────────────────────────────────────┘
```

## Prerequisites

- Access to pfSense (https://pfsense.trancloud.work)
- Access to Proxmox (https://pve2.trancloud.work)
- kubectl configured for k3s cluster
- Infisical CLI installed
- Cloudflare API token

## Step 1: Create PostgreSQL LXC Container

### 1.1 Create LXC in Proxmox

1. Login to https://pve2.trancloud.work
2. Create new LXC container:
   - Template: Debian 12 or Ubuntu 22.04
   - Hostname: `physioflow-db`
   - Memory: 2GB, Swap: 512MB
   - Disk: 20GB
   - Network: Static IP (e.g., 192.168.10.25)

3. Start container and SSH in:
```bash
ssh root@192.168.10.25
```

### 1.2 Install PostgreSQL

```bash
# Update and install PostgreSQL
apt update && apt upgrade -y
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl enable postgresql
systemctl start postgresql
```

### 1.3 Configure PostgreSQL for Remote Access

```bash
# Edit postgresql.conf to listen on all interfaces
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf

# Add pg_hba.conf entries for k3s nodes
echo "host    all    all    192.168.10.0/24    scram-sha-256" >> /etc/postgresql/*/main/pg_hba.conf

# Restart PostgreSQL
systemctl restart postgresql
```

### 1.4 Create Databases and Users

```bash
sudo -u postgres psql

-- Create databases for each environment
CREATE DATABASE physioflow_dev;
CREATE DATABASE physioflow_staging;
CREATE DATABASE physioflow_prod;

-- Create users with secure passwords
CREATE USER physioflow_dev WITH PASSWORD 'PhysioFlow_Dev_2026!';
CREATE USER physioflow_staging WITH PASSWORD 'PhysioFlow_Staging_2026!';
CREATE USER physioflow_prod WITH PASSWORD 'PhysioFlow_Prod_2026_Secure!';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE physioflow_dev TO physioflow_dev;
GRANT ALL PRIVILEGES ON DATABASE physioflow_staging TO physioflow_staging;
GRANT ALL PRIVILEGES ON DATABASE physioflow_prod TO physioflow_prod;

\q
```

### 1.5 Update Kubernetes Secrets

Update the DATABASE_URL in each environment's secrets.yaml to use the LXC IP:
```
postgresql://physioflow_dev:PhysioFlow_Dev_2026!@192.168.10.25:5432/physioflow_dev
```

## Step 2: Configure Infisical Secrets

### 2.1 Create Project in Infisical

1. Go to https://secrets.trancloud.work
2. Create new project: `physioflow`
3. Create environments: `dev`, `staging`, `prod`

### 2.2 Add Secrets for Each Environment

Add the following secrets in Infisical for each environment:

| Secret Name | Dev | Staging | Prod |
|-------------|-----|---------|------|
| `DATABASE_URL` | postgresql://physioflow_dev:xxx@192.168.10.20:5432/physioflow_dev | postgresql://physioflow_staging:xxx@192.168.10.20:5432/physioflow_staging | postgresql://physioflow_prod:xxx@192.168.10.20:5432/physioflow_prod |
| `KEYCLOAK_URL` | https://keycloak.trancloud.work | same | same |
| `KEYCLOAK_REALM` | physioflow-dev | physioflow-staging | physioflow-prod |
| `KEYCLOAK_CLIENT_ID` | physioflow-api | same | same |
| `KEYCLOAK_CLIENT_SECRET` | (generate unique) | (generate unique) | (generate unique) |
| `GOOGLE_OAUTH_CLIENT_ID` | (from Google Console) | same | same |
| `GOOGLE_OAUTH_CLIENT_SECRET` | (from Google Console) | same | same |
| `S3_ENDPOINT` | https://unraid-s3.trancloud.work | same | same |
| `S3_ACCESS_KEY` | (from MinIO) | same | same |
| `S3_SECRET_KEY` | (from MinIO) | same | same |
| `S3_BUCKET` | physioflow-dev | physioflow-staging | physioflow-prod |
| `REDIS_URL` | redis://192.168.10.60:30613 | same | same |

### 2.3 Export Secrets to Kubernetes

```bash
# Login to Infisical
infisical login --domain=https://secrets.trancloud.work

# Export secrets for dev
cd infrastructure/homelab/k8s/overlays/dev
infisical export --env=dev --projectId=physioflow --format=kubernetes > secrets-from-infisical.yaml

# Apply to cluster
kubectl apply -f secrets-from-infisical.yaml -n physioflow-dev
```

## Step 3: Configure Google OAuth

### 3.1 Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create/select project: `PhysioFlow`
3. Configure OAuth consent screen
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URIs:
   ```
   https://keycloak.trancloud.work/realms/physioflow-dev/broker/google/endpoint
   https://keycloak.trancloud.work/realms/physioflow-staging/broker/google/endpoint
   https://keycloak.trancloud.work/realms/physioflow-prod/broker/google/endpoint
   ```
6. Save Client ID and Secret to Infisical

## Step 4: Import Keycloak Realms

### 4.1 Via Keycloak Admin Console

1. Login to https://keycloak.trancloud.work
2. For each realm (physioflow-dev, physioflow-staging, physioflow-prod):
   - Click realm dropdown → Create Realm
   - Import from file: `infrastructure/homelab/keycloak/realms/physioflow-{env}.json`
   - Update client secret after import

### 4.2 Via CLI (Recommended)

```bash
# Get Keycloak pod
KC_POD=$(kubectl get pods -n keycloak -l app=keycloak -o jsonpath='{.items[0].metadata.name}')

# Import dev realm
kubectl cp infrastructure/homelab/keycloak/realms/physioflow-dev.json keycloak/$KC_POD:/tmp/realm.json
kubectl exec -n keycloak $KC_POD -- /opt/keycloak/bin/kc.sh import --file /tmp/realm.json

# Repeat for staging and prod
```

### 4.3 Update Client Secrets

After import, update the `physioflow-api` client secret in each realm:
1. Go to Realm → Clients → physioflow-api → Credentials
2. Regenerate secret
3. Update Infisical with new secret

## Step 5: Configure Cloudflare DNS

### 5.1 Add DNS Records

Login to Cloudflare and add A records:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | physioflow-dev | 136.52.161.152 | Proxied (orange) |
| A | physioflow-staging | 136.52.161.152 | Proxied (orange) |
| A | physioflow | 136.52.161.152 | Proxied (orange) |

### 5.2 SSL/TLS Settings

1. Go to SSL/TLS → Overview
2. Set encryption mode to "Full (strict)"
3. Enable "Always Use HTTPS"

## Step 6: Configure HAProxy in pfSense

### 6.1 Create Backends

Navigate to: **Services → HAProxy → Backend**

**physioflow-dev-web-be:**
- Name: `physioflow-dev-web-be`
- Mode: HTTP
- Server: k3s-web, 192.168.10.60:30200
- Health check: HTTP GET /

**physioflow-dev-api-be:**
- Name: `physioflow-dev-api-be`
- Mode: HTTP
- Server: k3s-api, 192.168.10.60:30201
- Health check: HTTP GET /health

Repeat for staging (30210/30211) and prod (30220/30221).

### 6.2 Configure Frontend ACLs

Navigate to: **Services → HAProxy → Frontend → trancloud-https → Edit**

Add ACLs:
```
physioflow-dev-acl          Host matches: physioflow-dev.trancloud.work
physioflow-dev-api-acl      Path starts with: /api
physioflow-staging-acl      Host matches: physioflow-staging.trancloud.work
physioflow-staging-api-acl  Path starts with: /api
physioflow-prod-acl         Host matches: physioflow.trancloud.work
physioflow-prod-api-acl     Path starts with: /api
```

Add Actions (in order):
```
Use Backend: physioflow-dev-api-be     if physioflow-dev-acl physioflow-dev-api-acl
Use Backend: physioflow-dev-web-be     if physioflow-dev-acl
Use Backend: physioflow-staging-api-be if physioflow-staging-acl physioflow-staging-api-acl
Use Backend: physioflow-staging-web-be if physioflow-staging-acl
Use Backend: physioflow-prod-api-be    if physioflow-prod-acl physioflow-prod-api-acl
Use Backend: physioflow-prod-web-be    if physioflow-prod-acl
```

Save and Apply Changes.

## Step 7: Build and Push Docker Images

### 7.1 Build Images

```bash
# Build web app
cd apps/web
NEXT_PUBLIC_API_URL=https://physioflow-dev.trancloud.work/api \
NEXT_PUBLIC_KEYCLOAK_URL=https://keycloak.trancloud.work \
NEXT_PUBLIC_KEYCLOAK_REALM=physioflow-dev \
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=physioflow-web \
docker build -t registry.trancloud.work/physioflow-web:dev .

# Build API
cd ../api
docker build -t registry.trancloud.work/physioflow-api:dev .

# Push to registry
docker push registry.trancloud.work/physioflow-web:dev
docker push registry.trancloud.work/physioflow-api:dev
```

### 7.2 Repeat for Staging/Prod

Update environment variables and tags accordingly.

## Step 8: Deploy to Kubernetes

### 8.1 Create Namespaces

```bash
kubectl apply -f infrastructure/homelab/k8s/namespaces/
```

### 8.2 Deploy Each Environment

```bash
# Deploy dev
kubectl apply -k infrastructure/homelab/k8s/overlays/dev/

# Deploy staging
kubectl apply -k infrastructure/homelab/k8s/overlays/staging/

# Deploy prod
kubectl apply -k infrastructure/homelab/k8s/overlays/prod/
```

### 8.3 Verify Deployment

```bash
# Check pods
kubectl get pods -n physioflow-dev
kubectl get pods -n physioflow-staging
kubectl get pods -n physioflow-prod

# Check services
kubectl get svc -n physioflow-dev
```

## Step 9: Verify Deployment

### 9.1 Test Endpoints

```bash
# Test dev
curl -I https://physioflow-dev.trancloud.work
curl https://physioflow-dev.trancloud.work/api/health

# Test staging
curl -I https://physioflow-staging.trancloud.work

# Test prod
curl -I https://physioflow.trancloud.work
```

### 9.2 Test Authentication

1. Go to https://physioflow-dev.trancloud.work
2. Click login
3. Should redirect to Keycloak
4. Login with test user or Google
5. Should redirect back to app

## Troubleshooting

### Check HAProxy Status
```
pfSense → Services → HAProxy → Stats
```

### Check Pod Logs
```bash
kubectl logs -n physioflow-dev -l app=physioflow -f
```

### Check Keycloak Logs
```bash
kubectl logs -n keycloak -l app=keycloak -f
```

### DNS Issues
```bash
nslookup physioflow-dev.trancloud.work
dig physioflow-dev.trancloud.work
```

## Port Reference

| Environment | Web NodePort | API NodePort |
|-------------|--------------|--------------|
| Dev | 30200 | 30201 |
| Staging | 30210 | 30211 |
| Prod | 30220 | 30221 |

## URL Reference

| Environment | URL |
|-------------|-----|
| Dev | https://physioflow-dev.trancloud.work |
| Staging | https://physioflow-staging.trancloud.work |
| Prod | https://physioflow.trancloud.work |
| Keycloak | https://keycloak.trancloud.work |
| Infisical | https://secrets.trancloud.work |
