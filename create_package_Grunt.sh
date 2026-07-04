#!/usr/bin/env bash
set -euo pipefail

root=$(pwd)
publish=$root/Publish

mkdir -p "$publish"
find "$publish" -type f -delete

build_package() {
    local path=$1
    local extension=$2

    echo "Packaging dist/$path -> Publish/magnet_linker-{version}.$extension"

    npx web-ext build -s "$root/dist/$path" -a "$publish" -o --filename "magnet_linker-{version}.$extension"
}

build_package firefox xpi
build_package chromium zip
