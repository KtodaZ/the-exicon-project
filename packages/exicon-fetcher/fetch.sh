#!/bin/bash
set -e

# Navigate to the project root
cd "$(dirname "$0")"

# Create the data directories
mkdir -p data/simplified

# Build the package
echo "Building the package..."
pnpm build

# Run the fetch command
echo "Fetching exicon data..."
pnpm fetch

echo "Done! Data has been saved to the data directory." 