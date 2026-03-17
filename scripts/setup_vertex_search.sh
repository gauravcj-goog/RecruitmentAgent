#!/bin/bash
# Script to setup Vertex AI Search RAG Engine

set -e

# Ensure we are in the project root
cd "$(dirname "$0")/.."

echo "==========================================="
echo "Vertex AI Search RAG Engine Setup"
echo "==========================================="

# Check for GOOGLE_CLOUD_PROJECT
if [ -z "$GOOGLE_CLOUD_PROJECT" ]; then
    echo "Error: GOOGLE_CLOUD_PROJECT environment variable is not set."
    echo "Please set it using: export GOOGLE_CLOUD_PROJECT=your-project-id"
    exit 1
fi

echo "Project ID: $GOOGLE_CLOUD_PROJECT"

# Run the python setup script
uv run --project . python3 scripts/setup_vertex_search.py

echo "==========================================="
echo "Setup Complete!"
echo "==========================================="
