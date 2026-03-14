#!/bin/bash
lsof -ti:3000 | xargs kill -9 2>/dev/null
rm -rf paper-trading/.next/dev/lock
cd paper-trading && npm run dev
