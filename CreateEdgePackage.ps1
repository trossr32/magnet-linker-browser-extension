$path = Resolve-Path -LiteralPath "."
$extension = "$path\Edge Extension\"
$zip = "$path\magnet-linker-edge-extension.zip"

print

 If (Test-path $zip) {
     Remove-item $zip
}

Add-Type -assembly "system.io.compression.filesystem"

[io.compression.zipfile]::CreateFromDirectory($extension, $zip) 