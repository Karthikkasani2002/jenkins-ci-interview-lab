#!/usr/bin/env bash
set -eo pipefail
if [ -z "$KUBE_CONTEXT" ]; then
  echo "Set KUBE_CONTEXT to the exact lab cluster context." >&2
  exit 2
fi
ARGOCD_VERSION=v3.6.0
MANIFEST_URL=https://raw.githubusercontent.com/argoproj/argo-cd/$ARGOCD_VERSION/manifests/install.yaml
if ! kubectl config get-contexts -o name | grep -Fxq "$KUBE_CONTEXT"; then
  echo "Context not found: $KUBE_CONTEXT" >&2
  exit 2
fi
ready_nodes=$(kubectl --context "$KUBE_CONTEXT" get nodes --no-headers | awk '$2=="Ready"{n++} END{print n+0}')
if [ "$ready_nodes" -lt 1 ]; then
  echo "No Ready nodes in context $KUBE_CONTEXT; refusing install." >&2
  exit 2
fi
echo "Installing Argo CD $ARGOCD_VERSION into context $KUBE_CONTEXT."
kubectl --context "$KUBE_CONTEXT" create namespace argocd --dry-run=client -o yaml | kubectl --context "$KUBE_CONTEXT" apply -f -
kubectl --context "$KUBE_CONTEXT" apply --server-side --force-conflicts -f "$MANIFEST_URL"
kubectl --context "$KUBE_CONTEXT" wait --for=condition=Established --timeout=180s crd/applications.argoproj.io crd/appprojects.argoproj.io
kubectl --context "$KUBE_CONTEXT" wait --for=condition=Available --timeout=600s deployment --all -n argocd
kubectl --context "$KUBE_CONTEXT" apply -k deploy/argocd/bootstrap
echo "Bootstrap objects applied. Verify upi-lab-root and task-api-dev in Argo CD."
echo "Development starts at zero replicas; a protected release promotion supplies the first digest."
