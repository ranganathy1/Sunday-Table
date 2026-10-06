#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${AWS_REGION:?}"
: "${EKS_CLUSTER_NAME:?}"
: "${IMAGE_URI:?}"
: "${APP_CONFIG_PARAMETER:?Set APP_CONFIG_PARAMETER from Terraform output}"
: "${GITHUB_SHA:?}"

secret_file="$(mktemp)"
trap 'rm -f "$secret_file"' EXIT
aws ssm get-parameter \
  --region "$AWS_REGION" \
  --name "$APP_CONFIG_PARAMETER" \
  --with-decryption \
  --query Parameter.Value \
  --output text > "$secret_file"

kubectl apply -f monitoring/k8s/monitoring.yaml
kubectl apply -f k8s/configmap.yaml

python3 ci/render-kubernetes-secrets.py "$secret_file" | kubectl apply --server-side --field-manager=github-actions-deployer -f -

envsubst '${IMAGE_URI}' < k8s/migration-job.yaml | kubectl delete -f - --ignore-not-found=true
envsubst '${IMAGE_URI}' < k8s/migration-job.yaml | kubectl apply -f -
kubectl wait --namespace food-ordering \
  --for=condition=complete job/food-ordering-migrate --timeout=10m

envsubst '${IMAGE_URI}' < k8s/deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/service.yaml
kubectl rollout status --namespace food-ordering deployment/food-ordering --timeout=5m
kubectl rollout status --namespace monitoring deployment/prometheus --timeout=5m
kubectl rollout status --namespace monitoring deployment/grafana --timeout=5m
kubectl rollout status --namespace monitoring deployment/alertmanager --timeout=5m
kubectl rollout status --namespace monitoring deployment/kube-state-metrics --timeout=5m

echo "Application rollout succeeded for ${GITHUB_SHA}."
kubectl get pods,service --namespace food-ordering
