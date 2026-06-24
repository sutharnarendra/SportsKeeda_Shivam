#!/bin/bash
set -e

APP_DIR="/opt/yatrax"
TEMP_DIR="/opt/yatrax/deploy-temp"
SERVICE_NAME="yatrax.service"

echo "=== Starting Yatra X Backend Deployment ==="

# Step 1: Backup current working version
if [ -f "$APP_DIR/backend.jar" ]; then
    echo "Creating backup of current active backend..."
    cp "$APP_DIR/backend.jar" "$APP_DIR/backend.jar.bak"
fi

# Dynamically detect VM user (opc or ubuntu)
if id "opc" &>/dev/null; then
    VM_USER="opc"
else
    VM_USER="ubuntu"
fi

# Step 2: Swap the JAR file
echo "Installing new JAR version..."
mv "$TEMP_DIR/backend-0.0.1-SNAPSHOT.jar" "$APP_DIR/backend.jar"
chown $VM_USER:$VM_USER "$APP_DIR/backend.jar"

# Step 3: Restart systemd service
echo "Restarting service..."
systemctl daemon-reload
systemctl restart $SERVICE_NAME

# Step 4: Health Check Gate
echo "Checking service health (Actuator validation)..."
HEALTH_URL="http://localhost:8080/actuator/health"
MAX_ATTEMPTS=24 # 24 attempts * 5 seconds = 120 seconds max timeout
ATTEMPT=1
IS_UP=0

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "Ping health endpoint (Attempt $ATTEMPT/$MAX_ATTEMPTS)..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL || true)
    
    if [ "$RESPONSE" -eq 200 ]; then
        HEALTH_STATUS=$(curl -s $HEALTH_URL | grep -o '"status":"UP"' || true)
        if [ ! -z "$HEALTH_STATUS" ]; then
            echo "Success! Health check passed."
            IS_UP=1
            break
        fi
    fi
    
    sleep 5
    ATTEMPT=$((ATTEMPT+1))
done

# Step 5: Rollback if health check failed
if [ $IS_UP -eq 0 ]; then
    echo "WARNING: Health check failed! Initiating self-healing rollback..."
    
    if [ -f "$APP_DIR/backend.jar.bak" ]; then
        mv "$APP_DIR/backend.jar.bak" "$APP_DIR/backend.jar"
        chown $VM_USER:$VM_USER "$APP_DIR/backend.jar"
        systemctl restart $SERVICE_NAME
        echo "Rollback successful. Restored previous stable version."
    else
        echo "ERROR: Critical error. No stable backup version available!"
    fi
    exit 1
else
    # Success, clean backup
    echo "Deployment successful. Cleaning old backups."
    rm -f "$APP_DIR/backend.jar.bak"
fi
