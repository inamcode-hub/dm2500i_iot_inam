#!/bin/bash
while true; do
    if [ -p "progress.pipe" ]; then
        if read line < progress.pipe; then
            echo "$line" > progress.json
        fi
    fi
    sleep 0.1
done
