#!/bin/bash

if [[ $# == 0 ]]; then
  echo "usage: cd <destination dir> && \$0 <source data dir>"
  exit 0
fi

FROM="$1"

cp "$FROM"/*.local.html .

mkdir -p images

<"$FROM"/*imagemap-story.json jq -r -j '.[]|(.+"\u0000")' | xargs -r -0 -I {} dirname "{}" | sort | uniq | xargs -d '\n' -I {} mkdir -p "images/{}"
<"$FROM"/*imagemap-story.json jq -r -j '.[]|(.+"\u0000")' | xargs -r -0 -I {} cp "$FROM/images/{}" "images/{}"
