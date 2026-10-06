param(
    [Parameter(Mandatory = $false)]
    [string]$BaseUrl = "http://localhost:8080",
    [Parameter(Mandatory = $false)]
    [string]$MetricsToken = ""
)

$ErrorActionPreference = "Stop"
foreach ($Path in @("/health", "/ready")) {
    $Response = Invoke-WebRequest -Uri "$BaseUrl$Path" -UseBasicParsing
    if ($Response.StatusCode -ne 200) {
        throw "$Path returned HTTP $($Response.StatusCode)"
    }
    Write-Output "$Path OK"
}

$Headers = @{}
if ($MetricsToken) {
    $Headers.Authorization = "Bearer $MetricsToken"
}
$Metrics = Invoke-WebRequest -Uri "$BaseUrl/metrics" -Headers $Headers -UseBasicParsing
if ($Metrics.StatusCode -ne 200) {
    throw "/metrics returned HTTP $($Metrics.StatusCode)"
}
Write-Output "/metrics OK"
