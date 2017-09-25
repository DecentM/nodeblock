#!/bin/ash
set -e

cd /nodeblock/build
npm i --only=production
node index.js
