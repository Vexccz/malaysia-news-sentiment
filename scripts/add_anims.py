#!/usr/bin/env python3
"""Add interactive animations to CommunityPage.jsx and CommentItem.jsx"""
import re, os

BASE = os.path.join('C:', os.sep, 'tmp', 'mns-fix', 'frontend', 'src')

# ===== CommentItem.jsx =====
with open(os.path.join(BASE, 'components', 'CommentItem.jsx'), 'r') as f:
    ci = f.read()

# 1. CSS after imports
ci = ci.replace(
    "import { API_BASE } from '../config';\n",
    "import { API_BASE } from '../config';\n"
    "/* Comment Animations */\n"
    "const COMMENT_ANIMS = `\n"
    "@keyframes likePop { 0%{transform:scale(1)} 30%{transform:scale(1.6)} 50%{transform:scale(0.85)} 80%{transform:scale(1.1)} 100%{transform:scale(1)} }\n"
    "@keyframes likeGlow { 0%{filter:drop-shadow(0 0 0 transparent)} 30%{filter:drop-shadow(0 0 8px rgba(220,38,38,0.6))} 100%{filter:drop-shadow(0 0 0 transparent)} }\n"
    "@keyframes commentSlideIn { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }\n"
    "@keyframes draftToastIn { 0%{opacity:0;transform:translateX(24px)} 100%{opacity:1;transform:translateX(0)} }\n"
    "`;\n"
    "const CommentAnimCSS = () => <style dangerouslySetInnerHTML={{__html: COMMENT_ANIMS}}/>;\n\n"
)

# 2. index prop
ci = ci.replace(
    "  depth = 0,\n  onReply,\n}) => {",
    "  depth = 0,\n  onReply,\n  index = 0,\n}) => {"
)

# 3. likeAnimKey state
ci = ci.replace(
    "  const [reported, setReported] = useState(false);",
    "  const [reported, setReported] = useState(false);\n  const [likeAnimKey, setLikeAnimKey] = useState(0);"
)

# 4. trigger animation
ci = ci.replace(
    "    setLiked(true);\n    setLikeCount((c) => c + 1);\n    if (onLike) onLike(commentId);",
    "    setLiked(true);\n    setLikeCount((c) => c + 1);\n    setLikeAnimKey(k => k + 1);\n    if (onLike) onLike(commentId);"
)

# 5. SVG pop animation
ci = ci.replace(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" style={liked ? {animation:"likePop 0.45s cubic-bezier(0.175,0.885,0.32,1.275), likeGlow 0.5s ease-out"} : {}} key={likeAnimKey}>'
)

# 6. slide-in wrapper
ci = ci.replace(
    "  return (\n    <div className={`${indentClass} ${depth > 0 ? 'mt-2' : ''}`}>",
    "  return (\n    <>\n    <CommentAnimCSS />\n    <div className={`${indentClass} ${depth > 0 ? 'mt-2' : ''}`} style={{animation:`commentSlideIn 0.4s ease-out ${index * 50}ms both`}}>"
)

# 7. draft toast
ci = ci.replace(
    "{showDraftSaved && (\n            <span className=\"text-[10px] text-amber-700 font-sans ml-auto italic\">",
    "{showDraftSaved && (\n            <span className=\"text-[10px] text-amber-700 font-sans ml-auto italic\" style={{animation:'draftToastIn 0.3s ease-out'}}>"
)

# 8. close fragment
ci = ci.rstrip()
idx = ci.rfind('    </div>\n  );\n};')
if idx >= 0:
    ci = ci[:idx] + '    </div>\n    </>\n  );\n};'

with open(os.path.join(BASE, 'components', 'CommentItem.jsx'), 'w') as f:
    f.write(ci)
print(f"CommentItem: {len(ci)} chars")


# ===== CommunityPage.jsx =====
with open(os.path.join(BASE, 'pages', 'CommunityPage.jsx'), 'r') as f:
    cp = f.read()

# 1. CSS + CharRing after last import
last_imp = cp.rfind("\nimport ")
ins_point = cp.find('\n', last_imp + 1)

