# PhysioFlow Blue-Green Deployment Guide

This guide explains how to use PhysioFlow's blue-green deployment system for zero-downtime production releases.

## Overview

PhysioFlow uses a blue-green deployment strategy to achieve zero-downtime deployments:

- **Blue** and **Green** environments run simultaneously in the same namespace
- Only one environment (blue or green) receives live traffic at a time
- New versions deploy to the inactive environment
- Traffic switches only after smoke tests pass
- Automatic rollback on failure
- Old version kept running for quick rollback

## Architecture

```
                    ┌─────────────┐
                    │   HAProxy   │
                    │  Load Bal.  │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │  K8s Service│
                    │  (selector) │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
         ┌────▼────┐              ┌────▼────┐
         │  Blue   │              │  Green  │
         │ Deployment│            │ Deployment│
         └─────────┘              └─────────┘
      (active: v1.2.2)          (inactive/new: v1.2.3)
```

## Deployment Process

### Step 1: Detect Active Version

The script automatically detects which version (blue or green) is currently active by checking the service selector.

```bash
# Current active version
kubectl get svc physioflow-api -n physioflow-prod -o jsonpath='{.spec.selector.version}'
# Output: blue
```

### Step 2: Deploy to Inactive Version

New image is deployed to the inactive deployment (in this case, green).

```bash
kubectl set image deployment/physioflow-api-green \
  api=registry.trancloud.work/physioflow-api:v1.2.3 \
  -n physioflow-prod
```

### Step 3: Run Smoke Tests

Before switching traffic, smoke tests run against the new deployment:

- Health check endpoint
- BHYT insurance validation
- Outcome measures library
- Service codes
- Clinical protocols
- Medical terms search
- Database connectivity

### Step 4: Switch Traffic

If smoke tests pass, the service selector switches to the new version:

```bash
kubectl patch svc physioflow-api -n physioflow-prod \
  -p '{"spec":{"selector":{"version":"green"}}}'
```

Traffic now flows to the green deployment.

### Step 5: Monitor

The script monitors the new deployment for 5 minutes:

- Pod status (must stay Running)
- Restart count (must be 0)
- Error logs (threshold: < 10 errors/interval)

If issues detected, automatic rollback occurs.

### Step 6: Scale Down Old Version

After successful monitoring, the old version scales to 0 replicas but remains available for quick rollback.

## Usage Examples

### Deploy Development Environment

```bash
# Build and push images
docker build -t registry.trancloud.work/physioflow-api:dev-20260211 \
  -f apps/api/Dockerfile .
docker push registry.trancloud.work/physioflow-api:dev-20260211

docker build -t registry.trancloud.work/physioflow-web:dev-20260211 \
  --build-arg NEXT_PUBLIC_API_URL=https://physioflow-dev.trancloud.work/api \
  --build-arg NEXT_PUBLIC_KEYCLOAK_URL=https://keycloak.trancloud.work \
  --build-arg NEXT_PUBLIC_KEYCLOAK_REALM=physioflow-dev \
  -f apps/web/Dockerfile .
docker push registry.trancloud.work/physioflow-web:dev-20260211

# Deploy both API and Web
cd infrastructure/homelab/scripts
./blue-green-deploy-full.sh dev dev-20260211 dev-20260211
```

### Deploy Staging Environment

```bash
# Tag and push release candidate
docker tag registry.trancloud.work/physioflow-api:dev-20260211 \
  registry.trancloud.work/physioflow-api:v1.2.3-rc1
docker push registry.trancloud.work/physioflow-api:v1.2.3-rc1

docker tag registry.trancloud.work/physioflow-web:dev-20260211 \
  registry.trancloud.work/physioflow-web:v1.2.3-rc1
docker push registry.trancloud.work/physioflow-web:v1.2.3-rc1

# Deploy to staging
./blue-green-deploy-full.sh staging v1.2.3-rc1 v1.2.3-rc1

# Run full test suite against staging
cd ../../..
pnpm test-e2e
```

### Deploy Production Environment

```bash
# Tag final release
docker tag registry.trancloud.work/physioflow-api:v1.2.3-rc1 \
  registry.trancloud.work/physioflow-api:v1.2.3
docker push registry.trancloud.work/physioflow-api:v1.2.3

docker tag registry.trancloud.work/physioflow-web:v1.2.3-rc1 \
  registry.trancloud.work/physioflow-web:v1.2.3
docker push registry.trancloud.work/physioflow-web:v1.2.3

# Trigger GitHub Actions staging gate (optional)
# This runs full test suite and requires manual approval

# Deploy to production
cd infrastructure/homelab/scripts
export POSTGRES_PASSWORD="<from-infrastructure.yaml>"
./blue-green-deploy-full.sh prod v1.2.3 v1.2.3

# Script will:
# 1. Prompt for confirmation (type "DEPLOY")
# 2. Create database backup
# 3. Deploy to inactive environment
# 4. Run smoke tests
# 5. Switch traffic
# 6. Monitor for 5 minutes
# 7. Scale down old version
```

## Database Migrations

When deploying with database schema changes:

```bash
# Use the deploy-with-migration script instead
./deploy-with-migration.sh prod v1.2.3 027

# This script:
# 1. Creates database backup
# 2. Applies migrations up to version 027
# 3. Runs blue-green deployment
# 4. Updates migration version tracking
# 5. Rollback on any failure
```

## Rollback Procedures

