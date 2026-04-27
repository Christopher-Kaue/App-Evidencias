# Importa database/schema_cloud.sql para o MySQL na nuvem (ex.: Railway, Aiven).
# Requisito: cliente mysql no PATH (ex.: pasta bin do MySQL ou XAMPP).
#
# Uso interativo:
#   .\scripts\import-schema-cloud.ps1
#
# Uso com parametros:
#   .\scripts\import-schema-cloud.ps1 -DbHost xxx.mysql.aws.com -DbPort 3306 -DbUser admin -DbName app_evidencias
#
# Liberacao de firewall / IP publico tem de ser feita no painel do provedor MySQL.

param(
    [string]$DbHost,
    [int]$DbPort = 3306,
    [string]$DbUser,
    [string]$DbName,
    [SecureString]$DbPassword,
    [switch]$UseSsl
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$schemaPath = Join-Path $repoRoot "database\schema_cloud.sql"

if (-not (Test-Path $schemaPath)) {
    Write-Error "Arquivo nao encontrado: $schemaPath"
}

function Find-MysqlExe {
    $cmd = Get-Command mysql -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $xampp = "C:\xampp\mysql\bin\mysql.exe"
    if (Test-Path $xampp) { return $xampp }
    return $null
}

$mysqlExe = Find-MysqlExe
if (-not $mysqlExe) {
    Write-Error "Comando 'mysql' nao encontrado. Instale o cliente MySQL ou adicione a pasta bin ao PATH (ex.: C:\xampp\mysql\bin)."
}

if (-not $DbHost) { $DbHost = Read-Host "DB_HOST (ex.: xxx.railway.app)" }
if (-not $DbUser) { $DbUser = Read-Host "DB_USER" }
if (-not $DbName) { $DbName = Read-Host "DB_NAME" }
if (-not $DbPassword) {
    $sec = Read-Host "DB_PASS" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
} else {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPassword)
    try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$env:MYSQL_PWD = $plain
$extra = @()
if ($UseSsl) {
    # Cliente recente do MySQL (usa TLS como DB_SSL=1 na API PHP)
    $extra += "--ssl-mode=REQUIRED"
}
try {
    Write-Host "Importando para ${DbHost}:${DbPort} / banco ${DbName} ..."
    Get-Content -LiteralPath $schemaPath -Encoding UTF8 | & $mysqlExe @extra -h $DbHost -P $DbPort -u $DbUser --default-character-set=utf8mb4 $DbName
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
        Write-Error "mysql terminou com codigo $LASTEXITCODE."
    }
    Write-Host "Import concluido."
}
finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}
