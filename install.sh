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
echo "  ai-playbook install              # Cursor: global commands, skills, rules"
echo "  ai-playbook install-all          # In a project: Cursor + Claude + Copilot + Antigravity"
echo "  ai-playbook manifest             # View rules vs skills vs commands taxonomy"
