param(
    [string]$Namespace = "food-ordering"
)

$ErrorActionPreference = "Stop"
kubectl get nodes
if ($LASTEXITCODE -ne 0) { throw "Unable to query Kubernetes nodes" }
kubectl get deployment,service,job -n $Namespace
if ($LASTEXITCODE -ne 0) { throw "Unable to query application resources" }
kubectl rollout status -n $Namespace deployment/food-ordering --timeout=5m
if ($LASTEXITCODE -ne 0) { throw "Application rollout is not healthy" }
kubectl get pods -n monitoring
if ($LASTEXITCODE -ne 0) { throw "Unable to query monitoring resources" }
