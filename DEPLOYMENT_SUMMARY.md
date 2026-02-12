# Wave 5 Deployment Preparation - Executive Summary

**Date:** 2026-02-11
**Branch:** feature/gap-analysis-phase1 (should merge to main before deployment)
**Commit:** 4a8ea5e
**Status:** BLOCKED - Code compilation errors

---

## Summary

Prepared all Wave 5 deployment artifacts for the homelab K3s cluster, but encountered blocking compilation errors in both the web app and API that must be resolved before Docker images can be built.

---

## What Was Accomplished

### 1. Infrastructure Configuration

Updated all Kubernetes manifests to use consistent port configuration (8080 for API):

- `infrastructure/homelab/k8s/base/deployment-api.yaml`
- `infrastructure/homelab/k8s/base/service-api.yaml`
- `infrastructure/homelab/k8s/overlays/dev/nodeport-services.yaml`
- `infrastructure/homelab/k8s/overlays/dev/configmap-patch.yaml`

### 2. Dockerfile Fixes

**API Dockerfile:**
- Removed `wkhtmltopdf` dependency (not available in Alpine 3.19)
- Fixed build context paths to copy from `apps/api/` subdirectory
- Created placeholder `trancloud-ca.crt` for builds

**Web Dockerfile:**
- No changes needed (already correct)

### 3. Missing Components

- Added shadcn table component (`apps/web/src/components/ui/table.tsx`)
- Fixed minor import issues in web app

### 4. Documentation

Created comprehensive documentation:
- `WAVE5_DEPLOYMENT_PREP.md` - Complete deployment guide
- `CODE_FIXES_NEEDED.md` - Detailed list of code issues
- `DEPLOYMENT_SUMMARY.md` - This file

---

## Blocking Issues

### Issue 1: Web App Type Error

**File:** `apps/web/src/app/[locale]/patients/[id]/insurance/page.tsx:137`
**Error:** `Property 'prefixCode' does not exist on type 'Insurance'`
**Impact:** Cannot build web Docker image
**Estimated Fix Time:** 15-30 minutes

### Issue 2: API Type Mismatch

**File:** `apps/api/internal/service/assessment_template_service.go:69`
**Error:** Type mismatch between `ChecklistItem` and `AssessmentChecklistItem`
**Impact:** Cannot build API Docker image
**Estimated Fix Time:** 30-60 minutes

---

## Next Steps (In Order)

### Step 1: Fix Code Issues (REQUIRED)

1. Fix Insurance type definition (see `CODE_FIXES_NEEDED.md`)
2. Fix ChecklistItem type mismatch (see `CODE_FIXES_NEEDED.md`)
3. Test builds locally:
   ```bash
   cd apps/web && pnpm build
   cd apps/api && go build ./cmd/api
   ```

### Step 2: Build Docker Images

```bash
# Get git SHA for tagging
GIT_SHA=$(git rev-parse --short HEAD)

# Build API
docker build -t registry.trancloud.work/physioflow-api:dev \
  -f apps/api/Dockerfile .
docker tag registry.trancloud.work/physioflow-api:dev \
  registry.trancloud.work/physioflow-api:$GIT_SHA

# Build Web
docker build \
  --build-arg NEXT_PUBLIC_API_URL="https://physioflow-dev.trancloud.work/api" \
  --build-arg NEXT_PUBLIC_APP_URL="https://physioflow-dev.trancloud.work" \
  --build-arg NEXT_PUBLIC_KEYCLOAK_URL="https://keycloak.trancloud.work" \
  --build-arg NEXT_PUBLIC_KEYCLOAK_REALM="physioflow-dev" \
  --build-arg NEXT_PUBLIC_KEYCLOAK_CLIENT_ID="physioflow-web" \
  -t registry.trancloud.work/physioflow-web:dev \
  -f apps/web/Dockerfile .
docker tag registry.trancloud.work/physioflow-web:dev \
  registry.trancloud.work/physioflow-web:$GIT_SHA
```

### Step 3: Test Images Locally

```bash
# Test API (adjust DATABASE_URL as needed)
docker run --rm -p 8080:8080 \
  -e DATABASE_URL="postgresql://..." \
  registry.trancloud.work/physioflow-api:dev

# Test Web
docker run --rm -p 3000:3000 \
  registry.trancloud.work/physioflow-web:dev

# Verify health checks
curl http://localhost:8080/health
curl http://localhost:3000/api/health
```

### Step 4: Push to Registry

```bash
docker push registry.trancloud.work/physioflow-api:dev
docker push registry.trancloud.work/physioflow-api:$GIT_SHA
docker push registry.trancloud.work/physioflow-web:dev
docker push registry.trancloud.work/physioflow-web:$GIT_SHA
```

### Step 5: Deploy to K3s

