$body = @{ 
  email = 'admin.e2e.1761636135728.0@example.com'
  password = 'Passw0rd!1'
} | ConvertTo-Json

try {
  $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/auth/login' -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 10
  $r | ConvertTo-Json -Depth 5
} catch {
  Write-Host 'LOGIN_REQUEST_FAILED:' $_.Exception.Message
  exit 2
}
