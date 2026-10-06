$ErrorActionPreference = "Stop"
kubectl apply -f k8s/namespace.yaml
if ($LASTEXITCODE -ne 0) { throw "Unable to create the application namespace" }
kubectl apply -f monitoring/k8s/namespace.yaml
if ($LASTEXITCODE -ne 0) { throw "Unable to create the monitoring namespace" }
kubectl apply -f monitoring/k8s/rbac.yaml
if ($LASTEXITCODE -ne 0) { throw "Unable to install monitoring RBAC" }
