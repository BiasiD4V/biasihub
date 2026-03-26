$fornecedoresPath = "C:\Users\Ryan\Downloads\Claude\orcamentos\FORNECEDORES BIASI.xlsx"
$clientesPath = "C:\Users\Ryan\Downloads\Claude\orcamentos\CLIENTES BIASI - DETALHADO.xlsx"

Function Read-ExcelFile {
    param($FilePath)
    
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    
    try {
        $workbook = $excel.Workbooks.Open($FilePath, 3)
        $worksheet = $workbook.Sheets.Item(1)
        $usedRange = $worksheet.UsedRange
        $rows = $usedRange.Rows.Count
        $cols = $usedRange.Columns.Count
        
        $dados = @()
        $headers = @()
        
        # Ler cabeçalhos
        for ($col = 1; $col -le $cols; $col++) {
            $headers += $worksheet.Cells.Item(1, $col).Value2
        }
        
        # Ler dados
        for ($row = 2; $row -le $rows; $row++) {
            $obj = @{}
            for ($col = 1; $col -le $cols; $col++) {
                $value = $worksheet.Cells.Item($row, $col).Value2
                $header = $headers[$col - 1]
                if ($header) {
                    $obj[$header] = $value
                }
            }
            if ($obj.Count -gt 0) {
                $dados += $obj
            }
        }
        
        $workbook.Close($false)
        return $dados
    }
    finally {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
        [GC]::Collect()
        [GC]::WaitForPendingFinalizers()
    }
}

# Ler dados
Write-Host "[LENDO] Fornecedores..."
$fornecedores = Read-ExcelFile $fornecedoresPath
Write-Host "[OK] $($fornecedores.Count) fornecedores lidos"

Write-Host "[LENDO] Clientes..."
$clientes = Read-ExcelFile $clientesPath
Write-Host "[OK] $($clientes.Count) clientes lidos"

# Salvar como JSON
$fornecedores | ConvertTo-Json | Out-File "scripts/fornecedores.json"
$clientes | ConvertTo-Json | Out-File "scripts/clientes.json"

Write-Host ""
Write-Host "[OK] Arquivos JSON criados!"
