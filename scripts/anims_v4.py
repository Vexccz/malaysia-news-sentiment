#!/usr/bin/env python3
"""Add 12 animations - v4 with safer fragment handling"""
import re

P = 'C:/tmp/mns-fix/frontend/src/pages'

def read_file(fn):
    with open(f'{P}/{fn}', 'r') as f: return f.read()

def write_file(fn, c):
    with open(f'{P}/{fn}', 'w') as f: f.write(c)
    print(f"  OK {fn}: {len(c)} chars")

def find_imports_end(text):
    lines = text.split('\n')
    last_end = 0
    i = 0
    while i < len(lines):
        s = lines[i].strip()
        if s.startswith('import '):
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

def add_fragment_wrapper(text, component_name=None):
    """Find the main component's return and wrap with <>...</>"""
    lines = text.split('\n')
    
    # Find the main component's return statement (the one right before the last export default)
    export_idx = -1
    for i in range(len(lines)-1, -1, -1):
        if lines[i].strip().startswith('export default'):
            export_idx = i
            break
    
    if export_idx < 0:
        return text
    
    # Find the last "return (" before export
    return_idx = -1
    for i in range(export_idx-1, -1, -1):
        stripped = lines[i].strip()
        if stripped == 'return (' or stripped.startswith('return ('):
            return_idx = i
            break
    
    if return_idx < 0:
        return text
    
    # Insert <> after "return ("
    # The next line should be the opening <div or <>
    insert_at = return_idx + 1
    lines.insert(insert_at, '    <><AnimCSS />')
    
    # Find the matching closing: the ); that closes the return
    # We need to find the ); that matches the return (
    # Count parens from return_idx
    paren_depth = 0
    close_idx = -1
    for i in range(return_idx, len(lines)):
        for ch in lines[i]:
            if ch == '(':
                paren_depth += 1
            elif ch == ')':
                paren_depth -= 1
                if paren_depth == 0:
                    close_idx = i
                    break
        if close_idx >= 0:
            break
    
    if close_idx < 0:
        return text
    
    # Insert </> before the closing );
    # The line before ); should be </div>
    # Insert </> between </div> and );
    lines.insert(close_idx, '    </>')
    
    return '\n'.join(lines)

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

# ========================================
# HEATMAP
# ========================================
print("=== Heatmap ===")
c = read_file('Heatmap.jsx')
c = insert_after_imports(c, ANIM_CSS)
c = c.replace(
    "const [timeRange, setTimeRange] = useState(",
    "const [dataTransition, setDataTransition] = useState(false);\n  const [timeRange, setTimeRange] = useState("
)
c = c.replace(
    "setTimeRange(e.target.value);",
    "setTimeRange(e.target.value); setDataTransition(true); setTimeout(() => setDataTransition(false), 350);"
)
c = c.replace("map.jumpTo(", "map.flyTo(")
c = c.replace(".jumpTo({", ".flyTo({")
c = add_fragment_wrapper(c, 'Heatmap')
write_file('Heatmap.jsx', c)

# ========================================
# HISTORY
# ========================================
print("=== History ===")
c = read_file('History.jsx')
c = insert_after_imports(c, ANIM_CSS)
c = c.replace(
    "const [selectedIds, setSelectedIds] = useState(new Set());",
    "const [selectedIds, setSelectedIds] = useState(new Set());\n  const [deletingIds, setDeletingIds] = useState(new Set());"
)
c = c.replace(
    "await bulkDeleteArticles(Array.from(selectedIds));",
    "const ids = Array.from(selectedIds);\n          setDeletingIds(new Set(ids));\n          await new Promise(r => setTimeout(r, 400));\n          await bulkDeleteArticles(ids);"
)
c = add_fragment_wrapper(c, 'History')
write_file('History.jsx', c)

# ========================================
# BOOKMARKS
# ========================================
print("=== Bookmarks ===")
c = read_file('Bookmarks.jsx')
c = insert_after_imports(c, ANIM_CSS)
c = add_fragment_wrapper(c, 'Bookmarks')
write_file('Bookmarks.jsx', c)

# ========================================
# LIVE FEED
# ========================================
print("=== LiveFeed ===")
c = read_file('LiveFeed.jsx')
c = insert_after_imports(c, ANIM_CSS)
c = c.replace(
    "const [articles, setArticles] = useState([]);",
    "const [articles, setArticles] = useState([]);\n  const [newIds, setNewIds] = useState(new Set());"
)
c = add_fragment_wrapper(c, 'LiveFeed')
write_file('LiveFeed.jsx', c)

# ========================================
# SOURCE CREDIBILITY
# ========================================
print("=== SourceCredibility ===")
c = read_file('SourceCredibility.jsx')
c = insert_after_imports(c, ANIM_CSS)
c = add_fragment_wrapper(c, 'SourceCredibility')
write_file('SourceCredibility.jsx', c)

# ========================================
# REPORTS
# ========================================
print("=== Reports ===")
c = read_file('Reports.jsx')
c = insert_after_imports(c, ANIM_CSS)
c = c.replace(
    "const [generating, setGenerating] = useState(false);",
    "const [generating, setGenerating] = useState(false);\n  const [genStep, setGenStep] = useState(0);"
)
c = c.replace(
    "setGenerating(true);",
    "setGenerating(true); setGenStep(0);\n      const stepTimer = setInterval(() => setGenStep(s => { if (s >= 3) { clearInterval(stepTimer); return 3; } return s + 1; }), 800);"
)
c = add_fragment_wrapper(c, 'Reports')
write_file('Reports.jsx', c)

# ========================================
# SETTINGS
# ========================================
print("=== SettingsPage ===")
c = read_file('SettingsPage.jsx')
c = insert_after_imports(c, ANIM_CSS)
c = c.replace(
    "const [saveSuccess, setSaveSuccess] = useState(false);",
    "const [saveSuccess, setSaveSuccess] = useState(false);\n  const [showCheck, setShowCheck] = useState(false);"
)
c = c.replace(
    "setSaveSuccess(true);",
    "setSaveSuccess(true); setShowCheck(true); setTimeout(() => setShowCheck(false), 2000);"
)
c = add_fragment_wrapper(c, 'SettingsPage')
write_file('SettingsPage.jsx', c)

print("\nDONE")
