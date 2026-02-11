# PhysioFlow Deployment Quick Reference

**Last Updated:** 2026-02-11

---

## Common Commands

### Deploy (No Database Changes)

```bash
# Build and push
docker build -t registry.trancloud.work/physioflow-api:v1.2.3 -f apps/api/Dockerfile .
docker push registry.trancloud.work/physioflow-api:v1.2.3

# Deploy
cd /home/dang/dev/physioflow/infrastructure/homelab/scripts
./blue-green-deploy.sh dev v1.2.3
```

### Deploy with Migrations

```bash
# Build and push
docker build -t registry.trancloud.work/physioflow-api:v1.2.3 -f apps/api/Dockerfile .
docker push registry.trancloud.work/physioflow-api:v1.2.3

# Deploy
export POSTGRES_PASSWORD="<password>"
cd /home/dang/dev/physioflow/infrastructure/homelab/scripts
./deploy-with-migration.sh dev v1.2.3
```

### Quick Rollback (App Only)

```bash
# Switch to previous version
CURRENT=$(kubectl get svc physioflow-api -n physioflow-dev -o jsonpath='{.spec.selector.version}')
PREVIOUS=$([ "$CURRENT" = "blue" ] && echo "green" || echo "blue")
kubectl patch svc physioflow-api -n physioflow-dev -p "{\"spec\":{\"selector\":{\"version\":\"$PREVIOUS\"}}}"
kubectl scale deployment/physioflow-api-$PREVIOUS --replicas=1 -n physioflow-dev
```

### Full Rollback (App + Database)

```bash
export POSTGRES_PASSWORD="<password>"
cd /home/dang/dev/physioflow/infrastructure/homelab/scripts
./db-rollback.sh dev /tmp/physioflow-backups/<backup-file>.tar.gz
kubectl patch svc physioflow-api -n physioflow-dev -p '{"spec":{"selector":{"version":"blue"}}}'
kubectl scale deployment/physioflow-api-blue --replicas=1 -n physioflow-dev
```

---

## Script Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `blue-green-deploy.sh` | Deploy new version with zero downtime | `./blue-green-deploy.sh <env> <tag> [--skip-tests]` |
| `smoke-tests.sh` | Verify API health | `./smoke-tests.sh <api-url>` |
| `db-backup.sh` | Create database backup | `./db-backup.sh <env> [label]` |
| `db-rollback.sh` | Restore database from backup | `./db-rollback.sh <env> <backup-file>` |
| `deploy-with-migration.sh` | Deploy with database migrations | `./deploy-with-migration.sh <env> <tag> [migration-version]` |

---

## Verification Commands

```bash
# Check current active version
kubectl get svc physioflow-api -n physioflow-dev -o jsonpath='{.spec.selector.version}'

# Check pod status
kubectl get pods -n physioflow-dev -l component=api

# Check deployment replicas
kubectl get deployments -n physioflow-dev -l component=api

# Check migration version (database)
export PGPASSWORD="<password>"
psql -h 192.168.10.24 -U emr -d physioflow_dev -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# Check migration version (configmap)
kubectl get configmap migration-version -n physioflow-dev -o jsonpath='{.data.current_version}'

# Check API health
curl https://physioflow-dev.trancloud.work/api/health

# View logs
kubectl logs -f deployment/physioflow-api-green -n physioflow-dev
```

---

## Environment Endpoints

| Environment | Web | API |
|-------------|-----|-----|
| Dev | https://physioflow-dev.trancloud.work | https://physioflow-dev.trancloud.work/api |
| Staging | https://physioflow-staging.trancloud.work | https://physioflow-staging.trancloud.work/api |
| Prod | https://physioflow.trancloud.work | https://physioflow.trancloud.work/api |

---

## Database Access

```bash
# Development
export PGPASSWORD="<password>"
psql -h 192.168.10.24 -p 5432 -U emr -d physioflow_dev

# Staging
psql -h 192.168.10.24 -p 5432 -U emr -d physioflow_staging

# Production
psql -h 192.168.10.24 -p 5432 -U emr -d physioflow_prod
```

---

## MinIO Backup Access

```bash
# Configure MinIO client (once)
mc alias set trancloud http://192.168.10.25:9000 <access-key> <secret-key>

# List backups
mc ls trancloud/physioflow-backups-dev/
mc ls trancloud/physioflow-backups-staging/
mc ls trancloud/physioflow-backups-prod/

# Download backup
mc cp trancloud/physioflow-backups-dev/backup.tar.gz /tmp/
```

---

## Troubleshooting

### Smoke Tests Failing

```bash
# Get pod IP
POD_IP=$(kubectl get pod -n physioflow-dev -l version=green -o jsonpath='{.items[0].status.podIP}')

# Test manually
curl http://$POD_IP:7011/health
curl http://$POD_IP:7011/ready

# Check logs
kubectl logs -n physioflow-dev -l version=green --tail=100
```

### Pod Not Starting

```bash
# Describe pod
kubectl describe pod -n physioflow-dev -l version=green

# Check events
kubectl get events -n physioflow-dev --sort-by='.lastTimestamp' | tail -20

# Check resource usage
kubectl top pods -n physioflow-dev
```

