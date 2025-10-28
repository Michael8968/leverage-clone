# 自动化接口测试脚本：登录并用 token 测试一组 API
$login = @{ email='admin.e2e.1761636135728.0@example.com'; password='Passw0rd!1' } | ConvertTo-Json
$base = 'http://127.0.0.1:3001'
$endpoints = @(
  '/api/health',
  '/api/auth/me',
  '/api/dev/test-accounts',
  '/api/users',
  '/api/demands',
  '/api/products',
  '/api/suppliers',
  '/api/points-balance',
  '/api/points/transactions'
)

function Summarize-Body($b) {
  if ($null -eq $b) { return '' }
  $s = $b | ConvertTo-Json -Depth 3 -Compress
  if ($s.Length -gt 800) { return $s.Substring(0,800) + '...[truncated]' }
  return $s
}

try {
  Write-Host "Logging in as $($login) ..."
  $r = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -Body $login -ContentType 'application/json' -TimeoutSec 10
} catch {
  Write-Host 'LOGIN_FAIL:' $_.Exception.Message
  exit 2
}

$token = $null
if ($r.token) { $token = $r.token } elseif ($r.accessToken) { $token = $r.accessToken } elseif ($r.auth_token) { $token = $r.auth_token } elseif ($r.data -and $r.data.token) { $token = $r.data.token }
if (-not $token) { Write-Host 'NO_TOKEN_IN_LOGIN_RESPONSE'; exit 3 }
Write-Host 'Got token length:' $token.Length

$results = @()
foreach ($ep in $endpoints) {
  $url = "$base$ep"
  Write-Host "\n==> Testing $url"
  try {
    $resp = Invoke-WebRequest -Uri $url -Headers @{ Authorization = "Bearer $token" } -Method Get -TimeoutSec 10 -UseBasicParsing
    $status = $resp.StatusCode
    $body = $resp.Content
    $summary = if ($body) { if ($body.Length -gt 800) { $body.Substring(0,800) + '...[truncated]' } else { $body } } else { '' }
    Write-Host "Status: $status"
    Write-Host "Body summary: $summary"
    $results += @{ endpoint=$ep; status=$status; bodySummary=$summary }
  } catch {
    # try to get status code from exception response if available
    $msg = $_.Exception.Message
    $status = $_.Exception.Response.StatusCode.Value__ 2>$null
    if (-not $status) { $status = 'ERROR' }
    Write-Host "ERROR calling $ep : $msg (status: $status)"
    $results += @{ endpoint=$ep; status=$status; error=$msg }
  }
}

Write-Host "\n=== SUMMARY ==="
$results | ConvertTo-Json -Depth 5

# Save results to tmp file
$results | ConvertTo-Json -Depth 5 | Out-File -FilePath '.\\.tmp\\api-test-results.json' -Encoding utf8
Write-Host 'Saved results to ./.tmp/api-test-results.json'
