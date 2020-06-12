param([string]$BrowserType)

$extension = ""
$zip = ""

switch ($BrowserType) {
	"Chromium" {
		$extension = Resolve-Path -LiteralPath "ChromiumExtension/"
		$zip = Join-Path (Get-Location).Path "magnet-linker-chromium.zip"
	}
	"Firefox" {
		$extension = Resolve-Path -LiteralPath "FirefoxAddOn/"
		$zip = Join-Path (Get-Location).Path "magnet-linker-firefox.zip"
	}
}

print

 If (Test-path $zip) {
     Remove-item $zip
}

Add-Type -assembly "system.io.compression.filesystem"

[io.compression.zipfile]::CreateFromDirectory($extension, $zip) 