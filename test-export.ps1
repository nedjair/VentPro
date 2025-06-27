# Script PowerShell pour tester l'export

Write-Host "🧪 Test de l'export via l'API backend..." -ForegroundColor Green

# 1. Connexion
Write-Host "`n🔐 Connexion..." -ForegroundColor Yellow
$loginResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"test@example.com","password":"test123"}'

if ($loginResponse.StatusCode -eq 200) {
    $loginData = $loginResponse.Content | ConvertFrom-Json
    if ($loginData.success) {
        $token = $loginData.data.tokens.accessToken
        Write-Host "✅ Connexion réussie! Token: $($token.Substring(0, 20))..." -ForegroundColor Green
        
        # 2. Test récupération des clients
        Write-Host "`n📊 Test récupération des clients..." -ForegroundColor Yellow
        try {
            $clientsResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/clients" -Method GET -Headers @{"Authorization"="Bearer $token"}
            
            if ($clientsResponse.StatusCode -eq 200) {
                $clientsData = $clientsResponse.Content | ConvertFrom-Json
                $clientCount = $clientsData.data.data.Count
                $totalClients = $clientsData.data.pagination.total
                Write-Host "✅ $clientCount clients récupérés (Total: $totalClients)" -ForegroundColor Green
                
                if ($clientCount -gt 0) {
                    $firstClient = $clientsData.data.data[0]
                    $clientName = if ($firstClient.type -eq "COMPANY") { $firstClient.companyName } else { "$($firstClient.firstName) $($firstClient.lastName)" }
                    Write-Host "   Premier client: $clientName" -ForegroundColor Cyan
                }
            } else {
                Write-Host "❌ Erreur récupération clients: $($clientsResponse.StatusCode)" -ForegroundColor Red
            }
        } catch {
            Write-Host "❌ Erreur lors de la récupération des clients: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # 3. Test export Excel
        Write-Host "`n📊 Test export Excel..." -ForegroundColor Yellow
        try {
            $excelResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/clients/export/excel" -Method GET -Headers @{"Authorization"="Bearer $token"}
            
            if ($excelResponse.StatusCode -eq 200) {
                $contentLength = $excelResponse.Headers.'Content-Length'
                $contentType = $excelResponse.Headers.'Content-Type'
                
                Write-Host "✅ Export Excel réussi!" -ForegroundColor Green
                Write-Host "   Content-Type: $contentType" -ForegroundColor Cyan
                Write-Host "   Content-Length: $contentLength bytes" -ForegroundColor Cyan
                
                if ($contentLength -and [int]$contentLength -gt 1000) {
                    Write-Host "✅ Le fichier contient des données ($contentLength bytes)" -ForegroundColor Green
                } else {
                    Write-Host "⚠️ Le fichier semble vide ou très petit ($contentLength bytes)" -ForegroundColor Yellow
                }
                
                # Sauvegarder le fichier pour vérification
                $excelResponse.Content | Out-File -FilePath "test-export-clients.xlsx" -Encoding Byte
                $fileSize = (Get-Item "test-export-clients.xlsx").Length
                Write-Host "   Fichier sauvegardé: test-export-clients.xlsx ($fileSize bytes)" -ForegroundColor Cyan
                
            } else {
                Write-Host "❌ Erreur export Excel: $($excelResponse.StatusCode)" -ForegroundColor Red
                Write-Host "   Response: $($excelResponse.Content)" -ForegroundColor Red
            }
        } catch {
            Write-Host "❌ Erreur lors de l'export Excel: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # 4. Test export PDF
        Write-Host "`n📄 Test export PDF..." -ForegroundColor Yellow
        try {
            $pdfResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/clients/export/pdf" -Method GET -Headers @{"Authorization"="Bearer $token"}
            
            if ($pdfResponse.StatusCode -eq 200) {
                $contentLength = $pdfResponse.Headers.'Content-Length'
                $contentType = $pdfResponse.Headers.'Content-Type'
                
                Write-Host "✅ Export PDF réussi!" -ForegroundColor Green
                Write-Host "   Content-Type: $contentType" -ForegroundColor Cyan
                Write-Host "   Content-Length: $contentLength bytes" -ForegroundColor Cyan
                
                if ($contentLength -and [int]$contentLength -gt 1000) {
                    Write-Host "✅ Le fichier contient des données ($contentLength bytes)" -ForegroundColor Green
                } else {
                    Write-Host "⚠️ Le fichier semble vide ou très petit ($contentLength bytes)" -ForegroundColor Yellow
                }
                
                # Sauvegarder le fichier pour vérification
                $pdfResponse.Content | Out-File -FilePath "test-export-clients.pdf" -Encoding Byte
                $fileSize = (Get-Item "test-export-clients.pdf").Length
                Write-Host "   Fichier sauvegardé: test-export-clients.pdf ($fileSize bytes)" -ForegroundColor Cyan
                
            } else {
                Write-Host "❌ Erreur export PDF: $($pdfResponse.StatusCode)" -ForegroundColor Red
                Write-Host "   Response: $($pdfResponse.Content)" -ForegroundColor Red
            }
        } catch {
            Write-Host "❌ Erreur lors de l'export PDF: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "❌ Échec de la connexion: $($loginData.message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Erreur de connexion: $($loginResponse.StatusCode)" -ForegroundColor Red
}

Write-Host "`n🎉 Tests terminés!" -ForegroundColor Green
