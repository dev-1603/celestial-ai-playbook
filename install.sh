#!/usr/bin/env bash

set -e

echo "🚀 Installing Celestial AI Playbook CLI..."

# Ensure we are in the correct directory
cd "$(dirname "$0")"

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Make the CLI executable
echo "🔧 Setting execute permissions on bin/ai-playbook..."
chmod +x bin/ai-playbook

# Link globally
echo "🔗 Linking CLI globally..."
npm link

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "  ai-playbook install              # Global: Cursor rules, skills, commands"
echo "  ai-playbook install-all          # Global: all 4 IDE targets"
echo "  ai-playbook generate-rules <abs-project-path> --selectors /role/backend /base"
echo "  ai-playbook manifest             # View rules vs skills vs commands taxonomy"
echo "  ai-playbook eval                 # Run verification eval suite"
