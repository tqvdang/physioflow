# Blue-Green Deployment System - Implementation Summary

This document summarizes the complete blue-green deployment system implemented for PhysioFlow.

## Overview

A complete zero-downtime deployment system has been implemented using Kubernetes blue-green deployment strategy with database migration support, feature flags, and automated rollback capabilities.

## Components Implemented

### 1. Kubernetes Manifests

**Blue-Green Deployments (API)**
- `/infrastructure/homelab/k8s/base/deployment-api-blue.yaml`
- `/infrastructure/homelab/k8s/base/deployment-api-green.yaml`

**Blue-Green Deployments (Web)**
- `/infrastructure/homelab/k8s/base/deployment-web-blue.yaml`
- `/infrastructure/homelab/k8s/base/deployment-web-green.yaml`

**Services with Version Selector**
- `/infrastructure/homelab/k8s/base/service-api.yaml` - Updated with `version: blue` selector
- `/infrastructure/homelab/k8s/base/service-web.yaml` - Updated with `version: blue` selector

**Configuration**
- `/infrastructure/homelab/k8s/base/configmap-feature-flags.yaml` - Feature flag defaults
- `/infrastructure/homelab/k8s/base/configmap-migration-version.yaml` - Migration tracking

### 2. Deployment Scripts

**Blue-Green Deployment Scripts**
- `scripts/blue-green-deploy.sh` - API-only blue-green deployment
- `scripts/blue-green-deploy-full.sh` - Full stack (API + Web) blue-green deployment

**Database Management**
- `scripts/db-backup.sh` - Database backup with MinIO upload
- `scripts/db-rollback.sh` - Database restore from backup
- `scripts/deploy-with-migration.sh` - Deployment with database migrations

**Testing**
- `scripts/smoke-tests.sh` - Automated smoke test suite

### 3. Database Migrations

**Feature Flags System**
- `/infrastructure/db/migrations/027_feature_flags_table.sql`
  - `feature_flags` table with rollout percentage support
  - `feature_flag_audit_log` table for change tracking
  - Default feature flags for all major features

**Rollback Documentation**
- `/infrastructure/db/ROLLBACK.md` - Complete rollback procedures for all migrations

### 4. API Endpoints (Feature Flags)

**Models**
- `/apps/api/internal/model/feature_flag.go`
  - FeatureFlag struct with rollout percentage
  - Consistent hashing for user-based rollout
  - Repository interface

**Handlers**
- `/apps/api/internal/handler/feature_flags.go`
  - GET /api/v1/feature-flags - List all flags
  - GET /api/v1/feature-flags/:name - Get specific flag
  - PATCH /api/v1/feature-flags/:id - Update flag
  - POST /api/v1/feature-flags - Create flag
  - DELETE /api/v1/feature-flags/:id - Delete flag
  - GET /api/v1/feature-flags/:id/audit-log - View changes
  - GET /api/v1/feature-flags/:name/check - Check if enabled for user

### 5. GitHub Actions Workflow

**Staging Gate Workflow**
- `/.github/workflows/staging-gate.yml`
  - Verify staging deployment
  - Run integration tests
  - Security scanning
  - Database migration verification
  - Manual approval for production
  - Automated production deployment

### 6. Documentation

**Deployment Guide**
- `/infrastructure/homelab/DEPLOYMENT_GUIDE.md`
  - Complete blue-green deployment process
  - Usage examples for all environments
  - Rollback procedures
  - Monitoring during deployment
  - Feature flags usage
  - Troubleshooting guide

**Scripts README**
- `/infrastructure/homelab/scripts/README.md`
  - Updated with blue-green deployment instructions
  - All script usage examples
  - Prerequisites and configuration

**Summary Document**
- `/infrastructure/homelab/BLUE_GREEN_DEPLOYMENT.md` (this file)

### 7. Makefile Targets

New targets added to root Makefile:
- `make deploy-blue-green` - Full blue-green deployment (API + Web)
- `make deploy-blue-green-api` - API-only blue-green deployment
- `make deploy-rollback` - Quick rollback to previous version
- `make deploy-smoke-test` - Run smoke tests against environment

## Features Implemented

### Zero-Downtime Deployment

1. **Automatic Version Detection** - Detects current active version (blue/green)
2. **Inactive Environment Deployment** - Deploys new version to inactive environment
3. **Smoke Testing** - Runs comprehensive health checks before traffic switch
4. **Traffic Switching** - Updates service selector to route to new version
5. **Monitoring Period** - 5-minute observation period with automatic rollback
6. **Old Version Retention** - Keeps old version running for quick rollback

### Database Migration Strategy

