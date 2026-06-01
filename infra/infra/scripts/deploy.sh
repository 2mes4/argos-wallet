#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-staging}"
K3S_HOST="u2mes4@155.133.27.1"
MANIFEST_DIR="infra/k3s"

echo "Deploying Open Wallet to $ENVIRONMENT..."

if [ "$ENVIRONMENT" = "staging" ] || [ "$ENVIRONMENT" = "production" ]; then
    OVERLAY_DIR="$MANIFEST_DIR/overlays/$ENVIRONMENT"
else
    OVERLAY_DIR="$MANIFEST_DIR/base"
fi

echo "Building Docker images..."
docker build -t openwallet/server:latest -t openwallet/worker:latest ./platform

echo "Saving images..."
docker save openwallet/server:latest openwallet/worker:latest | gzip > /tmp/ow-images.tar.gz

echo "Copying images to K3s node..."
scp /tmp/ow-images.tar.gz "$K3S_HOST:/tmp/"

echo "Loading images on K3s..."
ssh "$K3S_HOST" "sudo k3s ctr images import /tmp/ow-images.tar.gz && rm /tmp/ow-images.tar.gz"

echo "Applying Kubernetes manifests..."
ssh "$K3S_HOST" "sudo kubectl apply -f -" <<EOF
$(cat $OVERLAY_DIR/*.yaml 2>/dev/null || cat $MANIFEST_DIR/base/*.yaml)
EOF

echo "Checking rollout..."
ssh "$K3S_HOST" "sudo kubectl -n open-wallet rollout status deployment/server --timeout=120s"
ssh "$K3S_HOST" "sudo kubectl -n open-wallet rollout status deployment/worker --timeout=120s"

echo "Deployment to $ENVIRONMENT complete!"
ssh "$K3S_HOST" "sudo kubectl -n open-wallet get pods"
