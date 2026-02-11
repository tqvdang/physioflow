# PhysioFlow Deployment Runbook

## Overview

This runbook provides step-by-step procedures for deploying PhysioFlow using blue-green deployment strategy with zero-downtime database migrations.

**Last Updated:** 2026-02-11

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Standard Deployment](#standard-deployment)
3. [Deployment with Database Migrations](#deployment-with-database-migrations)
4. [Rollback Procedures](#rollback-procedures)
5. [Emergency Rollback](#emergency-rollback)
6. [Troubleshooting](#troubleshooting)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Incident Response](#incident-response)

---

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] Code has been peer-reviewed and approved
- [ ] All tests pass (unit, integration, e2e)
- [ ] Docker images have been built and pushed to registry
- [ ] Database backup has been created (automatic in deployment script)
- [ ] Deployment window has been communicated (for prod)
- [ ] Rollback plan is understood
- [ ] On-call engineer is available

### Environment URLs

| Environment | Web | API |
|-------------|-----|-----|
| Dev | https://physioflow-dev.trancloud.work | https://physioflow-dev.trancloud.work/api |
| Staging | https://physioflow-staging.trancloud.work | https://physioflow-staging.trancloud.work/api |
| Production | https://physioflow.trancloud.work | https://physioflow.trancloud.work/api |

### Access Requirements

- SSH access to k3s-master (192.168.10.60)
- kubectl configured with appropriate context
- Database credentials (stored in environment variables)
- MinIO credentials (for backup access)

---

## Standard Deployment

Use this for deployments **without** database migrations.

### 1. Build and Push Images

```bash
# From project root
cd /home/dang/dev/physioflow

# Build API image
docker build -t registry.trancloud.work/physioflow-api:v1.2.3 -f apps/api/Dockerfile .

# Build Web image (with environment variables)
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://physioflow-dev.trancloud.work/api \
  --build-arg NEXT_PUBLIC_APP_URL=https://physioflow-dev.trancloud.work \
  --build-arg NEXT_PUBLIC_KEYCLOAK_URL=https://keycloak.trancloud.work \
  --build-arg NEXT_PUBLIC_KEYCLOAK_REALM=physioflow-dev \
  --build-arg NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=physioflow-web \
  -t registry.trancloud.work/physioflow-web:v1.2.3 \
  -f apps/web/Dockerfile .

# Push images
docker push registry.trancloud.work/physioflow-api:v1.2.3
docker push registry.trancloud.work/physioflow-web:v1.2.3
```

### 2. Run Blue-Green Deployment

```bash
# SSH to k3s-master
ssh k3s-master

# Navigate to scripts directory
cd /home/dang/dev/physioflow/infrastructure/homelab/scripts

# Run blue-green deployment
./blue-green-deploy.sh dev v1.2.3
```

The script will:
1. Detect current active version (blue/green)
2. Deploy to inactive version
3. Run smoke tests
4. Switch traffic to new version
5. Monitor for 5 minutes
6. Scale down old version

### 3. Monitor Deployment

Watch the deployment progress:

```bash
# Watch pods
kubectl get pods -n physioflow-dev -w

# Check logs
kubectl logs -f deployment/physioflow-api-green -n physioflow-dev

# Check service selector
kubectl get svc physioflow-api -n physioflow-dev -o jsonpath='{.spec.selector}'
```

---

## Deployment with Database Migrations

Use this for deployments **with** database schema changes.

### 1. Prepare Migration Files

Ensure migration files are in `infrastructure/db/migrations/`:

```bash
ls -la infrastructure/db/migrations/
# Should show: 001_initial_schema.sql, 002_..., etc.
```

### 2. Create Rollback Scripts

Ensure rollback scripts exist in `infrastructure/db/migrations/rollback/`:

```bash
ls -la infrastructure/db/migrations/rollback/
# Should show: 005_down.sql, 006_down.sql, etc.
```

### 3. Run Deployment with Migration

```bash
# SSH to k3s-master
ssh k3s-master

# Set database password
export POSTGRES_PASSWORD="<password-from-infrastructure.yaml>"

# Navigate to scripts directory
cd /home/dang/dev/physioflow/infrastructure/homelab/scripts

# Run deployment with migrations
./deploy-with-migration.sh dev v1.2.3 015
```

The script will:
1. Check database connectivity
2. Detect current migration version
3. Create database backup
4. Apply new migrations
5. Perform blue-green deployment
6. Update migration version tracking
7. Verify deployment

### 4. Verify Migration

```bash
# Connect to database
export PGPASSWORD="<password>"
psql -h 192.168.10.24 -U emr -d physioflow_dev

# Check migration version
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;

# Verify new tables/columns
\dt
\d+ <table_name>
```

---

## Rollback Procedures

### Scenario 1: Rollback Application Only (No DB Changes)

If the deployment fails but database hasn't changed:

```bash
# Get current active version
CURRENT=$(kubectl get svc physioflow-api -n physioflow-dev -o jsonpath='{.spec.selector.version}')

# Determine previous version
PREVIOUS=$([ "$CURRENT" = "blue" ] && echo "green" || echo "blue")

# Switch traffic back
kubectl patch svc physioflow-api -n physioflow-dev \
  -p "{\"spec\":{\"selector\":{\"version\":\"$PREVIOUS\"}}}"

# Scale up previous version
kubectl scale deployment/physioflow-api-$PREVIOUS --replicas=1 -n physioflow-dev

# Verify
kubectl get pods -n physioflow-dev -l version=$PREVIOUS
```

### Scenario 2: Rollback Application and Database

If database migrations were applied and need to be reverted:

```bash
# Find the backup file
ls -lah /tmp/physioflow-backups/

# Run database rollback
./db-rollback.sh dev /tmp/physioflow-backups/dev_pre-deploy-v1.2.3_20260211_103045.tar.gz

# The script will:
# 1. Stop all API pods
# 2. Restore database from backup
# 3. Verify migration version

# Scale up previous version
kubectl scale deployment/physioflow-api-blue --replicas=1 -n physioflow-dev

# Switch traffic
kubectl patch svc physioflow-api -n physioflow-dev \
  -p '{"spec":{"selector":{"version":"blue"}}}'
```

### Scenario 3: Manual Migration Rollback

If you need to manually rollback specific migrations:

```bash
# Connect to database
export PGPASSWORD="<password>"
psql -h 192.168.10.24 -U emr -d physioflow_dev

# Run rollback script
\i /home/dang/dev/physioflow/infrastructure/db/migrations/rollback/011_down.sql

# Update schema_migrations table
DELETE FROM schema_migrations WHERE version = '011';

# Verify
SELECT * FROM schema_migrations ORDER BY version DESC;
```

---

## Emergency Rollback

In case of critical production issues:

### 1. Immediate Traffic Switch

```bash
# Switch to previous version immediately (no confirmation)
kubectl patch svc physioflow-api -n physioflow-prod \
  -p '{"spec":{"selector":{"version":"blue"}}}'

# Scale up blue deployment
kubectl scale deployment/physioflow-api-blue --replicas=2 -n physioflow-prod
```

### 2. Database Rollback (if needed)

```bash
# Find latest backup
ls -lah /tmp/physioflow-backups/ | grep prod

# Or download from MinIO
mc ls trancloud/physioflow-backups-prod/

# Run emergency rollback
./db-rollback.sh prod <backup-file>
```

### 3. Notify Team

- Post in Slack: `#physioflow-ops`
- Create incident ticket
- Update status page
- Notify stakeholders

---

## Troubleshooting

### Issue: Smoke Tests Fail

**Symptoms:**
- Blue-green deployment aborts
- "Smoke tests failed" error message

**Resolution:**

1. Check pod logs:
```bash
kubectl logs -n physioflow-dev -l version=green --tail=100
```

2. Check health endpoint manually:
```bash
# Get pod IP
POD_IP=$(kubectl get pod -n physioflow-dev -l version=green -o jsonpath='{.items[0].status.podIP}')

# Test health endpoint
curl http://$POD_IP:7011/health
```

3. Common causes:
   - Database connection failure
   - Missing environment variables
   - Keycloak configuration mismatch
   - Redis connection failure

4. Fix and retry:
```bash
# Fix the issue in manifests
kubectl apply -k infrastructure/homelab/k8s/overlays/dev

# Retry deployment
./blue-green-deploy.sh dev v1.2.3
```

### Issue: Migration Fails

**Symptoms:**
- "Migration failed" error
- Database in inconsistent state

**Resolution:**

1. Check migration error:
```bash
# View recent logs
psql -h 192.168.10.24 -U emr -d physioflow_dev
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;
```

2. The script automatically rolls back, but verify:
```bash
# Check if backup was restored
ls -lah /tmp/physioflow-backups/
```

3. Manual intervention (if needed):
```bash
# Drop failed migration
psql -h 192.168.10.24 -U emr -d physioflow_dev
DELETE FROM schema_migrations WHERE version = '015';

# Fix migration file
vim infrastructure/db/migrations/015_*.sql

# Re-run deployment
./deploy-with-migration.sh dev v1.2.3 015
```

### Issue: Pod Restarts During Monitoring

**Symptoms:**
- Blue-green script detects restarts
- Automatic rollback initiated

**Resolution:**

1. Check pod events:
```bash
kubectl describe pod -n physioflow-dev -l version=green
```

2. Common causes:
   - OOM (Out of Memory) - increase memory limits
   - Crash loop - check application logs
   - Liveness probe failure - adjust probe settings

3. Fix and redeploy:
```bash
# Adjust resources in deployment-api-green.yaml
vim infrastructure/homelab/k8s/base/deployment-api-green.yaml

# Redeploy
./blue-green-deploy.sh dev v1.2.3
```

### Issue: High Error Rate After Deployment

**Symptoms:**
- Monitoring detects high error rate
- Automatic rollback triggered

**Resolution:**

1. Check application logs:
```bash
kubectl logs -n physioflow-dev -l version=green --tail=500 | grep -i error
```

2. Check HAProxy logs (if frontend issues):
```bash
ssh haproxy-server
sudo tail -f /var/log/haproxy.log | grep physioflow
```

3. Analyze error patterns:
   - 5xx errors: Backend/database issues
   - 4xx errors: API contract changes
   - Timeout errors: Performance degradation

### Issue: Database Connection Failure

**Symptoms:**
- Health checks fail
- "Cannot connect to database" errors

**Resolution:**

1. Verify database is running:
```bash
ssh 192.168.10.24
sudo systemctl status postgresql
```

2. Check PostgreSQL logs:
```bash
ssh 192.168.10.24
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

3. Verify connection from k8s:
```bash
kubectl run -it --rm psql-test --image=postgres:16 --restart=Never -- \
  psql -h 192.168.10.24 -U emr -d physioflow_dev
```

4. Check secrets:
```bash
kubectl get secret physioflow-secrets -n physioflow-dev -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d
```

---

## Post-Deployment Verification

After successful deployment, verify:

### 1. Application Health

```bash
# Check all pods are running
kubectl get pods -n physioflow-dev

# Check service endpoint
curl https://physioflow-dev.trancloud.work/api/health

# Check web application
curl -I https://physioflow-dev.trancloud.work
```

### 2. Database State

```bash
# Connect to database
psql -h 192.168.10.24 -U emr -d physioflow_dev

# Verify migration version
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;

# Check table counts
SELECT schemaname, tablename, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC LIMIT 10;

# Check recent data
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;
```

### 3. Monitoring Dashboards

- Grafana: https://grafana.trancloud.work
  - Check "PhysioFlow API" dashboard
  - Verify request rate, error rate, latency
- Prometheus: https://prometheus.trancloud.work
  - Query: `rate(http_requests_total[5m])`
  - Check for anomalies

### 4. Functional Tests

- Login as test user: `therapist@physioflow.local` / `Therapist@123`
- Create a test patient
- Schedule a test appointment
- Complete a visit checklist
- Generate a SOAP note
- Verify BHYT insurance validation

### 5. Performance Verification

```bash
# Run load test (optional)
ab -n 1000 -c 10 https://physioflow-dev.trancloud.work/api/health

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://physioflow-dev.trancloud.work/api/health
```

---

## Incident Response

### Severity Levels

**P0 (Critical):**
- Complete outage
- Data loss
- Security breach

**P1 (High):**
- Partial outage
- Major feature broken
- Performance degradation >50%

**P2 (Medium):**
- Minor feature broken
- Performance degradation <50%
- Non-critical bugs

**P3 (Low):**
- Cosmetic issues
- Feature requests

### Response Procedures

#### P0 Critical Incident

1. **Immediate Actions (0-5 minutes)**
   - Execute emergency rollback
   - Post in `#incident-response` Slack channel
   - Page on-call engineer

2. **Stabilization (5-30 minutes)**
   - Confirm rollback successful
   - Verify system stability
   - Update status page

3. **Investigation (30+ minutes)**
   - Collect logs and metrics
   - Identify root cause
   - Document timeline

4. **Post-Incident (24-48 hours)**
   - Write incident report
   - Conduct blameless postmortem
   - Create action items

#### P1 High Priority Incident

1. Follow emergency rollback if critical functionality affected
2. Notify team in Slack
3. Investigate and implement fix
4. Deploy fix following standard procedures
5. Document incident

### Emergency Contacts

| Role | Contact | Phone | Slack |
|------|---------|-------|-------|
| Tech Lead | Dang | +84-XXX-XXX-XXX | @dang |
| DevOps | TBD | TBD | TBD |
| On-Call | Rotation | PagerDuty | #on-call |
| Database Admin | TBD | TBD | TBD |

### Escalation Path

1. On-call engineer (respond within 15 minutes)
2. Tech lead (respond within 30 minutes)
3. CTO (for P0 incidents, respond within 1 hour)

---

## Appendix

### A. Blue-Green Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                     HAProxy                         │
│         https://physioflow-dev.trancloud.work       │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
           ┌─────────────────────┐
           │  Kubernetes Service │
           │   (selector: blue)  │
           └──────────┬──────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────┐          ┌───────────────┐
│ Blue Deploy   │          │ Green Deploy  │
│ (Active)      │          │ (Inactive)    │
│               │          │               │
│ - 1 replica   │          │ - 0 replicas  │
│ - v1.2.2      │          │ - v1.2.3      │
└───────────────┘          └───────────────┘
        │                           │
        └───────────────┬───────────┘
                        ▼
              ┌──────────────────┐
              │   PostgreSQL     │
              │  192.168.10.24   │
              └──────────────────┘
```

### B. Migration Version Tracking

Migration versions are tracked in:
1. Database: `schema_migrations` table
2. ConfigMap: `migration-version` in namespace
3. Backup metadata: `metadata.json` in backup archive

### C. Backup Retention

- Local backups: Keep last 10 backups
- MinIO backups: Retention policy 30 days
- Production backups: Archive monthly to cold storage

### D. Useful Commands

```bash
# List all deployments in namespace
kubectl get deployments -n physioflow-dev

# Get current service selector
kubectl get svc physioflow-api -n physioflow-dev -o yaml | grep -A 5 selector

# Scale deployment
kubectl scale deployment/physioflow-api-blue --replicas=2 -n physioflow-dev

# Force rollout restart
kubectl rollout restart deployment/physioflow-api-blue -n physioflow-dev

# Watch rollout status
kubectl rollout status deployment/physioflow-api-blue -n physioflow-dev

# Get pod logs
kubectl logs -f deployment/physioflow-api-blue -n physioflow-dev

# Execute command in pod
kubectl exec -it <pod-name> -n physioflow-dev -- /bin/sh

# Port forward to pod
kubectl port-forward <pod-name> -n physioflow-dev 7011:7011

# Get events
kubectl get events -n physioflow-dev --sort-by='.lastTimestamp'
```

---

**Document Version:** 1.0
**Last Updated:** 2026-02-11
**Maintained By:** DevOps Team
