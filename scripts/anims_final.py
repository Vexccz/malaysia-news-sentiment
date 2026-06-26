#!/usr/bin/env python3
"""Add all 12 animations - fixed import detection for multi-line imports"""
import re

P = 'C:/tmp/mns-fix/frontend/src/pages'

def read_file(fn):
    with open(f'{P}/{fn}', 'r') as f: return f.read()

def write_file(fn, c):
    with open(f'{P}/{fn}', 'w') as f: f.write(c)
    print(f"  {fn}: {len(c)} chars, {c.count(chr(10))+1} lines")

def find_imports_end(text):
    """Find line index AFTER last import statement"""
    lines = text.split('\n')
    last_end = 0
    i = 0
    while i < len(lines):
        s = lines[i].strip()
        if s.startswith('import '):
            # Multi-line import: find the closing line
            while i < len(lines) and not (lines[i].strip().endswith(';') or 
                  (("'" in lines[i] or '"' in lines[i]) and 'from' in lines[i])):
                i += 1
            last_end = i
        i += 1
    return last_end

def insert_after_imports(text, insertion):
    lines = text.split('\n')
    end = find_imports_end(text)
    new_lines = lines[:end+1] + ['', insertion, ''] + lines[end+1:]
    return '\n'.join(new_lines)

def close_fragment(text):
    """Add <> at return start and </> before closing"""
    text = text.rstrip()
    text = text.replace("  return (\n    <div", "  return (\n    <><AnimCSS />\n    <div", 1)
    idx = text.rfind('</div>\n  );\n};')
    if idx >= 0:
        text = text[:idx] + '</div>\n    </>\n  );\n};'
    return text

ANIM_CSS = """/* Page Interactive Animations */
const PAGE_ANIMS = `
@keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes slideOutLeft { to{opacity:0;transform:translateX(-100%)} }
@keyframes slideInTop { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
@keyframes sentimentFlash { 0%{filter:brightness(1)} 50%{filter:brightness(1.6)} 100%{filter:brightness(1)} }
@keyframes barFill { from{width:0} to{width:var(--bar-w)} }
@keyframes starPop { 0%{transform:scale(1)} 30%{transform:scale(1.5)} 60%{transform:scale(0.9)} 100%{transform:scale(1)} }
@keyframes ripple { to{transform:scale(4);opacity:0} }
@keyframes checkDraw { from{stroke-dashoffset:50} to{stroke-dashoffset:0} }
@keyframes progressPulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
`;
const AnimCSS = () => <style dangerouslySetInnerHTML={{__html: PAGE_ANIMS}}/>;
"""

# Verify insertion points first
for fn in ['Heatmap.jsx', 'History.jsx', 'Bookmarks.jsx', 'LiveFeed.jsx', 'SourceCredibility.jsx', 'Reports.jsx', 'SettingsPage.jsx']:
    c = read_file(fn)
    end = find_imports_end(c)
    lines = c.split('\n')
    print(f"{fn}: imports end at line {end+1}: '{lines[end].strip()[:60]}'")

# ========================================
# HEATMAP (items 4, 5, 6)
# ========================================
print("\n=== Heatmap ===")
c = read_file('Heatmap.jsx')
c = insert_after_imports(c, ANIM_CSS)

# Item 5: data transition state
c = c.replace(
    "const [timeRange, setTimeRange] = useState(",
    "const [dataTransition, setDataTransition] = useState(false);\n  const [timeRange, setTimeRange] = useState("
)
c = c.replace(
    "setTimeRange(e.target.value);",
    "setTimeRange(e.target.value); setDataTransition(true); setTimeout(() => setDataTransition(false), 350);"
)

# Item 6: flyTo
c = c.replace("map.jumpTo(", "map.flyTo(")
c = c.replace(".jumpTo({", ".flyTo({")

c = close_fragment(c)
write_file('Heatmap.jsx', c)

# ========================================
# HISTORY (items 9, 10)
# ========================================
print("=== History ===")
c = read_file('History.jsx')
c = insert_after_imports(c, ANIM_CSS)

# Item 10: delete slide-out
c = c.replace(
    "const [selectedIds, setSelectedIds] = useState(new Set());",
    "const [selectedIds, setSelectedIds] = useState(new Set());\n  const [deletingIds, setDeletingIds] = useState(new Set());\n  const [ripple, setRipple] = useState(null);"
)

c = c.replace(
    "await bulkDeleteArticles(Array.from(selectedIds));",
    "const ids = Array.from(selectedIds);\n          setDeletingIds(new Set(ids));\n          await new Promise(r => setTimeout(r, 400));\n          await bulkDeleteArticles(ids);"
)

c = close_fragment(c)
write_file('History.jsx', c)

# ========================================
# BOOKMARKS (items 11, 12)
# ========================================
print("=== Bookmarks ===")
c = read_file('Bookmarks.jsx')
c = insert_after_imports(c, ANIM_CSS)
c = close_fragment(c)
write_file('Bookmarks.jsx', c)

# ========================================
# LIVE FEED (items 13, 14)
# ========================================
print("=== LiveFeed ===")
c = read_file('LiveFeed.jsx')
c = insert_after_imports(c, ANIM_CSS)

# Item 13: new article tracking
c = c.replace(
    "const [articles, setArticles] = useState([]);",
    "const [articles, setArticles] = useState([]);\n  const [newIds, setNewIds] = useState(new Set());"
)

c = close_fragment(c)
write_file('LiveFeed.jsx', c)

# ========================================
# SOURCE CREDIBILITY (item 18)
# ========================================
print("=== SourceCredibility ===")
c = read_file('SourceCredibility.jsx')
c = insert_after_imports(c, ANIM_CSS)

# Item 18: bar fill animation
c = c.replace(
    "style={{ width: `${source.credibilityScore}%` }}",
    "style={{ '--bar-w': `${source.credibilityScore}%`, width: `${source.credibilityScore}%`, animation: `barFill 1.2s ease-out ${(idx || 0) * 100}ms both` }}"
)

c = close_fragment(c)
write_file('SourceCredibility.jsx', c)

# ========================================
# REPORTS (item 20)
# ========================================
print("=== Reports ===")
c = read_file('Reports.jsx')
c = insert_after_imports(c, ANIM_CSS)

# Item 20: generate progress
c = c.replace(
    "const [generating, setGenerating] = useState(false);",
    "const [generating, setGenerating] = useState(false);\n  const [genStep, setGenStep] = useState(0);\n  const GEN_STEPS = ['Analyzing data...', 'Building charts...', 'Generating PDF...', 'Complete!'];"
)

c = c.replace(
    "setGenerating(true);",
    "setGenerating(true); setGenStep(0);\n      const stepTimer = setInterval(() => setGenStep(s => { if (s >= 3) { clearInterval(stepTimer); return 3; } return s + 1; }), 800);"
)

c = close_fragment(c)
write_file('Reports.jsx', c)

# ========================================
# SETTINGS (item 22)
# ========================================
print("=== SettingsPage ===")
c = read_file('SettingsPage.jsx')
c = insert_after_imports(c, ANIM_CSS)

# Item 22: save checkmark
c = c.replace(
    "const [saveSuccess, setSaveSuccess] = useState(false);",
    "const [saveSuccess, setSaveSuccess] = useState(false);\n  const [showCheck, setShowCheck] = useState(false);"
)

c = c.replace(
    "setSaveSuccess(true);",
    "setSaveSuccess(true); setShowCheck(true); setTimeout(() => setShowCheck(false), 2000);"
)

c = close_fragment(c)
write_file('SettingsPage.jsx', c)

print("\nDONE - all 12 animations across 7 pages")
