$extension = Resolve-Path -LiteralPath "Extension\"
$zip = Resolve-Path -LiteralPath "magnet-linker-chrome-extension.zip"

print

 If (Test-path $zip) {
     Remove-item $zip
}

Add-Type -assembly "system.io.compression.filesystem"

[io.compression.zipfile]::CreateFromDirectory($extension, $zip) 