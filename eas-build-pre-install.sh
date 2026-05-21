#!/bin/bash
# Enable corepack so EAS uses the correct Yarn version (3.6.4) from packageManager field
corepack enable
corepack prepare yarn@3.6.4 --activate
