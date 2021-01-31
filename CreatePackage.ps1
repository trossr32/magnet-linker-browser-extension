$root = (Get-Location).Path
$publish = Join-Path (Get-Location).Path "Publish/"
		
# Create Publish folder or remove any existing release packages
if (!(Test-path $publish)) {
	mkdir $publish
} else {
	Set-Location $publish

	Get-Childitem -File -Recurse -ErrorAction SilentlyContinue | ForEach-Object { Remove-Item $_ }

	Set-Location $root
}

# build Firefox add on
$addon = Resolve-Path -LiteralPath "src/"
	
npm i -g web-ext

web-ext build -s $addon -a $publish -o --filename "magnet-linker-{version}.zip"

Set-Location $publish

$zip = Get-Childitem -Include *zip* -File -Recurse -ErrorAction SilentlyContinue

Copy-Item -Path $zip -Destination ($zip.FullName -replace "zip", "xpi") -Force

Set-Location $root