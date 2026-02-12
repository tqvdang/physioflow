# Wave 5 Homelab Deployment - Preparation Summary

**Status:** BLOCKED - Code compilation issues must be resolved

**Git Commit:** `4a8ea5e`

## Overview

This document outlines the preparation steps for Wave 5 deployment to the homelab K3s cluster. The deployment includes both web and API components with environment-specific configuration for the `dev` environment.

## Blocking Issues

### 1. Web App Compilation Errors

**Location:** `/home/dang/dev/physioflow/apps/web/`

**Issues:**
- Missing TypeScript type property: `Insurance.prefixCode` not defined
  - File: `src/app/[locale]/patients/[id]/insurance/page.tsx:137`
  - Error: `Property 'prefixCode' does not exist on type 'Insurance'`

**Status:** TypeScript strict mode is failing the build due to type mismatches.

**Resolution Required:**
- Fix the Insurance type definition to include `prefixCode` property OR
- Update the code to use the correct property name
- Verify all type definitions match the actual data structures

### 2. API Compilation Errors

**Location:** `/home/dang/dev/physioflow/apps/api/`

**Issues:**
- Type mismatch in assessment template service
  - File: `internal/service/assessment_template_service.go:69`
  - Error: `cannot use template.ChecklistItems (type []model.AssessmentChecklistItem) as []model.ChecklistItem`
- Missing struct fields on `model.ChecklistItem`
  - Fields: `Required`, `Item` not found on type

**Status:** Go compilation failing due to type incompatibilities.

**Resolution Required:**
- Align the `ChecklistItem` and `AssessmentChecklistItem` types
- Ensure all required fields exist on the model structs
- May require refactoring the assessment template validation logic

## Completed Tasks

### Infrastructure Configuration Updates

1. **Port Standardization**
   - Updated API deployment to use port 8080 (matching Dockerfile EXPOSE)
   - Updated K8s manifests:
     - `/home/dang/dev/physioflow/infrastructure/homelab/k8s/base/deployment-api.yaml`
     - `/home/dang/dev/physioflow/infrastructure/homelab/k8s/base/service-api.yaml`
     - `/home/dang/dev/physioflow/infrastructure/homelab/k8s/overlays/dev/nodeport-services.yaml`
     - `/home/dang/dev/physioflow/infrastructure/homelab/k8s/overlays/dev/configmap-patch.yaml`

2. **API Dockerfile Fixes**
   - Removed `wkhtmltopdf` dependency (not available in Alpine 3.19)
   - Note: PDF generation will need alternative approach (future work)
   - File: `/home/dang/dev/physioflow/apps/api/Dockerfile`

3. **Web App Missing Components**
   - Added shadcn table component (`src/components/ui/table.tsx`)
   - Fixed unused import warnings in billing claims page

4. **Build Context Fixes**
   - Updated API Dockerfile to copy from `apps/api/` subdirectory
   - Created placeholder `trancloud-ca.crt` file for Docker build

## Required Environment Variables (Dev)

### Web App (Next.js - Build Time)
```bash
NEXT_PUBLIC_API_URL=https://physioflow-dev.trancloud.work/api
NEXT_PUBLIC_APP_URL=https://physioflow-dev.trancloud.work
NEXT_PUBLIC_KEYCLOAK_URL=https://keycloak.trancloud.work
NEXT_PUBLIC_KEYCLOAK_REALM=physioflow-dev
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=physioflow-web
```

### API (Go - Runtime)
```bash
PORT=8080
DATABASE_URL=postgresql://physioflow:PhysioFlow_Dev_2026!@physioflow-postgres:5432/physioflow
KEYCLOAK_URL=https://keycloak.trancloud.work
KEYCLOAK_REALM=physioflow-dev
KEYCLOAK_CLIENT_ID=physioflow-api
KEYCLOAK_CLIENT_SECRET=physioflow-api-dev-secret
S3_ENDPOINT=https://unraid-s3.trancloud.work
S3_ACCESS_KEY=admin
S3_SECRET_KEY=ycm&17XK
S3_BUCKET=physioflow-dev
```

