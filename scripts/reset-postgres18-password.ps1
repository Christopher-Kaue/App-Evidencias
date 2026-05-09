#Requires -RunAsAdministrator
<#
  Redefine a senha do usuario postgres no PostgreSQL 18 (porta 5432).
  Usa trust temporario em pg_hba.conf apenas em localhost, depois restaura o arquivo.
  Execute uma vez (PowerShell como Administrador) ou confirme o prompt UAC ao iniciar pela raiz do projeto.
#>
$ErrorActionPreference = "Stop"

$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$dataDir = "C:\Program Files\PostgreSQL\18\data"
$hbaPath = Join-Path $dataDir "pg_hba.conf"
$psql = Join-Path $pgBin "psql.exe"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"

if (-not (Test-Path $hbaPath)) {
    throw "pg_hba.conf nao encontrado: $hbaPath"
}

$snapshot = Join-Path $dataDir ("pg_hba.conf.snapshot-{0}" -f [Guid]::NewGuid().ToString("N"))
Copy-Item $hbaPath $snapshot -Force

function Apply-TrustLines([string] $text) {
    $t = $text
    $t = $t.Replace(
        "local   all             all                                     scram-sha-256",
        "local   all             all                                     trust"
    )
    $t = $t.Replace(
        "host    all             all             127.0.0.1/32            scram-sha-256",
        "host    all             all             127.0.0.1/32            trust"
    )
    $t = $t.Replace(
        "host    all             all             ::1/128                 scram-sha-256",
        "host    all             all             ::1/128                 trust"
    )
    return $t
}

try {
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    $content = [System.IO.File]::ReadAllText($hbaPath)
    [System.IO.File]::WriteAllText($hbaPath, (Apply-TrustLines $content).TrimEnd() + "`r`n", $utf8NoBom)

    & $pgCtl reload -D $dataDir

    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -w -c "ALTER USER postgres WITH PASSWORD 'postgres';"
}
finally {
    if (Test-Path $snapshot) {
        Copy-Item $snapshot $hbaPath -Force
        Remove-Item $snapshot -Force
        & $pgCtl reload -D $dataDir
    }
}

Write-Host "[reset-postgres18] Concluido: postgres@127.0.0.1:5432 senha definida como ""postgres""." -ForegroundColor Green
