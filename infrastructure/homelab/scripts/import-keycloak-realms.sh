#!/bin/bash
set -e

# Import Keycloak realms for PhysioFlow
# Usage: ./import-keycloak-realms.sh [realm]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REALMS_DIR="$SCRIPT_DIR/../keycloak/realms"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get Keycloak pod
KC_POD=$(kubectl get pods -n keycloak -l app=keycloak -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [[ -z "$KC_POD" ]]; then
    log_error "Could not find Keycloak pod. Is Keycloak running?"
    exit 1
fi

log_info "Found Keycloak pod: $KC_POD"

import_realm() {
    local realm_file=$1
    local realm_name=$(basename "$realm_file" .json)

    log_info "Importing realm: $realm_name"

    # Copy realm file to pod
    kubectl cp "$realm_file" "keycloak/$KC_POD:/tmp/realm.json"

    # Import realm
    kubectl exec -n keycloak "$KC_POD" -- /opt/keycloak/bin/kc.sh import --file /tmp/realm.json || {
        log_warn "Realm $realm_name may already exist. Skipping..."
    }

    log_info "Realm $realm_name imported successfully"
}

# Import specific realm or all
if [[ -n "$1" ]]; then
    REALM_FILE="$REALMS_DIR/physioflow-$1.json"
    if [[ -f "$REALM_FILE" ]]; then
        import_realm "$REALM_FILE"
    else
        log_error "Realm file not found: $REALM_FILE"
        exit 1
    fi
else
    log_info "Importing all PhysioFlow realms..."
    for realm_file in "$REALMS_DIR"/physioflow-*.json; do
        if [[ -f "$realm_file" ]]; then
            import_realm "$realm_file"
        fi
    done
fi

echo ""
log_info "Keycloak realm import complete!"
log_info "Access Keycloak admin at: https://keycloak.trancloud.work"
log_info "Remember to update client secrets after import!"
