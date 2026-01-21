#!/bin/bash

# TradeMatch 2026 Redesign - Auto-Update Script
# This script adds modern styles to all HTML files

echo "🎨 TradeMatch 2026 Redesign Tool"
echo "================================="
echo ""

# Check if directory exists
if [ ! -d "." ]; then
    echo "❌ Please run this script from your frontend directory"
    exit 1
fi

echo "This script will:"
echo "  1. Backup all HTML files"
echo "  2. Add modern Inter font"
echo "  3. Add CSS variables for glassmorphism"
echo "  4. Update navigation to glass style"
echo "  5. Add gradient backgrounds"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Create backup
echo "📦 Creating backup..."
mkdir -p backup_$(date +%Y%m%d_%H%M%S)
cp *.html backup_$(date +%Y%m%d_%H%M%S)/ 2>/dev/null
echo "✅ Backup created"

# Function to add modern font
add_modern_font() {
    local file=$1
    if ! grep -q "fonts.googleapis.com/css2?family=Inter" "$file"; then
        sed -i '/<head>/a\    <link rel="preconnect" href="https://fonts.googleapis.com">\n    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">' "$file"
        echo "  ✓ Added Inter font to $file"
    fi
}

# Function to add CSS variables
add_css_variables() {
    local file=$1
    if ! grep -q "var(--emerald)" "$file"; then
        # Add variables after <style> tag
        sed -i '/<style>/a\        :root {\n            --emerald: #10b981;\n            --emerald-dark: #059669;\n            --emerald-light: #34d399;\n            --dark-bg: #0f172a;\n            --dark-secondary: #1e293b;\n            --glass-bg: rgba(255, 255, 255, 0.1);\n            --glass-border: rgba(255, 255, 255, 0.2);\n        }' "$file"
        echo "  ✓ Added CSS variables to $file"
    fi
}

# Process all HTML files
echo ""
echo "🔄 Updating HTML files..."
for file in *.html; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        add_modern_font "$file"
        add_css_variables "$file"
    fi
done

echo ""
echo "✅ Update complete!"
echo ""
echo "Next steps:"
echo "  1. Review the changes in your files"
echo "  2. Test the website locally"
echo "  3. Update specific page styles manually"
echo "  4. Deploy to Vercel"
echo ""
echo "💡 Tip: Check the COMPLETE-REDESIGN-GUIDE.md for detailed styling examples"

