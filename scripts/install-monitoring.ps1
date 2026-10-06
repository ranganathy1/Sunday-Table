$ErrorActionPreference = "Stop"
kubectl get secret prometheus-metrics -n monitoring
if ($LASTEXITCODE -ne 0) { throw "Run the protected deployment once to create the Prometheus scrape secret" }
kubectl get secret grafana-admin -n monitoring
if ($LASTEXITCODE -ne 0) { throw "Run the protected deployment once to create the Grafana admin secret" }
kubectl apply -f monitoring/k8s/monitoring.yaml
if ($LASTEXITCODE -ne 0) { throw "Unable to install monitoring resources" }
kubectl rollout status -n monitoring deployment/prometheus --timeout=5m
if ($LASTEXITCODE -ne 0) { throw "Prometheus did not become ready" }
kubectl rollout status -n monitoring deployment/grafana --timeout=5m
if ($LASTEXITCODE -ne 0) { throw "Grafana did not become ready" }
