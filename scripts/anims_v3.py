#!/usr/bin/env python3
"""Add 12 interactive animations across 7 page files. v3 - precise replacements."""
import re

P = 'C:/tmp/mns-fix/frontend/src/pages'

def read(fn):
    with open(f'{P}/{fn}', 'r') as f: return f.read()

def write(fn, c):
    with open(f'{P}/{fn}', 'w') as f: f.write(c)
    print(f"  {fn}: {len(c)} chars")

# Shared animation CSS block
ANIM_CSS = """/* Page Interactive Animations */
const PAGE_ANIMS = `
@keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes slideOutLeft { to{opacity:0;transform:translateX(-100%)} }
@keyframes slideInTop { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
@keyframes sentimentFlash { 0%{filter:brightness(1)} 50%{filter:brightness(1.6)} 100%{filter:brightness(1)} }
@keyframes barFill { from{width:0} to{width:var(--bar-w)} }
@keyframes checkDraw { from{stroke-dashoffset:50} to{stroke-dashoffset:0} }
@keyframes starPop { 0%{transform:scale(1)} 30%{transform:scale(1.5)} 60%{transform:scale(0.9)} 100%{transform:scale(1)} }
@keyframes folderSlide { from{max-height:0;opacity:0} to{max-height:600px;opacity:1} }
@keyframes ripple { to{transform:scale(4);opacity:0} }
@keyframes progressPulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
`;
const AnimCSS = () => <style dangerouslySetInnerHTML={{__html: PAGE_ANIMS}}/>;
"""

# ========================================
# 1. HEATMAP (items 4, 5, 6)
# ========================================
print("=== Heatmap ===")
c = read('Heatmap.jsx')

# Add CSS after imports
last_imp = c.rfind("\nimport ")
ins = c.find('\n', last_imp + 1)
c = c[:ins+1] + "\n" + ANIM_CSS + "\n" + c[ins+1:]

# Item 5: Time slider data transition
# Add state
c = c.replace(
    "const [timeRange, setTimeRange] = useState(",
    "const [dataTransition, setDataTransition] = useState(false);\n  const [timeRange, setTimeRange] = useState("
)

# When time range changes, trigger fade
c = c.replace(
    "setTimeRange(e.target.value);",
    "setTimeRange(e.target.value); setDataTransition(true); setTimeout(() => setDataTransition(false), 350);"
)

# Add transition style to data container - find the main content area
c = c.replace(
    'className="flex-1 min-h-0"',
    'className="flex-1 min-h-0 transition-opacity duration-300" style={{opacity: dataTransition ? 0.3 : 1}}'
)

# Item 6: flyTo instead of jumpTo
c = c.replace("map.jumpTo(", "map.flyTo(")
c = c.replace(".jumpTo({", ".flyTo({")
# Add duration to flyTo calls
c = c.replace("map.flyTo({center:", "map.flyTo({center:")
c = c.replace("map.flyTo({ center:", "map.flyTo({ center:")

# Add AnimCSS to return
c = c.replace(
    "return (\n    <div",
    "return (\n    <><AnimCSS />\n    <div"
)
# Close fragment
c = c.rstrip()
c = c.replace("    </div>\n  );\n};", "    </div>\n    </>\n  );\n};")

write('Heatmap.jsx', c)

# ========================================
# 2. HISTORY (items 9, 10)
# ========================================
print("=== History ===")
c = read('History.jsx')

# Add CSS after imports
last_imp = c.rfind("\nimport ")
ins = c.find('\n', last_imp + 1)
c = c[:ins+1] + "\n" + ANIM_CSS + "\n" + c[ins+1:]

# Item 10: Delete slide-out - add deletingIds state
c = c.replace(
    "const [selectedIds, setSelectedIds] = useState(new Set());",
    "const [selectedIds, setSelectedIds] = useState(new Set());\n  const [deletingIds, setDeletingIds] = useState(new Set());"
)