### Quick Rollback (Application Only)

Switch traffic back to the previous version:

```bash
# Get current and previous versions
CURRENT=$(kubectl get svc physioflow-api -n physioflow-prod -o jsonpath='{.spec.selector.version}')
PREVIOUS=$([ "$CURRENT" = "blue" ] && echo "green" || echo "blue")

# Switch traffic
kubectl patch svc physioflow-api -n physioflow-prod \
  -p "{\"spec\":{\"selector\":{\"version\":\"$PREVIOUS\"}}}"
kubectl patch svc physioflow-web -n physioflow-prod \
  -p "{\"spec\":{\"selector\":{\"version\":\"$PREVIOUS\"}}}"

# Scale up previous version if needed
kubectl scale deployment/physioflow-api-$PREVIOUS --replicas=2 -n physioflow-prod
kubectl scale deployment/physioflow-web-$PREVIOUS --replicas=1 -n physioflow-prod
```

### Full Rollback (Application + Database)

Rollback both application and database:

```bash
# 1. Switch traffic to old version (see above)

# 2. Rollback database
export POSTGRES_PASSWORD="<password>"
./db-rollback.sh prod prod_pre-deployment-v1.2.3_20260211_103000.tar.gz

# 3. Verify
curl https://physioflow.trancloud.work/api/health
```

## Monitoring During Deployment

### Watch Pod Status

```bash
watch kubectl get pods -n physioflow-prod -l app=physioflow
```

### View Logs

```bash
# API logs
kubectl logs -f -n physioflow-prod -l component=api,version=green

# Web logs
kubectl logs -f -n physioflow-prod -l component=web,version=green
```

### Check Service Routing

```bash
kubectl get svc physioflow-api -n physioflow-prod -o yaml | grep -A 5 selector
```

## Feature Flags

Use feature flags for gradual feature rollout:

```bash
# Check feature flag status
curl https://physioflow.trancloud.work/api/v1/feature-flags

# Enable feature for 50% of users
curl -X PATCH https://physioflow.trancloud.work/api/v1/feature-flags/1 \
  -H "Content-Type: application/json" \
  -d '{"rollout_percentage": 50, "enabled": true}'

# Enable feature for all users
curl -X PATCH https://physioflow.trancloud.work/api/v1/feature-flags/1 \
  -H "Content-Type: application/json" \
  -d '{"rollout_percentage": 100, "enabled": true}'
```

## Troubleshooting

### Deployment Stuck at Rollout

```bash
# Check pod events
kubectl describe pod -n physioflow-prod <pod-name>

# Check image pull status
kubectl get events -n physioflow-prod --sort-by='.lastTimestamp'
```

### Smoke Tests Failing

```bash
# Run smoke tests manually
POD_IP=$(kubectl get pod -n physioflow-prod -l version=green -o jsonpath='{.items[0].status.podIP}')
./smoke-tests.sh http://$POD_IP:8080

# Check specific endpoint
curl http://$POD_IP:8080/health
curl http://$POD_IP:8080/ready
```

### High Error Rate After Deployment

```bash
# Check logs for errors
kubectl logs -n physioflow-prod -l version=green --tail=100 | grep -i error

# Rollback immediately
kubectl patch svc physioflow-api -n physioflow-prod \
  -p '{"spec":{"selector":{"version":"blue"}}}'
```

## Best Practices

1. **Always test in dev first** - Deploy to dev and staging before production
2. **Use semantic versioning** - Tag images as v1.2.3, not latest
3. **Create backups before migrations** - Always backup production database
4. **Monitor after deployment** - Watch metrics for 15-30 minutes post-deployment
5. **Keep old version running** - Don't scale to 0 immediately, wait 24 hours
6. **Use feature flags** - Gradual rollout for risky features
7. **Document changes** - Update CHANGELOG.md with each release
8. **Run staging gate** - Use GitHub Actions workflow for production deploys

## Deployment Checklist

- [ ] Code reviewed and merged to main
- [ ] Tests passing (unit, integration, e2e)
- [ ] Images built and pushed to registry
- [ ] Deployed to dev environment
- [ ] Deployed to staging environment
- [ ] Staging gate workflow passed (for production)
- [ ] Database backup created (for production)
- [ ] Migration scripts tested (if applicable)
- [ ] Release notes prepared
- [ ] Team notified of deployment window
- [ ] Production deployment executed
- [ ] Smoke tests passed
- [ ] Monitoring shows healthy metrics
- [ ] Documentation updated

## Environment URLs

| Environment | Web | API | Keycloak |
|-------------|-----|-----|----------|
| Dev | https://physioflow-dev.trancloud.work | https://physioflow-dev.trancloud.work/api | https://keycloak.trancloud.work (realm: physioflow-dev) |
| Staging | https://physioflow-staging.trancloud.work | https://physioflow-staging.trancloud.work/api | https://keycloak.trancloud.work (realm: physioflow-staging) |
| Production | https://physioflow.trancloud.work | https://physioflow.trancloud.work/api | https://keycloak.trancloud.work (realm: physioflow-prod) |

## Support

For deployment issues:
1. Check script logs and error messages
2. Review pod logs: `kubectl logs -n <namespace> <pod>`
3. Check service routing: `kubectl get svc -n <namespace>`
4. Verify database connectivity
5. Review deployment runbook: `scripts/README.md`
6. Consult infrastructure reference: `/home/dang/dev/infrastructure.yaml`
