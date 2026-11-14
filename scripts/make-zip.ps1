Set-Location "D:\AI-Projects"
$files = Get-ChildItem -Path "marasim_app" -Exclude "node_modules", ".next" | ForEach-Object { $_.FullName }
Compress-Archive -Path $files -DestinationPath "marasim_app_latest_ready.zip" -Force
Copy-Item "marasim_app_latest_ready.zip" "marasim_app_home_edition.zip" -Force
Write-Output "Zip created successfully:"
Get-Item "marasim_app_latest_ready.zip" | Select-Object Name, Length, LastWriteTime
