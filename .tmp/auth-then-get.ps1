$body = @{ 
  email = 'admin.e2e.1761636135728.0@example.com'
  password = 'Passw0rd!1'
} | ConvertTo-Json

try {
  $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/auth/login' -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 10
  $json = $r | ConvertTo-Json -Depth 5
  Write-Host "LOGIN_RESPONSE:" $json
  # 尝试从响应中提取 token 字段名（常见为 token 或 accessToken 或 auth_token）
  $token = $null
  if ($r.token) { $token = $r.token }
  elseif ($r.accessToken) { $token = $r.accessToken }
  elseif ($r.auth_token) { $token = $r.auth_token }
  elseif ($r.data -and $r.data.token) { $token = $r.data.token }

  if (-not $token) { Write-Host 'NO_TOKEN_IN_RESPONSE'; exit 3 }

  Write-Host 'USING_TOKEN:' $token

  # 带 Authorization 发起请求
  $headers = @{ Authorization = "Bearer $token" }
  try {
    $resp = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/dev/test-accounts' -Method Get -Headers $headers -TimeoutSec 10
    $resp | ConvertTo-Json -Depth 5
  } catch {
    Write-Host 'AUTH_GET_FAILED:' $_.Exception.Message
    exit 4
  }

} catch {
  Write-Host 'LOGIN_REQUEST_FAILED:' $_.Exception.Message
  exit 2
}
