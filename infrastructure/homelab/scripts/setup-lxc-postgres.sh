#!/bin/bash
# Run this script from inside the LXC container (physioflow-db at 192.168.10.24)
# Access via Proxmox Console: pve2.trancloud.work -> LXC 101 -> Console

set -e

echo "=== PhysioFlow PostgreSQL Setup ==="

# Install PostgreSQL
echo "Installing PostgreSQL..."
apt-get update
apt-get install -y postgresql postgresql-contrib

# Start PostgreSQL
systemctl enable postgresql
systemctl start postgresql

# Configure PostgreSQL to listen on all interfaces
PG_CONF=$(find /etc/postgresql -name postgresql.conf | head -1)
PG_HBA=$(find /etc/postgresql -name pg_hba.conf | head -1)

echo "Configuring PostgreSQL for remote access..."
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"
echo "host    all    all    192.168.10.0/24    scram-sha-256" >> "$PG_HBA"

# Restart PostgreSQL
systemctl restart postgresql

# Create databases and users
echo "Creating databases and users..."
sudo -u postgres psql << 'EOSQL'
-- Dev environment
CREATE DATABASE physioflow_dev;
CREATE USER physioflow_dev WITH PASSWORD 'PhysioFlow_Dev_2026!';
GRANT ALL PRIVILEGES ON DATABASE physioflow_dev TO physioflow_dev;

-- Staging environment
CREATE DATABASE physioflow_staging;
CREATE USER physioflow_staging WITH PASSWORD 'PhysioFlow_Staging_2026!';
GRANT ALL PRIVILEGES ON DATABASE physioflow_staging TO physioflow_staging;

-- Prod environment
CREATE DATABASE physioflow_prod;
CREATE USER physioflow_prod WITH PASSWORD 'PhysioFlow_Prod_2026_Secure!';
GRANT ALL PRIVILEGES ON DATABASE physioflow_prod TO physioflow_prod;

\l
\du
EOSQL

echo ""
echo "=== Setup Complete ==="
echo ""
echo "PostgreSQL is now running on 192.168.10.24:5432"
echo ""
echo "Connection strings:"
echo "  Dev:     postgresql://physioflow_dev:PhysioFlow_Dev_2026!@192.168.10.24:5432/physioflow_dev"
echo "  Staging: postgresql://physioflow_staging:PhysioFlow_Staging_2026!@192.168.10.24:5432/physioflow_staging"
echo "  Prod:    postgresql://physioflow_prod:PhysioFlow_Prod_2026_Secure!@192.168.10.24:5432/physioflow_prod"
echo ""
echo "Next: Update k8s secrets with these connection strings and delete in-cluster postgres."