### Database Connection Issues

```bash
# Test from pod
kubectl run -it --rm psql-test --image=postgres:16 --restart=Never -- \
  psql -h 192.168.10.24 -U emr -d physioflow_dev

# Check secrets
kubectl get secret physioflow-secrets -n physioflow-dev -o jsonpath='{.data}' | jq
```

### Migration Failed

```bash
# Check migration status
psql -h 192.168.10.24 -U emr -d physioflow_dev -c "SELECT * FROM schema_migrations ORDER BY version DESC;"

# View PostgreSQL logs
ssh 192.168.10.24
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

---

## Emergency Procedures

### P0 Production Outage

```bash
# 1. Immediate rollback
kubectl patch svc physioflow-api -n physioflow-prod -p '{"spec":{"selector":{"version":"blue"}}}'
kubectl scale deployment/physioflow-api-blue --replicas=2 -n physioflow-prod

# 2. Verify
kubectl get pods -n physioflow-prod -l component=api
curl https://physioflow.trancloud.work/api/health

# 3. If database needs rollback
export POSTGRES_PASSWORD="<password>"
cd /home/dang/dev/physioflow/infrastructure/homelab/scripts
./db-rollback.sh prod <latest-backup>

# 4. Notify team
# Post in Slack #incident-response
# Update status page
```

### Database Corruption

```bash
# 1. Stop all API pods
kubectl scale deployment/physioflow-api-blue --replicas=0 -n physioflow-dev
kubectl scale deployment/physioflow-api-green --replicas=0 -n physioflow-dev

# 2. Find latest backup
ls -lah /tmp/physioflow-backups/ | grep dev
mc ls trancloud/physioflow-backups-dev/

# 3. Restore
export POSTGRES_PASSWORD="<password>"
./db-rollback.sh dev <backup-file>

# 4. Restart API
kubectl scale deployment/physioflow-api-blue --replicas=1 -n physioflow-dev
kubectl patch svc physioflow-api -n physioflow-dev -p '{"spec":{"selector":{"version":"blue"}}}'
```

---

## Monitoring

### Grafana Dashboards

- **URL:** https://grafana.trancloud.work
- **Dashboard:** PhysioFlow API
- **Metrics:**
  - Request rate
  - Error rate
  - Response latency
  - Pod resource usage

### Prometheus Queries

```promql
# Request rate
rate(http_requests_total{namespace="physioflow-dev"}[5m])

# Error rate
rate(http_requests_total{status=~"5..", namespace="physioflow-dev"}[5m])

# Pod restarts
kube_pod_container_status_restarts_total{namespace="physioflow-dev"}

# Memory usage
container_memory_usage_bytes{namespace="physioflow-dev", container="api"}
```

---

## File Locations

```
/home/dang/dev/physioflow/
├── infrastructure/
│   ├── homelab/
│   │   ├── k8s/
│   │   │   ├── base/
│   │   │   │   ├── deployment-api-blue.yaml
│   │   │   │   ├── deployment-api-green.yaml
│   │   │   │   ├── service-api.yaml
│   │   │   │   └── configmap-migration-version.yaml
│   │   │   └── overlays/
│   │   │       ├── dev/
│   │   │       ├── staging/
│   │   │       └── prod/
│   │   ├── scripts/
│   │   │   ├── blue-green-deploy.sh
│   │   │   ├── smoke-tests.sh
│   │   │   ├── db-backup.sh
│   │   │   ├── db-rollback.sh
│   │   │   └── deploy-with-migration.sh
│   │   ├── DEPLOYMENT_RUNBOOK.md
│   │   ├── BLUE_GREEN_DEPLOYMENT_SUMMARY.md
│   │   └── QUICK_REFERENCE.md
│   └── db/
│       └── migrations/
│           ├── 005_bhyt_insurance_enhancement.sql
│           ├── 006_outcome_measures_tables.sql
│           ├── ...
│           └── rollback/
│               ├── 005_down.sql
│               ├── 006_down.sql
│               └── ...
└── apps/
    ├── api/
    │   └── Dockerfile
    └── web/
        └── Dockerfile
```

---

## Backup Locations

```bash
# Local backups
/tmp/physioflow-backups/

# MinIO backups
trancloud/physioflow-backups-dev/
trancloud/physioflow-backups-staging/
trancloud/physioflow-backups-prod/
```

---

## Documentation

- **Deployment Runbook:** `infrastructure/homelab/DEPLOYMENT_RUNBOOK.md`
- **Implementation Summary:** `infrastructure/homelab/BLUE_GREEN_DEPLOYMENT_SUMMARY.md`
- **Scripts Guide:** `infrastructure/homelab/scripts/README.md`
- **Rollback Guide:** `infrastructure/db/migrations/rollback/README.md`
- **Quick Reference:** This file

---

## Support

For issues or questions:
1. Check DEPLOYMENT_RUNBOOK.md
2. Review script output for error messages
3. Check pod logs: `kubectl logs -n <namespace> <pod>`
4. Verify database connectivity
5. Contact DevOps team in #physioflow-ops

---

**Keep this file handy for quick reference during deployments!**
