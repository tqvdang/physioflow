# Quick Deployment Reference

## Blue-Green Deployment Commands

### Development

```bash
# Full deployment (API + Web)
make deploy-blue-green ENV=dev API_TAG=v1.2.3 WEB_TAG=v1.2.3

# API only
make deploy-blue-green-api ENV=dev TAG=v1.2.3

# Run smoke tests
make deploy-smoke-test ENV=dev
```

### Staging

```bash
# Full deployment
make deploy-blue-green ENV=staging API_TAG=v1.2.3 WEB_TAG=v1.2.3

# With smoke tests
./infrastructure/homelab/scripts/blue-green-deploy-full.sh staging v1.2.3 v1.2.3

# Skip tests (not recommended)
./infrastructure/homelab/scripts/blue-green-deploy-full.sh staging v1.2.3 v1.2.3 --skip-tests
```

### Production

```bash
# Set database password
export POSTGRES_PASSWORD="<from-infrastructure.yaml>"

# Full deployment (will prompt for confirmation)
make deploy-blue-green ENV=prod API_TAG=v1.2.3 WEB_TAG=v1.2.3

# Direct script (requires typing "DEPLOY")
./infrastructure/homelab/scripts/blue-green-deploy-full.sh prod v1.2.3 v1.2.3
```

## Rollback Commands

### Quick Rollback

```bash
# Rollback via Makefile
make deploy-rollback ENV=prod

# Manual rollback
CURRENT=$(kubectl get svc physioflow-api -n physioflow-prod -o jsonpath='{.spec.selector.version}')
PREVIOUS=$([ "$CURRENT" = "blue" ] && echo "green" || echo "blue")

kubectl patch svc physioflow-api -n physioflow-prod -p "{\"spec\":{\"selector\":{\"version\":\"$PREVIOUS\"}}}"
kubectl patch svc physioflow-web -n physioflow-prod -p "{\"spec\":{\"selector\":{\"version\":\"$PREVIOUS\"}}}"
kubectl scale deployment/physioflow-api-$PREVIOUS --replicas=2 -n physioflow-prod
kubectl scale deployment/physioflow-web-$PREVIOUS --replicas=1 -n physioflow-prod
```

### Database Rollback

```bash
export POSTGRES_PASSWORD="<password>"
./infrastructure/homelab/scripts/db-rollback.sh prod <backup-file>
```

## Database Management

### Create Backup

```bash
export POSTGRES_PASSWORD="<password>"
./infrastructure/homelab/scripts/db-backup.sh prod pre-deployment-$(date +%Y%m%d)
```

### Deploy with Migration

```bash
export POSTGRES_PASSWORD="<password>"
./infrastructure/homelab/scripts/deploy-with-migration.sh prod v1.2.3 027
```

## Monitoring

### Check Deployment Status

```bash
# All environments
make homelab-status

# Specific environment
kubectl get pods -n physioflow-prod
kubectl get svc -n physioflow-prod
```

### View Logs

```bash
# API logs
kubectl logs -f -n physioflow-prod -l component=api,version=green

# Web logs
kubectl logs -f -n physioflow-prod -l component=web,version=green

# All logs
kubectl logs -f -n physioflow-prod -l app=physioflow
```

### Check Active Version

```bash
kubectl get svc physioflow-api -n physioflow-prod -o jsonpath='{.spec.selector.version}'
kubectl get svc physioflow-web -n physioflow-prod -o jsonpath='{.spec.selector.version}'
```

## Feature Flags

### List All Flags

```bash
curl https://physioflow.trancloud.work/api/v1/feature-flags
```

### Enable Feature (Gradual Rollout)

```bash
# 25% of users
curl -X PATCH https://physioflow.trancloud.work/api/v1/feature-flags/1 \
  -H "Content-Type: application/json" \
  -d '{"rollout_percentage": 25, "enabled": true}'

# 100% of users
curl -X PATCH https://physioflow.trancloud.work/api/v1/feature-flags/1 \
  -H "Content-Type: application/json" \
  -d '{"rollout_percentage": 100}'
```

### Disable Feature