1. **Pre-Migration Backup** - Automatic backup before any migration
2. **Migration Version Tracking** - Tracks applied migrations in database and ConfigMap
3. **Rollback Procedures** - Documented rollback for each migration
4. **Transaction Handling** - All migrations use BEGIN/COMMIT
5. **Backup Retention** - Keeps last 10 local backups, uploads to MinIO

### Feature Flags System

1. **Database-Backed Flags** - Persistent feature flag storage
2. **Gradual Rollout** - Percentage-based user rollout (0-100%)
3. **Environment Filtering** - Flags can be environment-specific
4. **Audit Trail** - All changes logged with user, IP, timestamp
5. **Consistent Hashing** - Same user always gets same experience
6. **REST API** - Full CRUD operations on feature flags

### Automated Testing

1. **Smoke Tests** - Tests critical API endpoints:
   - Health check
   - BHYT insurance validation
   - Outcome measures library
   - Service codes
   - Clinical protocols
   - Medical terms search
   - Database connectivity

2. **Integration Tests** - GitHub Actions runs full test suite
3. **Security Scanning** - Trivy vulnerability scanner
4. **Load Testing** - K6 performance tests (separate)

### Rollback Capabilities

1. **Quick Application Rollback** - Switch service selector back
2. **Database Rollback** - Restore from backup
3. **Automatic Rollback** - On deployment failure or high error rate
4. **Manual Rollback** - Via script or Makefile

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    HAProxy (Edge)                       │
│              https://physioflow.trancloud.work          │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴──────────┐
         │                      │
    ┌────▼──────┐        ┌─────▼──────┐
    │ API Svc   │        │  Web Svc   │
    │ selector: │        │ selector:  │
    │  version  │        │  version   │
    └────┬──────┘        └─────┬──────┘
         │                     │
    ┌────┴────┐           ┌────┴────┐
    │         │           │         │
┌───▼───┐ ┌──▼────┐  ┌───▼───┐ ┌──▼────┐
│ Blue  │ │ Green │  │ Blue  │ │ Green │
│ API   │ │ API   │  │ Web   │ │ Web   │
└───────┘ └───────┘  └───────┘ └───────┘
  v1.2.2   v1.2.3      v1.2.2   v1.2.3
 (active)  (inactive) (active)  (inactive)
```

## Deployment Flow

```
┌─────────────────┐
│ Build & Push    │
│ Docker Images   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Run Staging     │
│ Gate Workflow   │  (Optional - GitHub Actions)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Detect Active   │
│ Version         │  Current: blue → Deploy to: green
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Backup Database │  (Production only)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Deploy to       │
│ Inactive        │  Deploy API-green + Web-green
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Wait for        │
│ Rollout         │  kubectl rollout status
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Run Smoke Tests │  Test critical endpoints
└────────┬────────┘
         │
    ┌────┴────┐
    │ Passed? │
    └────┬────┘
         │
    Yes  │  No
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────┐  ┌────────┐
│Switch│  │ Abort  │
│Traffic  │ Fail   │
└──┬───┘  └────────┘
   │
   ▼
┌─────────────────┐
│ Monitor 5 min   │  Check errors, restarts
└────────┬────────┘
         │
    ┌────┴────┐
    │ Healthy?│
    └────┬────┘
         │
    Yes  │  No
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────┐  ┌─────────┐
│Scale │  │Rollback │
│Down  │  │to Blue  │
│Blue  │  └─────────┘
└──────┘
```

## Usage Examples

### Deploy to Development

```bash
# Using Makefile
make deploy-blue-green ENV=dev API_TAG=v1.2.3 WEB_TAG=v1.2.3

# Using script directly
./infrastructure/homelab/scripts/blue-green-deploy-full.sh dev v1.2.3 v1.2.3
```

### Deploy to Production

```bash
# Export database password
export POSTGRES_PASSWORD="<from-infrastructure.yaml>"

# Run deployment (will prompt for confirmation)
make deploy-blue-green ENV=prod API_TAG=v1.2.3 WEB_TAG=v1.2.3
```

### Rollback Production

```bash
# Quick rollback via Makefile
make deploy-rollback ENV=prod

# Manual rollback with database restore
export POSTGRES_PASSWORD="<password>"
./infrastructure/homelab/scripts/db-rollback.sh prod prod_pre-deployment-v1.2.3_<timestamp>.tar.gz
```

### Run Smoke Tests

```bash
# Test specific environment
make deploy-smoke-test ENV=staging

# Test against specific URL
./infrastructure/homelab/scripts/smoke-tests.sh https://physioflow-staging.trancloud.work/api
```

### Manage Feature Flags

```bash
# Enable feature for 25% of users
curl -X PATCH https://physioflow.trancloud.work/api/v1/feature-flags/1 \
  -H "Content-Type: application/json" \
  -d '{"rollout_percentage": 25, "enabled": true}'

