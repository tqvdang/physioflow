# HAProxy Configuration for PhysioFlow

## Access pfSense
URL: https://pfsense.trancloud.work
Username: dang
Password: ycm&17XK

Navigate to: **Services → HAProxy**

---

## Step 1: Create Backends

### 1.1 physioflow-dev-web-be
- **Name:** `physioflow-dev-web-be`
- **Mode:** HTTP
- **Server List:**
  - Name: `k3s-web`
  - Address: `192.168.10.60`
  - Port: `30200`
- **Health check method:** HTTP
- **Health check URI:** `/`

### 1.2 physioflow-dev-api-be
- **Name:** `physioflow-dev-api-be`
- **Mode:** HTTP
- **Server List:**
  - Name: `k3s-api`
  - Address: `192.168.10.60`
  - Port: `30201`
- **Health check method:** HTTP
- **Health check URI:** `/health`

### 1.3 physioflow-staging-web-be (when ready)
- **Name:** `physioflow-staging-web-be`
- **Server:** `192.168.10.60:30210`

### 1.4 physioflow-staging-api-be (when ready)
- **Name:** `physioflow-staging-api-be`
- **Server:** `192.168.10.60:30211`

### 1.5 physioflow-prod-web-be (when ready)
- **Name:** `physioflow-prod-web-be`
- **Server:** `192.168.10.60:30220`

### 1.6 physioflow-prod-api-be (when ready)
- **Name:** `physioflow-prod-api-be`
- **Server:** `192.168.10.60:30221`

---

## Step 2: Configure Frontend ACLs

Navigate to: **Frontend → trancloud-https → Edit**

### Add ACLs:

| ACL Name | Expression | Value |
|----------|------------|-------|
| `physioflow-dev-host` | Host matches | `physioflow-dev.trancloud.work` |
| `physioflow-dev-api` | Path starts with | `/api` |
| `physioflow-staging-host` | Host matches | `physioflow-staging.trancloud.work` |
| `physioflow-staging-api` | Path starts with | `/api` |
| `physioflow-prod-host` | Host matches | `physioflow.trancloud.work` |
| `physioflow-prod-api` | Path starts with | `/api` |

### Add Actions (in order, before other catch-all rules):

| Condition | Backend |
|-----------|---------|
| `physioflow-dev-host` AND `physioflow-dev-api` | `physioflow-dev-api-be` |
| `physioflow-dev-host` | `physioflow-dev-web-be` |
| `physioflow-staging-host` AND `physioflow-staging-api` | `physioflow-staging-api-be` |
| `physioflow-staging-host` | `physioflow-staging-web-be` |
| `physioflow-prod-host` AND `physioflow-prod-api` | `physioflow-prod-api-be` |
| `physioflow-prod-host` | `physioflow-prod-web-be` |

---

## Step 3: Apply Changes

1. Click **Apply Changes** at the top of the page
2. Check **Stats** to verify backends are healthy

---

## Verification

After configuration, test:
```bash
# Test dev web
curl -I https://physioflow-dev.trancloud.work

# Test dev API
curl https://physioflow-dev.trancloud.work/api/health
# or
curl https://physioflow-dev.trancloud.work/health
```

---

## NodePort Reference

| Environment | Web | API |
|-------------|-----|-----|
| Dev | 30200 | 30201 |
| Staging | 30210 | 30211 |
| Prod | 30220 | 30221 |