```bash
curl -X PATCH https://physioflow.trancloud.work/api/v1/feature-flags/1 \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Check Audit Log

```bash
curl https://physioflow.trancloud.work/api/v1/feature-flags/1/audit-log
```

## Testing

### Smoke Tests

```bash
# Via Makefile
make deploy-smoke-test ENV=prod

# Direct
./infrastructure/homelab/scripts/smoke-tests.sh https://physioflow.trancloud.work/api
```

### Full Test Suite

```bash
# Unit tests
make test

# Integration tests
make test-api

# E2E tests
make test-e2e
```

## Build & Push Images

### Development

```bash
# API
docker build -t registry.trancloud.work/physioflow-api:dev-$(date +%Y%m%d) \
  -f apps/api/Dockerfile .
docker push registry.trancloud.work/physioflow-api:dev-$(date +%Y%m%d)

# Web
docker build -t registry.trancloud.work/physioflow-web:dev-$(date +%Y%m%d) \
  --build-arg NEXT_PUBLIC_API_URL=https://physioflow-dev.trancloud.work/api \
  --build-arg NEXT_PUBLIC_KEYCLOAK_URL=https://keycloak.trancloud.work \
  --build-arg NEXT_PUBLIC_KEYCLOAK_REALM=physioflow-dev \
  -f apps/web/Dockerfile .
docker push registry.trancloud.work/physioflow-web:dev-$(date +%Y%m%d)
```

### Production

```bash
# API
docker build -t registry.trancloud.work/physioflow-api:v1.2.3 \
  -f apps/api/Dockerfile .
docker push registry.trancloud.work/physioflow-api:v1.2.3

# Web
docker build -t registry.trancloud.work/physioflow-web:v1.2.3 \
  --build-arg NEXT_PUBLIC_API_URL=https://physioflow.trancloud.work/api \
  --build-arg NEXT_PUBLIC_KEYCLOAK_URL=https://keycloak.trancloud.work \
  --build-arg NEXT_PUBLIC_KEYCLOAK_REALM=physioflow-prod \
  -f apps/web/Dockerfile .
docker push registry.trancloud.work/physioflow-web:v1.2.3
```

## Common Issues

### Deployment Stuck

```bash
# Check pod events
kubectl describe pod -n physioflow-prod <pod-name>

# Check image pull
kubectl get events -n physioflow-prod --sort-by='.lastTimestamp'

# Force rollout restart
kubectl rollout restart deployment/physioflow-api-green -n physioflow-prod
```

### Pod Not Ready

```bash
# Check readiness probe
kubectl describe pod -n physioflow-prod <pod-name> | grep -A 10 Readiness

# Check logs
kubectl logs -n physioflow-prod <pod-name>

# Port-forward for direct access
kubectl port-forward -n physioflow-prod <pod-name> 8080:8080
curl http://localhost:8080/health
```

### Database Connection Failed

```bash
# Test from pod
kubectl exec -it -n physioflow-prod <pod-name> -- sh
nc -zv 192.168.10.24 5432

# Test from local machine
export PGPASSWORD="<password>"
psql -h 192.168.10.24 -U emr -d physioflow_prod -c "SELECT 1;"
```

## Environment URLs

| Environment | Web | API |
|-------------|-----|-----|
| Dev | https://physioflow-dev.trancloud.work | https://physioflow-dev.trancloud.work/api |
| Staging | https://physioflow-staging.trancloud.work | https://physioflow-staging.trancloud.work/api |
| Production | https://physioflow.trancloud.work | https://physioflow.trancloud.work/api |

## Infrastructure

| Service | Host | Port | Credentials |
|---------|------|------|-------------|
| PostgreSQL | 192.168.10.24 | 5432 | emr / (see infrastructure.yaml) |
| MinIO | 192.168.10.25 | 9000 | (see infrastructure.yaml) |
| Keycloak | keycloak.trancloud.work | 443 | (see infrastructure.yaml) |
| Registry | registry.trancloud.work | 443 | - |

## Need Help?

- **Deployment Guide**: `/infrastructure/homelab/DEPLOYMENT_GUIDE.md`
- **Scripts README**: `/infrastructure/homelab/scripts/README.md`
- **Rollback Procedures**: `/infrastructure/db/ROLLBACK.md`
- **Full Documentation**: `/infrastructure/homelab/BLUE_GREEN_DEPLOYMENT.md`