# Enable for all users
curl -X PATCH https://physioflow.trancloud.work/api/v1/feature-flags/1 \
  -H "Content-Type: application/json" \
  -d '{"rollout_percentage": 100}'

# View audit log
curl https://physioflow.trancloud.work/api/v1/feature-flags/1/audit-log
```

## Safety Features

1. **Production Confirmation** - Requires typing "DEPLOY" for production
2. **Automatic Database Backup** - Before any production deployment
3. **Smoke Tests** - Validates deployment before traffic switch
4. **Monitoring Period** - 5 minutes of health checks
5. **Automatic Rollback** - On pod crashes or high error rates
6. **Old Version Retention** - Kept running for 24 hours minimum
7. **Audit Trail** - All changes logged
8. **Transaction Safety** - All migrations use BEGIN/COMMIT

## Monitoring

### During Deployment

```bash
# Watch pod status
watch kubectl get pods -n physioflow-prod

# View logs
kubectl logs -f -n physioflow-prod -l version=green,component=api

# Check service routing
kubectl get svc physioflow-api -n physioflow-prod -o yaml | grep -A 5 selector
```

### Post-Deployment

- Grafana dashboards at https://grafana.trancloud.work
- Prometheus metrics at https://prometheus.trancloud.work
- Application logs via Loki

## Feature Flags

Default feature flags created:

1. **bhyt_insurance_validation** - BHYT insurance validation (enabled: 100%)
2. **outcome_measures_tracking** - Patient outcome tracking (enabled: 100%)
3. **billing_integration** - Billing and invoicing (enabled: 100%)
4. **clinical_protocols** - Clinical protocols (enabled: 100%)
5. **discharge_planning** - Discharge planning (enabled: 100%)
6. **vietnamese_medical_terms** - Medical terminology (enabled: 100%)
7. **advanced_reporting** - Advanced analytics (disabled)
8. **telehealth** - Video consultations (disabled)
9. **mobile_app_sync** - Offline sync (dev only, disabled)
10. **ai_treatment_suggestions** - AI suggestions (dev only, disabled)

## Testing

### Run Full Test Suite

```bash
# Unit tests
make test

# Integration tests
make test-api

# E2E tests
make test-e2e

# Smoke tests
make deploy-smoke-test ENV=dev
```

### GitHub Actions Staging Gate

Trigger manually via GitHub Actions UI:
1. Go to Actions → Staging Gate for Production Deployment
2. Click "Run workflow"
3. Enter image tag
4. Review results
5. Approve for production

## Troubleshooting

### Deployment Stuck

```bash
# Check pod events
kubectl describe pod -n physioflow-prod <pod-name>

# Check rollout status
kubectl rollout status deployment/physioflow-api-green -n physioflow-prod
```

### Smoke Tests Failing

```bash
# Run manually with pod IP
POD_IP=$(kubectl get pod -n physioflow-prod -l version=green -o jsonpath='{.items[0].status.podIP}')
./infrastructure/homelab/scripts/smoke-tests.sh http://$POD_IP:8080
```

### Database Issues

```bash
# Check database connectivity
export PGPASSWORD="<password>"
psql -h 192.168.10.24 -U emr -d physioflow_prod -c "SELECT 1;"

# Check migration version
psql -h 192.168.10.24 -U emr -d physioflow_prod \
  -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

## Next Steps

### Enhancements to Consider

1. **Canary Deployments** - Deploy to subset of users before full rollout
2. **A/B Testing** - Route traffic based on user segments
3. **Progressive Delivery** - Gradual traffic shift (10% → 50% → 100%)
4. **Automated Performance Testing** - K6 tests before traffic switch
5. **Slack/Discord Notifications** - Deployment status updates
6. **Metrics-Based Rollback** - Auto-rollback on error rate threshold
7. **Database Migration Preview** - Dry-run migrations before applying

### Operational Improvements

1. **Deploy from CI/CD** - Automate from GitHub Actions
2. **Image Scanning** - Add Trivy scan to deployment pipeline
3. **Backup Verification** - Automated backup restore testing
4. **Disaster Recovery** - Multi-cluster failover
5. **Cost Optimization** - Auto-scale down old deployments after 24h

## References

- **Deployment Guide**: `/infrastructure/homelab/DEPLOYMENT_GUIDE.md`
- **Scripts README**: `/infrastructure/homelab/scripts/README.md`
- **Rollback Procedures**: `/infrastructure/db/ROLLBACK.md`
- **Infrastructure Reference**: `/home/dang/dev/infrastructure.yaml`
- **Feature Flags API**: API handler at `/apps/api/internal/handler/feature_flags.go`

## Support

For issues:
1. Check deployment logs
2. Review pod events and status
3. Run smoke tests manually
4. Check database connectivity
5. Review infrastructure.yaml for credentials
6. Consult rollback procedures