```bash
# From k3s-master or machine with kubectl configured
kubectl apply -k infrastructure/homelab/k8s/overlays/dev

# Monitor rollout
kubectl rollout status deployment/physioflow-web -n physioflow-dev
kubectl rollout status deployment/physioflow-api -n physioflow-dev

# Check pods
kubectl get pods -n physioflow-dev

# Check logs
kubectl logs -n physioflow-dev deployment/physioflow-web --tail=50
kubectl logs -n physioflow-dev deployment/physioflow-api --tail=50
```

### Step 6: Verify Deployment

```bash
# Check health endpoints
curl https://physioflow-dev.trancloud.work/api/health
curl http://192.168.10.60:30200/api/health  # Via NodePort

# Test login
# Open https://physioflow-dev.trancloud.work in browser
```

---

## Environment Details

### Dev Environment URLs
- **Web:** https://physioflow-dev.trancloud.work
- **API:** https://physioflow-dev.trancloud.work/api
- **Keycloak:** https://keycloak.trancloud.work

### K3s Cluster
- **Namespace:** physioflow-dev
- **Master:** 192.168.10.60
- **Workers:** 192.168.10.61, 192.168.10.62

### NodePorts
- **Web:** 30200
- **API:** 30201

### External Dependencies
- **PostgreSQL:** 192.168.10.24:5432 (LXC 101 on pve2)
- **Keycloak:** 192.168.10.27:8080 (LXC 104 on pve1)
- **MinIO:** Unraid (https://unraid-s3.trancloud.work)

---

## Modified Files (for Git Commit)

### Infrastructure
```
infrastructure/homelab/k8s/base/deployment-api.yaml
infrastructure/homelab/k8s/base/service-api.yaml
infrastructure/homelab/k8s/overlays/dev/nodeport-services.yaml
infrastructure/homelab/k8s/overlays/dev/configmap-patch.yaml
```

### Dockerfiles
```
apps/api/Dockerfile
```

### Web App
```
apps/web/src/components/ui/table.tsx (new file)
apps/web/src/app/[locale]/billing/claims/page.tsx
```

### Documentation
```
WAVE5_DEPLOYMENT_PREP.md (new file)
CODE_FIXES_NEEDED.md (new file)
DEPLOYMENT_SUMMARY.md (new file)
```

### Other
```
trancloud-ca.crt (placeholder for Docker build)
```

---

## Pre-Deployment Checklist

### Code & Build
- [ ] Fix Insurance type definition issue
- [ ] Fix ChecklistItem type mismatch issue
- [ ] Web app builds successfully (`pnpm build`)
- [ ] API builds successfully (`go build`)
- [ ] Docker images build successfully
- [ ] Docker images tested locally

### Infrastructure
- [ ] Keycloak realm `physioflow-dev` exists
- [ ] Keycloak client `physioflow-web` configured
- [ ] Keycloak client `physioflow-api` configured with secret
- [ ] PostgreSQL database `physioflow` exists
- [ ] MinIO bucket `physioflow-dev` exists
- [ ] K8s secrets updated if needed

### Deployment
- [ ] Images pushed to registry
- [ ] K8s manifests reviewed
- [ ] Backup current data (if applicable)
- [ ] Team notified of deployment

### Verification
- [ ] Web app accessible
- [ ] API health check responds
- [ ] Login works
- [ ] Database connection works
- [ ] S3/MinIO connection works
- [ ] No critical errors in logs

---

## Rollback Procedure

If deployment fails:

```bash
# Rollback deployment
kubectl rollout undo deployment/physioflow-web -n physioflow-dev
kubectl rollout undo deployment/physioflow-api -n physioflow-dev

# Or delete and redeploy previous version
kubectl delete -k infrastructure/homelab/k8s/overlays/dev
# (restore previous image tags in kustomization.yaml)
kubectl apply -k infrastructure/homelab/k8s/overlays/dev
```

---

## Known Limitations

1. **PDF Generation:** Removed wkhtmltopdf from API - PDF features may not work
2. **Database Migrations:** Init container uses placeholder - manual migration may be needed
3. **Registry Port:** Kustomization uses `registry.trancloud.work:5000` but actual port may differ
4. **Branch:** Currently on `feature/gap-analysis-phase1` - merge to main before deploying to prod

---

## Support Information

**Documentation Files:**
- `WAVE5_DEPLOYMENT_PREP.md` - Detailed deployment guide
- `CODE_FIXES_NEEDED.md` - Code fix instructions
- `DEPLOYMENT_SUMMARY.md` - This summary

**Infrastructure Reference:**
- `/mnt/d/Cloud/OneDrive/IT/infrastructure.yaml` - Complete homelab documentation
- `/home/dang/dev/infrastructure.yaml` - Local copy

**Logs Location:**
```bash
kubectl logs -n physioflow-dev deployment/physioflow-web
kubectl logs -n physioflow-dev deployment/physioflow-api
```

---

**Status:** Deployment preparation complete, awaiting code fixes before proceeding.
