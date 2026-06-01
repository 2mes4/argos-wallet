#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-staging}"
K3S_HOST="u2mes4@155.133.27.1"
MANIFEST_DIR="infra/k3s"

echo "Deploying Argos Wallet to $ENVIRONMENT..."

if [ "$ENVIRONMENT" = "staging" ] || [ "$ENVIRONMENT" = "production" ]; then
    OVERLAY_DIR="$MANIFEST_DIR/overlays/$ENVIRONMENT"
else
    OVERLAY_DIR="$MANIFEST_DIR/base"
fi

echo "Building Docker images..."
docker build -t ericmora/argos-wallet:0.2.0 -t ericmora/argos-wallet:0.2.0 ./platform

echo "Saving images..."
docker save ericmora/argos-wallet:0.2.0 ericmora/argos-wallet:0.2.0 | gzip > /tmp/argos-images.tar.gz

echo "Copying images to K3s node..."
scp /tmp/argos-images.tar.gz "$K3S_HOST:/tmp/"

echo "Loading images on K3s..."
ssh "$K3S_HOST" "sudo k3s ctr images import /tmp/argos-images.tar.gz && rm /tmp/argos-images.tar.gz"

echo "Applying Kubernetes manifests..."
ssh "$K3S_HOST" "sudo kubectl apply -f -" <<EOF
$(cat $OVERLAY_DIR/*.yaml 2>/dev/null || cat $MANIFEST_DIR/base/*.yaml)
EOF

echo "Checking rollout..."
ssh "$K3S_HOST" "sudo kubectl -n argos-wallet rollout status deployment/server --timeout=120s"
ssh "$K3S_HOST" "sudo kubectl -n argos-wallet rollout status deployment/worker --timeout=120s"

echo "Deployment to $ENVIRONMENT complete!"
ssh "$K3S_HOST" "sudo kubectl -n argos-wallet get pods"
