$root = (Get-Location).Path
$publish = Join-Path $root "Publish"

# Create Publish folder or remove any existing release packages
if (!(Test-Path $publish)) {
    New-Item -ItemType Directory -Path $publish | Out-Null
} else {
    Get-ChildItem -Path $publish -File -Recurse -ErrorAction SilentlyContinue | ForEach-Object { Remove-Item $_.FullName -Force }
}

# Firefox (xpi) and Chromium (zip) packages via web-ext
$targets = @(
    @{ path = "dist/firefox";  extension = "xpi" },
    @{ path = "dist/chromium"; extension = "zip" }
)

foreach ($target in $targets) {
    $source = Resolve-Path -LiteralPath $target.path

    Write-Host "Packaging $($target.path) -> Publish/magnet_linker-{version}.$($target.extension)"

    npx web-ext build -s $source -a $publish -o --filename "magnet_linker-{version}.$($target.extension)"
}
