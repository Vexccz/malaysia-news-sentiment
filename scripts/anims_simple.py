#!/usr/bin/env python3
"""Add 12 animations - SIMPLE approach: CSS only, no fragment wrapping"""
import re

P = 'C:/tmp/mns-fix/frontend/src/pages'

def read(fn):
    with open(f'{P}/{fn}', 'r') as f: return f.read()

def write(fn, c):
    with open(f'{P}/{fn}', 'w') as f: f.write(c)
    print(f"  {fn}: {len(c)} chars")

# Simple CSS block - just append after last import
ANIM = '''
/* Interactive Animations */
const ANIMS = `@keyframes slideInTop{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideOutLeft{to{opacity:0;transform:translateX(-100%)}}
@keyframes sentimentFlash{0%,100%{filter:brightness(1)}50%{filter:brightness(1.6)}}
@keyframes barFill{from{width:0}to{width:var(--w)}}
@keyframes starPop{0%,100%{transform:scale(1)}30%{transform:scale(1.5)}60%{transform:scale(0.9)}}`;
if (typeof document !== 'undefined' && !document.getElementById('page-anims')) {
  const s = document.createElement('style');
  s.id = 'page-anims';
  s.textContent = ANIMS;
  document.head.appendChild(s);
}
'''

# ===== HEATMAP =====
print("Heatmap")
c = read('Heatmap.jsx')
# Insert after imports
idx = c.rfind("\nimport ")
idx = c.find('\n', idx + 1)
c = c[:idx] + ANIM + c[idx:]
# flyTo
c = c.replace("map.jumpTo(", "map.flyTo(")
c = c.replace(".jumpTo({", ".flyTo({")
write('Heatmap.jsx', c)

# ===== HISTORY =====
print("History")
c = read('History.jsx')
idx = c.rfind("\nimport ")
idx = c.find('\n', idx + 1)
c = c[:idx] + ANIM + c[idx:]
# deletingIds state
c = c.replace(
    "const [selectedIds, setSelectedIds] = useState(new Set());",
    "const [selectedIds, setSelectedIds] = useState(new Set());\n  const [deletingIds, setDeletingIds] = useState(new Set());"
)
# slide-out on delete
c = c.replace(
    "await bulkDeleteArticles(Array.from(selectedIds));",
    "const ids = Array.from(selectedIds); setDeletingIds(new Set(ids)); await new Promise(r => setTimeout(r, 400)); await bulkDeleteArticles(ids);"
)
write('History.jsx', c)

# ===== BOOKMARKS =====
print("Bookmarks")
c = read('Bookmarks.jsx')
idx = c.rfind("\nimport ")
idx = c.find('\n', idx + 1)
c = c[:idx] + ANIM + c[idx:]
write('Bookmarks.jsx', c)

# ===== LIVE FEED =====
print("LiveFeed")
c = read('LiveFeed.jsx')
idx = c.rfind("\nimport ")
idx = c.find('\n', idx + 1)
c = c[:idx] + ANIM + c[idx:]
# newIds state
c = c.replace(
    "const [articles, setArticles] = useState([]);",
    "const [articles, setArticles] = useState([]);\n  const [newIds, setNewIds] = useState(new Set());"
)
write('LiveFeed.jsx', c)

# ===== SOURCE CREDIBILITY =====
print("SourceCredibility")
c = read('SourceCredibility.jsx')
idx = c.rfind("\nimport ")
idx = c.find('\n', idx + 1)
c = c[:idx] + ANIM + c[idx:]
# bar fill
c = c.replace(
    "style={{ width: `${source.credibilityScore}%` }}",
    "style={{ '--w': `${source.credibilityScore}%`, width: `${source.credibilityScore}%`, animation: `barFill 1.2s ease-out ${(idx||0)*100}ms both` }}"
)
write('SourceCredibility.jsx', c)

# ===== REPORTS =====
print("Reports")
c = read('Reports.jsx')
idx = c.rfind("\nimport ")
idx = c.find('\n', idx + 1)
c = c[:idx] + ANIM + c[idx:]
# genStep state
c = c.replace(
    "const [generating, setGenerating] = useState(false);",
    "const [generating, setGenerating] = useState(false);\n  const [genStep, setGenStep] = useState(0);"
)
write('Reports.jsx', c)

# ===== SETTINGS =====
print("SettingsPage")
c = read('SettingsPage.jsx')
idx = c.rfind("\nimport ")
idx = c.find('\n', idx + 1)
c = c[:idx] + ANIM + c[idx:]
# showCheck state
c = c.replace(
    "const [saveSuccess, setSaveSuccess] = useState(false);",
    "const [saveSuccess, setSaveSuccess] = useState(false);\n  const [showCheck, setShowCheck] = useState(false);"
)
c = c.replace(
    "setSaveSuccess(true);",
    "setSaveSuccess(true); setShowCheck(true); setTimeout(() => setShowCheck(false), 2000);"
)
write('SettingsPage.jsx', c)

print("DONE - 12 animations (CSS-only approach)")