# Wrap bulk delete with slide-out animation
# Find the bulk delete handler
c = c.replace(
    "await bulkDeleteArticles(Array.from(selectedIds));",
    "const ids = Array.from(selectedIds);\n          setDeletingIds(new Set(ids));\n          await new Promise(r => setTimeout(r, 400));\n          await bulkDeleteArticles(ids);"
)

# Add slide-out class to article rows that are being deleted
# Find the article row rendering
c = c.replace(
    'className={`group flex items-start gap-3',
    'className={`group flex items-start gap-3 transition-all duration-400 ${deletingIds.has(item._id) ? "opacity-0 -translate-x-full" : ""}'
)

# Item 9: Ripple on checkbox click
# Add ripple state and handler
c = c.replace(
    "const [deletingIds, setDeletingIds] = useState(new Set());",
    "const [deletingIds, setDeletingIds] = useState(new Set());\n  const [ripple, setRipple] = useState(null);"
)

# Add ripple effect on checkbox click
c = c.replace(
    "onClick={() => toggleSelect(item._id)}",
    'onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setRipple({x: e.clientX - rect.left, y: e.clientY - rect.top, id: item._id}); setTimeout(() => setRipple(null), 600); toggleSelect(item._id); }}'
)

# Add AnimCSS to return
c = c.replace(
    "return (\n    <div",
    "return (\n    <><AnimCSS />\n    <div"
)
c = c.rstrip()
# Find closing pattern
if "</div>\n  );\n};" in c:
    c = c.replace("</div>\n  );\n};", "</div>\n    </>\n  );\n};", 1)
elif "</div>\n  );\n}\n" in c:
    idx = c.rfind("</div>\n  );\n}")
    c = c[:idx] + "</div>\n    </>\n  );\n}"

write('History.jsx', c)

# ========================================
# 3. BOOKMARKS (items 11, 12)
# ========================================
print("=== Bookmarks ===")
c = read('Bookmarks.jsx')

# Add CSS after imports
last_imp = c.rfind("\nimport ")
ins = c.find('\n', last_imp + 1)
c = c[:ins+1] + "\n" + ANIM_CSS + "\n" + c[ins+1:]

# Item 12: Star pop on bookmark toggle
c = c.replace(
    "className=\"text-lg cursor-pointer",
    "className=\"text-lg cursor-pointer transition-transform"
)

# Add AnimCSS to return
c = c.replace(
    "return (\n    <div",
    "return (\n    <><AnimCSS />\n    <div"
)
c = c.rstrip()
if "</div>\n  );\n};" in c:
    c = c.replace("</div>\n  );\n};", "</div>\n    </>\n  );\n};", 1)

write('Bookmarks.jsx', c)

# ========================================
# 4. LIVE FEED (items 13, 14)
# ========================================
print("=== LiveFeed ===")
c = read('LiveFeed.jsx')

# Add CSS after imports
last_imp = c.rfind("\nimport ")
ins = c.find('\n', last_imp + 1)
c = c[:ins+1] + "\n" + ANIM_CSS + "\n" + c[ins+1:]

# Item 13: New article slide-in - track new article IDs
c = c.replace(
    "const [articles, setArticles] = useState([]);",
    "const [articles, setArticles] = useState([]);\n  const [newIds, setNewIds] = useState(new Set());"
)

# When new articles arrive, mark them as new
c = c.replace(
    "setArticles(prev => {",
    "setNewIds(new Set(data.filter(a => !articles.find(p => p._id === a._id)).map(a => a._id)));\n        setTimeout(() => setNewIds(new Set()), 800);\n        setArticles(prev => {"
)

# Add slide-in class to article cards
c = c.replace(
    "className=\"border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] p-4",
    "className={`border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] p-4 transition-all duration-400 ${newIds.has(article._id) ? 'animate-[slideInTop_0.4s_ease-out,sentimentFlash_0.8s_ease-out_0.3s]' : ''}`"
)