## Deployment Architecture

### K8s Resources
- **Namespace:** `physioflow-dev`
- **Registry:** `registry.trancloud.work`
- **Image Tags:**
  - `physioflow-web:dev` (and `physioflow-web:4a8ea5e`)
  - `physioflow-api:dev` (and `physioflow-api:4a8ea5e`)

### NodePorts
- **Web:** 30200 → 3000
- **API:** 30201 → 8080

### External Access (via HAProxy)
- **Web:** https://physioflow-dev.trancloud.work
- **API:** https://physioflow-dev.trancloud.work/api

### Dependencies
- **PostgreSQL:** `physioflow-postgres` service (in-cluster or external at 192.168.10.24)
- **Keycloak:** https://keycloak.trancloud.work (LXC 104, 192.168.10.27)
- **MinIO:** https://unraid-s3.trancloud.work (Unraid)

## Docker Build Commands (Once Code is Fixed)

### Build API Image
```bash
cd /home/dang/dev/physioflow
docker build -t registry.trancloud.work/physioflow-api:dev -f apps/api/Dockerfile .
```

### Build Web Image
```bash
cd /home/dang/dev/physioflow
docker build \
  --build-arg NEXT_PUBLIC_API_URL="https://physioflow-dev.trancloud.work/api" \
  --build-arg NEXT_PUBLIC_APP_URL="https://physioflow-dev.trancloud.work" \
  --build-arg NEXT_PUBLIC_KEYCLOAK_URL="https://keycloak.trancloud.work" \
  --build-arg NEXT_PUBLIC_KEYCLOAK_REALM="physioflow-dev" \
  --build-arg NEXT_PUBLIC_KEYCLOAK_CLIENT_ID="physioflow-web" \
  -t registry.trancloud.work/physioflow-web:dev \
  -f apps/web/Dockerfile .
```

### Tag with Git SHA
```bash
GIT_SHA=$(git rev-parse --short HEAD)
docker tag registry.trancloud.work/physioflow-api:dev registry.trancloud.work/physioflow-api:$GIT_SHA
docker tag registry.trancloud.work/physioflow-web:dev registry.trancloud.work/physioflow-web:$GIT_SHA
```

### Push to Registry
```bash
docker push registry.trancloud.work/physioflow-api:dev
docker push registry.trancloud.work/physioflow-api:$GIT_SHA
docker push registry.trancloud.work/physioflow-web:dev
docker push registry.trancloud.work/physioflow-web:$GIT_SHA
```

## K8s Deployment Commands (Post-Build)

### Deploy to Dev Environment
```bash
# From k3s-master or machine with kubectl access
kubectl apply -k /home/dang/dev/physioflow/infrastructure/homelab/k8s/overlays/dev
```

### Verify Deployment
```bash
kubectl get pods -n physioflow-dev
kubectl get svc -n physioflow-dev
kubectl logs -n physioflow-dev deployment/physioflow-web --tail=100
kubectl logs -n physioflow-dev deployment/physioflow-api --tail=100
```

### Check Health Endpoints
```bash
# Via NodePort (from any node)
curl http://192.168.10.60:30200/api/health  # Web health
curl http://192.168.10.60:30201/health      # API health

# Via HAProxy (public URL)
curl https://physioflow-dev.trancloud.work/api/health
```

## Rollback Plan

If deployment fails, rollback using previous image tags:

```bash
kubectl rollout undo deployment/physioflow-web -n physioflow-dev
kubectl rollout undo deployment/physioflow-api -n physioflow-dev
```

## Pre-Deployment Checklist

