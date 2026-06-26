#!/usr/bin/env python3
"""Fix Bookmarks.jsx and LiveFeed.jsx animations - correct insertion points"""
import re

P = 'C:/tmp/mns-fix/frontend/src/pages'

def read(fn):
    with open(f'{P}/{fn}', 'r') as f: return f.read()

def write(fn, c):
    with open(f'{P}/{fn}', 'w') as f: f.write(c)
    print(f"  {fn}: {len(c)} chars")

def find_imports_end(text):
    """Find the line AFTER the last import statement (handles multi-line imports)"""
    lines = text.split('\n')
    in_import = False
    last_import_end = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import '):
            in_import = True
            last_import_end = i
        elif in_import:
            if stripped.endswith(';') or stripped.endswith("'") or stripped.endswith('"'):
                in_import = False
                last_import_end = i
    return last_import_end

ANIM_CSS = """/* Page Interactive Animations */
const PAGE_ANIMS = `
@keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes slideOutLeft { to{opacity:0;transform:translateX(-100%)} }
@keyframes slideInTop { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
@keyframes sentimentFlash { 0%{filter:brightness(1)} 50%{filter:brightness(1.6)} 100%{filter:brightness(1)} }
@keyframes barFill { from{width:0} to{width:var(--bar-w)} }
@keyframes starPop { 0%{transform:scale(1)} 30%{transform:scale(1.5)} 60%{transform:scale(0.9)} 100%{transform:scale(1)} }
@keyframes folderSlide { from{max-height:0;opacity:0} to{max-height:600px;opacity:1} }
@keyframes ripple { to{transform:scale(4);opacity:0} }
@keyframes checkDraw { from{stroke-dashoffset:50} to{stroke-dashoffset:0} }
`;
const AnimCSS = () => <style dangerouslySetInnerHTML={{__html: PAGE_ANIMS}}/>;
"""

# ========================================
# BOOKMARKS
# ========================================
print("=== Bookmarks ===")
c = read('Bookmarks.jsx')
lines = c.split('\n')

# Find correct insertion point
end = find_imports_end(c)
c_lines = lines[:end+1] + ['', ANIM_CSS, ''] + lines[end+1:]
c = '\n'.join(c_lines)

# Add AnimCSS to return
c = c.replace(
    "return (\n    <div",
    "return (\n    <><AnimCSS />\n    <div"
)
# Close fragment
c = c.rstrip()
# Find the component's closing
idx = c.rfind('</div>\n  );\n};')
if idx >= 0:
    c = c[:idx] + '</div>\n    </>\n  );\n};'

write('Bookmarks.jsx', c)

# ========================================
# LIVE FEED
# ========================================
print("=== LiveFeed ===")
c = read('LiveFeed.jsx')
lines = c.split('\n')

# Find correct insertion point
end = find_imports_end(c)
c_lines = lines[:end+1] + ['', ANIM_CSS, ''] + lines[end+1:]
c = '\n'.join(c_lines)

# Add newIds state
c = c.replace(
    "const [articles, setArticles] = useState([]);",
    "const [articles, setArticles] = useState([]);\n  const [newIds, setNewIds] = useState(new Set());"
)

# Mark new articles when they arrive
c = c.replace(
    "setArticles(prev => {",
    "setNewIds(new Set(data.filter(a => !articles.find(p => p._id === a._id)).map(a => a._id)));\n        setTimeout(() => setNewIds(new Set()), 800);\n        setArticles(prev => {"
)

# Add slide-in class to article cards
c = c.replace(
    'className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] p-4',
    'className={`border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] p-4 transition-all duration-400 ${newIds.has(article._id) ? "animate-[slideInTop_0.4s_ease-out,sentimentFlash_0.8s_ease-out_0.3s]" : ""}`'
)

# Add AnimCSS to return
c = c.replace(
    "return (\n    <div",
    "return (\n    <><AnimCSS />\n    <div"
)
# Close fragment
c = c.rstrip()
idx = c.rfind('</div>\n  );\n};')
if idx >= 0:
    c = c[:idx] + '</div>\n    </>\n  );\n};'

write('LiveFeed.jsx', c)

print("DONE")
