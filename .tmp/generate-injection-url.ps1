$body = @{ 
  email = 'admin.e2e.1761636135728.0@example.com'
  password = 'Passw0rd!1'
} | ConvertTo-Json

try {
  $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/auth/login' -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 10
  $token = $r.token
  if (-not $token) { Write-Host 'NO_TOKEN_IN_RESPONSE'; exit 2 }
  $enc = [Uri]::EscapeDataString($token)
  Write-Host 'INJECTION_URL:'
  Write-Host "http://127.0.0.1:3001/set-token.html?token=$enc&redirect=/dashboard"
} catch {
  Write-Host 'LOGIN_FAILED:' $_.Exception.Message
  exit 3
}
