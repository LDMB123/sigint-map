#!/bin/bash

# Simple runner script for releases scraper
# This script runs the releases scraper and saves output to releases.json

cd "$(dirname "$0")"

echo "=========================================="
echo "DMBAlmanac Releases Scraper Runner"
echo "=========================================="
echo ""
echo "This script will scrape release data from:"
echo "  https://www.dmbalmanac.com/DiscographyList.aspx"
echo ""
echo "Releases will be saved to:"
echo "  ./output/releases.json"
echo ""
echo "Starting scraper..."
echo ""

# Run the scraper
node --import tsx/esm src/scrapers/releases.ts

echo ""
echo "=========================================="
echo "Scraper complete!"
echo "Check ./output/releases.json for results"
echo "=========================================="
