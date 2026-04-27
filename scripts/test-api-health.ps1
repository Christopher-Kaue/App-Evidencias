# Testa GET https://<projeto-php>/api/health.php apos configurar DB na Vercel.
#
# Uso:
#   .\scripts\test-api-health.ps1 -PhpBaseUrl https://seu-api.vercel.app

param(
    [Parameter(Mandatory = $true)]
    [string]$PhpBaseUrl
)

$ErrorActionPreference = "Stop"
$base = $PhpBaseUrl.TrimEnd("/")
$u = "$base/api/health.php"
Write-Host "GET $u"
try {
    $r = Invoke-RestMethod -Uri $u -Method Get
    $r | ConvertTo-Json -Depth 5
    if ($r.ok -eq $true -and $r.db -eq $true) {
        Write-Host "OK: MySQL acessivel pela API."
    } else {
        Write-Warning "Resposta inesperada: ajuste DB_* / DB_SSL no projeto PHP (Vercel)."
    }
} catch {
    Write-Warning $_.Exception.Message
    throw
}
