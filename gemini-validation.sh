#!/bin/bash

echo "=== Gemini CLI Validation Sequence ==="
echo ""

echo "1. Testing basic interaction..."
echo "hi" | gemini 2>&1 | head -5
echo ""

echo "2. Setting workspace (if supported)..."
echo "/directory add ." | gemini 2>&1 | head -10
echo ""

echo "3. Checking MCP servers..."
echo "/mcp list" | gemini 2>&1 | head -20
echo ""

echo "4. Testing help command..."
echo "/help" | gemini 2>&1 | head -15
echo ""

echo "=== Validation Complete ==="