insert_text = (
    "\n/* Community Page Animations */\n"
    "const PAGE_ANIMS = `\n"
    "@keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }\n"
    "@keyframes pollFill { from{width:0} to{width:var(--target-w)} }\n"
    "@keyframes slideDown { from{opacity:0;transform:translateY(-100%)} to{opacity:1;transform:translateY(0)} }\n"
    "@keyframes bounceDown { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }\n"
    "@keyframes crossfadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }\n"
    "`;\n"
    "const PageAnimCSS = () => <style dangerouslySetInnerHTML={{__html: PAGE_ANIMS}}/>;\n\n"
    "const CharRing = ({ current, max }) => {\n"
    "  const pct = Math.min(current / max, 1);\n"
    "  const r = 10, circ = 2 * Math.PI * r;\n"
    "  const offset = circ - (pct * circ);\n"
    "  const color = current > max ? '#dc2626' : current > max * 0.8 ? '#d97706' : '#6b7280';\n"
    "  return (\n"
    '    <svg width="28" height="28" viewBox="0 0 28 28" className="inline-block align-middle">\n'
    '      <circle cx="14" cy="14" r={r} fill="none" stroke="#e5e7eb" strokeWidth="2.5" opacity="0.3" />\n'
    '      <circle cx="14" cy="14" r={r} fill="none" stroke={color} strokeWidth="2.5"\n'
    "        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap=\"round\"\n"
    '        transform="rotate(-90 14 14)" style={{transition:"stroke-dashoffset 0.3s ease-out, stroke 0.3s"}} />\n'
    '      <text x="14" y="14" textAnchor="middle" dominantBaseline="central"\n'
    '        fill={color} fontSize="7" fontWeight="600" fontFamily="monospace">\n'
    "        {current > max ? '!' : current}\n"
    "      </text>\n"
    "    </svg>\n"
    "  );\n"
    "};\n\n"
)
cp = cp[:ins_point+1] + insert_text + cp[ins_point+1:]

# 2. State vars
cp = cp.replace(
    "  const [polls, setPolls] = useState([]);",
    "  const [polls, setPolls] = useState([]);\n"
    "  const [newCommentBanner, setNewCommentBanner] = useState(null);\n"
    "  const [tabTransition, setTabTransition] = useState(false);"
)

# 3. Socket new comment
cp = cp.replace(
    "      socket.on('comment:new', (payload) => {",
    "      socket.on('comment:new', (payload) => {\n"
    "        setNewCommentBanner(payload.comment?.authorName || 'Someone');\n"
    "        setTimeout(() => setNewCommentBanner(null), 5000);"
)

# 4. Tab fade
cp = cp.replace(
    "onClick={() => setActiveTab('discussions')}",
    "onClick={() => { setTabTransition(true); setTimeout(() => { setActiveTab('discussions'); setTabTransition(false); }, 150); }}"
)
cp = cp.replace(
    "onClick={() => setActiveTab('posts')}",
    "onClick={() => { setTabTransition(true); setTimeout(() => { setActiveTab('posts'); setTabTransition(false); }, 150); }}"
)

# 5. Card hover lift
cp = cp.replace(
    'className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"',
    'className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-[2px]"'
)

# 6. Discussion tab crossfade
cp = cp.replace(
    "{activeTab === 'discussions' && (\n          <section>",
    "{activeTab === 'discussions' && (\n          <section style={{animation: tabTransition ? 'none' : 'crossfadeIn 0.25s ease-out'}}>"
)

# 7. Posts tab crossfade
cp = cp.replace(
    "{activeTab === 'posts' && (\n          <section",
    "{activeTab === 'posts' && (\n          <section style={{animation: tabTransition ? 'none' : 'crossfadeIn 0.25s ease-out'}}"
)

# 8. Add PageAnimCSS + banner to return
cp = cp.replace(
    "  return (\n    <div className=\"min-h-screen",
    "  return (\n    <>\n    <PageAnimCSS />\n"
    "    {newCommentBanner && (\n"
    '      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 px-4 py-2.5 text-sm font-medium shadow-lg flex items-center gap-2" style={{animation:"slideDown 0.3s ease-out"}}>\n'
    "        <span className=\"text-lg\">💬</span> {newCommentBanner} posted a new comment\n"
    '        <button onClick={() => setNewCommentBanner(null)} className="ml-2 text-xs text-gray-400 hover:text-black dark:hover:text-white">✕</button>\n'
    "      </div>\n"
    "    )}\n"
    '    <div className="min-h-screen'
)

# 9. Poll bar animation
cp = cp.replace(
    "style={{ width: `${pct}%` }}",
    "style={{ width: `${pct}%`, animation: `pollFill 1.2s ease-out ${(idx || 0) * 80}ms both` }}"
)

# 10. CharRing for comment box
cp = cp.replace(
    "{charCount}/{CHAR_LIMIT}",
    "<CharRing current={charCount} max={CHAR_LIMIT} /> {charCount}/{CHAR_LIMIT}"
)

# 11. Close fragment
cp = cp.rstrip()
cp = cp.replace(
    "    </div>\n  );\n};\n\nexport default CommunityPage;",
    "    </div>\n    </>\n  );\n};\n\nexport default CommunityPage;"
)

with open(os.path.join(BASE, 'pages', 'CommunityPage.jsx'), 'w') as f:
    f.write(cp)
print(f"CommunityPage: {len(cp)} chars")
print("DONE - all 12 animations applied")