- [ ] **CRITICAL:** Fix Insurance type definition (web app)
- [ ] **CRITICAL:** Fix ChecklistItem type mismatch (API)
- [ ] Verify Keycloak realm `physioflow-dev` exists
- [ ] Verify Keycloak client `physioflow-web` configured
- [ ] Verify Keycloak client `physioflow-api` configured with secret
- [ ] Verify PostgreSQL database `physioflow` exists
- [ ] Verify MinIO bucket `physioflow-dev` exists
- [ ] Update K8s secrets if credentials changed
- [ ] Test Docker builds locally (both web and API)
- [ ] Tag images with git SHA
- [ ] Push images to registry
- [ ] Backup current production data (if applicable)
- [ ] Notify team of deployment window

## Post-Deployment Verification

- [ ] Web app loads at https://physioflow-dev.trancloud.work
- [ ] API health check responds at https://physioflow-dev.trancloud.work/api/health
- [ ] Can login with Keycloak credentials
- [ ] Database migrations applied successfully
- [ ] API can connect to PostgreSQL
- [ ] API can connect to MinIO/S3
- [ ] Logs show no critical errors
- [ ] Resource usage within limits (memory/CPU)

## Next Steps

1. **Immediate:** Fix the blocking compilation errors
   - Web: Insurance type definition
   - API: ChecklistItem/AssessmentChecklistItem alignment

2. **After fixes:** Re-run Docker builds and verify success

3. **Testing:** Test images locally before pushing to registry
   ```bash
   # Test API locally
   docker run --rm -p 8080:8080 \
     -e DATABASE_URL="postgresql://..." \
     -e KEYCLOAK_URL="..." \
     registry.trancloud.work/physioflow-api:dev

   # Test Web locally
   docker run --rm -p 3000:3000 \
     registry.trancloud.work/physioflow-web:dev
   ```

4. **Push to Registry:** Only after local testing confirms images work

5. **Deploy to K8s:** Apply manifests and monitor rollout

6. **Smoke Testing:** Verify all features work in dev environment

## Notes

- All K8s manifests use Kustomize for environment-specific configuration
- Next.js `NEXT_PUBLIC_*` variables are baked at build time (must rebuild to change)
- API uses environment variables at runtime (can update via ConfigMap/Secret)
- Current image registry uses `registry.trancloud.work` (port 443, not 5000)
- Kustomization uses `registry.trancloud.work:5000` - may need correction

## Files Modified

1. `/home/dang/dev/physioflow/apps/api/Dockerfile` - Port fixes, removed wkhtmltopdf, path corrections
2. `/home/dang/dev/physioflow/apps/web/Dockerfile` - (no changes, already correct)
3. `/home/dang/dev/physioflow/apps/web/src/components/ui/table.tsx` - Added shadcn component
4. `/home/dang/dev/physioflow/apps/web/src/app/[locale]/billing/claims/page.tsx` - Fixed unused imports
5. `/home/dang/dev/physioflow/infrastructure/homelab/k8s/base/deployment-api.yaml` - Port 8080
6. `/home/dang/dev/physioflow/infrastructure/homelab/k8s/base/service-api.yaml` - Port 8080
7. `/home/dang/dev/physioflow/infrastructure/homelab/k8s/overlays/dev/nodeport-services.yaml` - Port 8080
8. `/home/dang/dev/physioflow/infrastructure/homelab/k8s/overlays/dev/configmap-patch.yaml` - Added PORT env var
9. `/home/dang/dev/physioflow/trancloud-ca.crt` - Created placeholder

## Known Issues

1. **Registry URL Mismatch:** Kustomization uses `registry.trancloud.work:5000` but actual registry may be on port 443/5000
   - Verify correct port with: `docker login registry.trancloud.work`

2. **PDF Generation:** Removed wkhtmltopdf from API - will need alternative (future enhancement)

3. **Database Migration:** Init container uses placeholder - need to implement actual migration command

4. **Health Check Paths:** Web deployment uses `/api/health` but this may be Next.js API route, not the main API service

---

**Document Created:** 2026-02-11
**Last Updated:** 2026-02-11
**Status:** Code fixes required before deployment can proceed
