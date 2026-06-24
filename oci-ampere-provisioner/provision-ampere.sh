#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
#  YatraX Ampere Auto-Provisioner v1.0
#  Region: ap-mumbai-1 | Shape: VM.Standard.A1.Flex
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Configuration Default Values (can be customized)
AD_NAME="QkgJ:AP-MUMBAI-1-AD-1"
SHAPE="VM.Standard.A1.Flex"
OCPUS="2"
MEMORY_IN_GBS="12"
DELAY=60
DELAY_INCREMENT=30
MAX_DELAY=300
JITTER_MAX=30
MAX_INSTANCES=2
POLL_INTERVAL=30
POLL_TIMEOUT=600

echo "══════════════════════════════════════════════════════════════════════════════"
echo " YatraX Ampere Auto-Provisioner v1.0"
echo " Region: ap-mumbai-1 | Shape: $SHAPE"
echo " Target: $MAX_INSTANCES instances ($OCPUS OCPU / $MEMORY_IN_GBS GB RAM each)"
echo "══════════════════════════════════════════════════════════════════════════════"

# Load config
ENV_FILE="/etc/yatrax/.env"
echo -n "Loading config from $ENV_FILE... "
if [ -f "$ENV_FILE" ]; then
    # Filter variables to avoid importing malicious commands
    COMPARTMENT_ID=$(grep -E "^COMPARTMENT_ID=" "$ENV_FILE" | cut -d'=' -f2-) || true
    SUBNET_OCID=$(grep -E "^SUBNET_OCID=" "$ENV_FILE" | cut -d'=' -f2-) || true
    IMAGE_OCID=$(grep -E "^IMAGE_OCID=" "$ENV_FILE" | cut -d'=' -f2-) || true
    SSH_PUBLIC_KEY_PATH=$(grep -E "^SSH_PUBLIC_KEY_PATH=" "$ENV_FILE" | cut -d'=' -f2-) || true
    DISPLAY_NAME_PREFIX=$(grep -E "^DISPLAY_NAME_PREFIX=" "$ENV_FILE" | cut -d'=' -f2-) || "yatrax-ampere"
    
    echo "OK"
else
    echo "FAILED"
    echo "ERROR: Configuration file not found at $ENV_FILE"
    exit 1
fi

# Validation
if [ -z "$COMPARTMENT_ID" ] || [ -z "$SUBNET_OCID" ] || [ -z "$IMAGE_OCID" ] || [ -z "$SSH_PUBLIC_KEY_PATH" ]; then
    echo "ERROR: Missing required configuration variables in $ENV_FILE"
    echo "Required: COMPARTMENT_ID, SUBNET_OCID, IMAGE_OCID, SSH_PUBLIC_KEY_PATH"
    exit 1
fi

if [ ! -f "$SSH_PUBLIC_KEY_PATH" ]; then
    echo "ERROR: SSH public key not found at $SSH_PUBLIC_KEY_PATH"
    exit 1
fi

instances_created=0
attempt=1
current_delay=$DELAY

while [ "$instances_created" -lt "$MAX_INSTANCES" ]; do
    instance_name="${DISPLAY_NAME_PREFIX}-$((instances_created + 1))"
    echo "Instances created: $instances_created / $MAX_INSTANCES"
    echo "Attempt #$attempt — Launching instance '$instance_name'..."

    # Call OCI CLI
    LAUNCH_OUTPUT=$(oci compute instance launch \
        --availability-domain "$AD_NAME" \
        --compartment-id "$COMPARTMENT_ID" \
        --shape "$SHAPE" \
        --shape-config "{\"ocpus\": $OCPUS, \"memoryInGBs\": $MEMORY_IN_GBS}" \
        --subnet-id "$SUBNET_OCID" \
        --image-id "$IMAGE_OCID" \
        --ssh-authorized-keys-file "$SSH_PUBLIC_KEY_PATH" \
        --display-name "$instance_name" \
        2>&1) || true

    if [[ "$LAUNCH_OUTPUT" == *"Out of host capacity"* || "$LAUNCH_OUTPUT" == *"ServiceError"* || "$LAUNCH_OUTPUT" == *"LimitExceeded"* ]]; then
        # Calculate random jitter between 0 and JITTER_MAX
        jitter=$(( RANDOM % (JITTER_MAX + 1) ))
        sleep_time=$(( current_delay + jitter ))
        
        echo "✗ FAILED: Capacity exhausted or limit reached."
        echo "Retrying in ${sleep_time}s (base: ${current_delay}s + jitter: ${jitter}s)..."
        
        sleep "$sleep_time"
        
        # Increase backoff delay
        current_delay=$(( current_delay + DELAY_INCREMENT ))
        if [ "$current_delay" -gt "$MAX_DELAY" ]; then
            current_delay=$MAX_DELAY
        fi
        attempt=$(( attempt + 1 ))
    else
        # Success!
        # Try to parse the OCID
        INSTANCE_OCID=$(echo "$LAUNCH_OUTPUT" | grep -oE "ocid1\.instance\.oc1\.ap-mumbai-1\.[a-zA-Z0-9\.]+" | head -n 1) || true
        
        if [ -z "$INSTANCE_OCID" ]; then
            echo "✓ Launch accepted, but could not parse OCID from output."
            echo "Output:"
            echo "$LAUNCH_OUTPUT"
            # Assume success and increment
            instances_created=$(( instances_created + 1 ))
            attempt=1
            current_delay=$DELAY
            continue
        fi

        echo "✓ Launch accepted! Instance OCID: $INSTANCE_OCID"
        echo "Polling lifecycle state (timeout: $((POLL_TIMEOUT / 60))m)..."
        
        elapsed=0
        state="PROVISIONING"
        public_ip=""
        
        while [ "$elapsed" -lt "$POLL_TIMEOUT" ]; do
            sleep "$POLL_INTERVAL"
            elapsed=$(( elapsed + POLL_INTERVAL ))
            
            # Fetch status
            STATUS_JSON=$(oci compute instance get --instance-id "$INSTANCE_OCID" 2>/dev/null) || true
            if [ -n "$STATUS_JSON" ]; then
                state=$(echo "$STATUS_JSON" | grep -o '"lifecycle-state": "[^"]*' | cut -d'"' -f4) || "PROVISIONING"
                echo "  State: $state"
                
                if [ "$state" = "RUNNING" ]; then
                    # Get public IP
                    VNIC_JSON=$(oci compute instance list-vnics --instance-id "$INSTANCE_OCID" 2>/dev/null) || true
                    if [ -n "$VNIC_JSON" ]; then
                        public_ip=$(echo "$VNIC_JSON" | grep -o '"public-ip": "[^"]*' | cut -d'"' -f4 | head -n 1) || ""
                    fi
                    break
                fi
            fi
        done
        
        if [ "$state" = "RUNNING" ]; then
            echo "══════════════════════════════════════════════════════════════════════════════"
            echo " ✓ Instance #$((instances_created + 1)) is RUNNING"
            echo " Public IP: $public_ip"
            echo " SSH: ssh -i ${SSH_PUBLIC_KEY_PATH%.pub} ubuntu@$public_ip"
            echo "══════════════════════════════════════════════════════════════════════════════"
            instances_created=$(( instances_created + 1 ))
            attempt=1
            current_delay=$DELAY
        else
            echo "✗ Polling timed out. Instance state: $state"
        fi
    fi
done

echo "✓ All $MAX_INSTANCES instances provisioned successfully. Exiting."
