#!/usr/bin/env python3
"""
Final Complete Synchronization Script
Sets navigation links to normal weight (not bold)

Changes:
- font-weight: 400 (normal, not bold)
- color: #4B5563 (medium gray)
- Footer green working correctly
"""

import re
import sys
import os


class CompleteSynchronizer:
    def __init__(self, master_file='index.html', footer_file='footer.html'):
        self.master_file = master_file
        self.footer_file = footer_file
        self.master_content = self._read_file(master_file)
        self.footer_content = self._read_file(footer_file) if os.path.exists(footer_file) else None
        
    def _read_file(self, filepath):
        """Read file content"""
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except Exception as e:
            print(f"Warning: Could not read {filepath}: {e}")
            return None
    
    def _write_file(self, filepath, content):
        """Write content to file"""
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Successfully updated: {filepath}")
        except Exception as e:
            print(f"Error writing {filepath}: {e}")
            sys.exit(1)
    
    def extract_and_merge_css(self):
        """Extract CSS and fix navigation styling"""
        if not self.master_content:
            return None
        
        # Extract navigation CSS
        style_start = self.master_content.find('<style>')
        style_end = self.master_content.find('</style>', style_start)
        
        if style_start == -1 or style_end == -1:
            return None
        
        nav_css = self.master_content[style_start:style_end + 8]
        
        # Extract footer CSS
        footer_css = ""
        if self.footer_content:
            footer_css_start = self.footer_content.find('/* Enhanced Footer */')
            if footer_css_start != -1:
                style_end_footer = self.footer_content.find('</style>', footer_css_start)
                if style_end_footer != -1:
                    footer_css = self.footer_content[footer_css_start:style_end_footer].strip()
        
        # Remove </style>
        nav_css_content = nav_css.replace('</style>', '').strip()
        
        # Create combined CSS with fixes
        combined_css = f"""{nav_css_content}

        {footer_css}
        
        /* Ensure footer variables match navigation variables */
        .enhanced-footer {{
            --primary: var(--emerald);
            --primary-dark: var(--emerald-dark);
        }}
        
        /* FINAL FIX: Navigation link styling */
        .nav-menu li a,
        .nav-menu > li > a {{
            color: #4B5563 !important;
            font-weight: 400 !important;  /* Normal weight, not bold */
        }}
        
        .nav-menu li a:hover,
        .nav-menu > li > a:hover {{
            color: var(--emerald) !important;
        }}
    </style>"""
        
        return combined_css
    
    def extract_navigation(self):
        """Extract navigation HTML"""
        if not self.master_content:
            return None
            
        nav_pattern = r'(<nav\s+class="top-nav".*?>.*?</nav>)'
        match = re.search(nav_pattern, self.master_content, re.DOTALL)
        return match.group(1) if match else None
    
    def extract_footer_html(self):
        """Extract footer HTML"""
        if not self.footer_content:
            if self.master_content:
                footer_pattern = r'(<footer.*?>.*?</footer>)'
                match = re.search(footer_pattern, self.master_content, re.DOTALL)
                return match.group(1) if match else None
            return None
        
        footer_pattern = r'(<footer\s+class="enhanced-footer".*?>.*?</footer>)'
        match = re.search(footer_pattern, self.footer_content, re.DOTALL)
        return match.group(1) if match else None
    
    def extract_scripts(self):
        """Extract scripts"""
        if not self.master_content:
            return None
            
        footer_end = self.master_content.rfind('</footer>')
        body_end = self.master_content.rfind('</body>')
        
        if footer_end == -1 or body_end == -1:
            return None
        
        scripts_section = self.master_content[footer_end:body_end]
        script_pattern = r'<script(?!\s+src="/_vercel)(?!\s+async\s+src="https://www\.googletagmanager).*?</script>'
        scripts = re.findall(script_pattern, scripts_section, re.DOTALL)
        
        functional_scripts = []
        for script in scripts:
            if 'gtag' not in script and 'dataLayer' not in script and 'analytics' not in script.lower():
                functional_scripts.append(script)
        
        return '\n'.join(functional_scripts) if functional_scripts else None
    
    def synchronize_page(self, subpage_file):
        """Complete synchronization"""
        if not os.path.exists(subpage_file):
            print(f"Error: File not found: {subpage_file}")
            return False
        
        print(f"\n🔄 Synchronizing: {subpage_file}")
        
        subpage_content = self._read_file(subpage_file)
        if not subpage_content:
            return False
            
        original_content = subpage_content
        
        # 1. Replace CSS
        combined_css = self.extract_and_merge_css()
        
        if combined_css:
            style_pattern = r'<style>.*?</style>'
            if re.search(style_pattern, subpage_content, re.DOTALL):
                subpage_style = re.search(style_pattern, subpage_content, re.DOTALL).group(0)
                
                # Check for page-specific CSS
                markers = [r'/\*\s*PAGE', r'/\*\s*UNIQUE', r'\.about-', r'\.contact-', r'\.hero\s*{']
                page_css = ""
                
                for marker in markers:
                    match = re.search(marker, subpage_style)
                    if match:
                        page_css = subpage_style[match.start():]
                        page_css = page_css.replace('</style>', '').strip()
                        break
                
                if page_css:
                    final_css = combined_css.replace('</style>', f'\n\n        {page_css}\n    </style>')
                    subpage_content = re.sub(style_pattern, final_css, subpage_content, flags=re.DOTALL)
                    print("  ✓ Updated CSS (normal font weight)")
                else:
                    subpage_content = re.sub(style_pattern, combined_css, subpage_content, flags=re.DOTALL)
                    print("  ✓ Updated CSS (normal font weight)")
        
        # 2. Replace navigation
        nav_html = self.extract_navigation()
        if nav_html:
            nav_pattern = r'<nav\s+class="top-nav".*?>.*?</nav>'
            if re.search(nav_pattern, subpage_content, re.DOTALL):
                subpage_content = re.sub(nav_pattern, nav_html, subpage_content, flags=re.DOTALL)
                print("  ✓ Updated navigation HTML")
        
        # 3. Replace footer
        footer_html = self.extract_footer_html()
        if footer_html:
            footer_pattern = r'<footer.*?>.*?</footer>'
            if re.search(footer_pattern, subpage_content, re.DOTALL):
                subpage_content = re.sub(footer_pattern, footer_html, subpage_content, flags=re.DOTALL)
                print("  ✓ Updated footer HTML")
        
        # 4. Update scripts
        scripts_html = self.extract_scripts()
        if scripts_html:
            body_end = subpage_content.rfind('</body>')
            footer_end = subpage_content.rfind('</footer>')
            
            if body_end != -1 and footer_end != -1:
                before_footer = subpage_content[:footer_end + len('</footer>')]
                existing_scripts = subpage_content[footer_end:body_end]
                
                analytics_pattern = r'(<script.*?(?:gtag|analytics|dataLayer).*?</script>)'
                analytics = re.findall(analytics_pattern, existing_scripts, re.DOTALL)
                analytics_html = '\n'.join(analytics) if analytics else ''
                
                subpage_content = f"{before_footer}\n\n{scripts_html}\n{analytics_html}\n</body>\n</html>"
                print("  ✓ Updated scripts")
        
        # Save
        if subpage_content != original_content:
            backup_file = f"{subpage_file}.backup"
            self._write_file(backup_file, original_content)
            print(f"  💾 Backup: {backup_file}")
            self._write_file(subpage_file, subpage_content)
            return True
        else:
            print("  ℹ Already synchronized")
            return False


def main():
    if len(sys.argv) < 2:
        print("""
Final Complete Synchronization Script
======================================

Usage: python sync_shell_complete.py <file1.html> <file2.html> ...

This script sets:
✓ Navigation links - normal weight (not bold)
✓ Navigation color - #4B5563 (medium gray)
✓ Footer status - green (#16A34A)

Example:
  python sync_shell_complete.py about.html
""")
        sys.exit(1)
    
    sync = CompleteSynchronizer('index.html', 'footer.html')
    files = [f for f in sys.argv[1:] if f != 'index.html' and f != 'footer.html' and not f.endswith('.backup')]
    
    print("=" * 70)
    print("Final Complete Synchronization")
    print("=" * 70)
    print(f"Master: index.html")
    print(f"Footer: footer.html")
    print(f"Files: {len(files)}\n")
    
    success = sum(1 for f in files if sync.synchronize_page(f))
    
    print("\n" + "=" * 70)
    print(f"✅ Complete: {success}/{len(files)} files updated")
    print("=" * 70)
    print("\n✨ Navigation: normal weight + medium gray color")
    print("✨ Footer: green status indicator")
    print("\nPerfect! 🎉")


if __name__ == "__main__":
    main()
