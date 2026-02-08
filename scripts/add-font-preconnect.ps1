$pattern = '(?<indent>\s*)<link rel="preconnect" href="https://fonts.googleapis.com">'
$gstaticPattern = '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
$root = 'frontend'

Get-ChildItem -Path $root -Recurse -Filter *.html | ForEach-Object {
    $path = $_.FullName
    $lines = Get-Content -Path $path
    $firstMatchIndex = -1
    $firstIndent = ''

    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match $pattern) {
            $firstMatchIndex = $i
            $firstIndent = $Matches['indent']
            break
        }
    }

    if ($firstMatchIndex -lt 0) {
        return
    }

    $updatedLines = New-Object System.Collections.Generic.List[string]
    $inserted = $false

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]

        if ($line -match $pattern -or $line -match $gstaticPattern) {
            if (-not $inserted -and $i -eq $firstMatchIndex) {
                $updatedLines.Add($firstIndent + '<link rel="preconnect" href="https://fonts.googleapis.com">')
                $updatedLines.Add($firstIndent + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
                $inserted = $true
            }
            continue
        }

        $updatedLines.Add($line)
    }

    if (-not $inserted) {
        $updatedLines.Insert(0, '<link rel="preconnect" href="https://fonts.googleapis.com">')
        $updatedLines.Insert(1, '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
    }

    $updated = $updatedLines -join "`r`n"
    Set-Content -Path $path -Value $updated -NoNewline
}
