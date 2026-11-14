$appDir = $PSScriptRoot
Set-Location $appDir
node "$appDir\node_modules\next\dist\bin\next" dev