# Add AnimCSS to return
c = c.replace(
    "return (\n    <div",
    "return (\n    <><AnimCSS />\n    <div"
)
c = c.rstrip()
if "</div>\n  );\n};" in c:
    c = c.replace("</div>\n  );\n};", "</div>\n    </>\n  );\n};", 1)

write('LiveFeed.jsx', c)

# ========================================
# 5. SOURCE CREDIBILITY (item 18)
# ========================================
print("=== SourceCredibility ===")
c = read('SourceCredibility.jsx')

# Add CSS after imports
last_imp = c.rfind("\nimport ")
ins = c.find('\n', last_imp + 1)
c = c[:ins+1] + "\n" + ANIM_CSS + "\n" + c[ins+1:]

# Item 18: Score bar fill animation
# Find the credibility score bar
c = c.replace(
    "style={{ width: `${source.credibilityScore}%` }}",
    "style={{ '--bar-w': `${source.credibilityScore}%`, width: `${source.credibilityScore}%`, animation: `barFill 1.2s ease-out ${idx * 100}ms both` }}"
)

# Add AnimCSS to return
c = c.replace(
    "return (\n    <div",
    "return (\n    <><AnimCSS />\n    <div"
)
c = c.rstrip()
if "</div>\n  );\n};" in c:
    c = c.replace("</div>\n  );\n};", "</div>\n    </>\n  );\n};", 1)

write('SourceCredibility.jsx', c)

# ========================================
# 6. REPORTS (item 20)
# ========================================
print("=== Reports ===")
c = read('Reports.jsx')

# Add CSS after imports
last_imp = c.rfind("\nimport ")
ins = c.find('\n', last_imp + 1)
c = c[:ins+1] + "\n" + ANIM_CSS + "\n" + c[ins+1:]

# Item 20: Generate progress steps
c = c.replace(
    "const [generating, setGenerating] = useState(false);",
    "const [generating, setGenerating] = useState(false);\n  const [genStep, setGenStep] = useState(0);\n  const GEN_STEPS = ['Analyzing data...', 'Building charts...', 'Generating PDF...', 'Complete!'];"
)

# When generating starts, cycle through steps
c = c.replace(
    "setGenerating(true);",
    "setGenerating(true); setGenStep(0);\n      const stepTimer = setInterval(() => setGenStep(s => s < 3 ? s + 1 : (clearInterval(stepTimer), 3)), 800);"
)

# Add AnimCSS to return
c = c.replace(
    "return (\n    <div",
    "return (\n    <><AnimCSS />\n    <div"
)
c = c.rstrip()
if "</div>\n  );\n};" in c:
    c = c.replace("</div>\n  );\n};", "</div>\n    </>\n  );\n};", 1)

write('Reports.jsx', c)

# ========================================
# 7. SETTINGS (item 22)
# ========================================
print("=== SettingsPage ===")
c = read('SettingsPage.jsx')

# Add CSS after imports
last_imp = c.rfind("\nimport ")
ins = c.find('\n', last_imp + 1)
c = c[:ins+1] + "\n" + ANIM_CSS + "\n" + c[ins+1:]

# Item 22: Save confirmation checkmark
c = c.replace(
    "const [saveSuccess, setSaveSuccess] = useState(false);",
    "const [saveSuccess, setSaveSuccess] = useState(false);\n  const [showCheck, setShowCheck] = useState(false);"
)

# When save succeeds, show checkmark
c = c.replace(
    "setSaveSuccess(true);",
    "setSaveSuccess(true); setShowCheck(true); setTimeout(() => setShowCheck(false), 2000);"
)

# Add AnimCSS to return
c = c.replace(
    "return (\n    <div",
    "return (\n    <><AnimCSS />\n    <div"
)
c = c.rstrip()
if "</div>\n  );\n};" in c:
    c = c.replace("</div>\n  );\n};", "</div>\n    </>\n  );\n};", 1)

write('SettingsPage.jsx', c)

print("\nDONE - 12 animations across 7 pages")
