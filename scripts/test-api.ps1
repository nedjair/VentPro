# PowerShell script to test API endpoints with authentication token

# Login to get JWT token
$response = Invoke-RestMethod -Uri http://localhost:3001/api/v1/auth/login -Method POST -Body (@{email="admin@technocommerce.dz"; password="demo123"} | ConvertTo-Json) -ContentType "application/json"
if ($response.success -eq $true) {
    $token = $response.data.tokens.accessToken
    Write-Host "Login successful. Token: $token"
} else {
    Write-Error "Login failed: $($response.message)"
    exit 1
}

# Set authorization header
$headers = @{ Authorization = "Bearer $token" }

# Test suppliers endpoint
Write-Host "Testing GET /api/v1/suppliers"
Invoke-RestMethod -Uri http://localhost:3001/api/v1/suppliers -Headers $headers -Method GET | ConvertTo-Json -Depth 5 | Write-Host

# Add more endpoint tests here as needed
