#!/usr/bin/env python3
"""Add interactive animations - v2 with correct patterns"""
import os

BASE = os.path.join('C:', os.sep, 'tmp', 'mns-fix', 'frontend', 'src')

# ===== CommentItem.jsx =====
p = os.path.join(BASE, 'components', 'CommentItem.jsx')
with open(p, 'r') as f:
    ci = f.read()

# CSS after imports
old = "import { API_BASE } from '../config';\n"
new = old + (
    "/* Comment Animations */\n"
    "const COMMENT_ANIMS = `@keyframes likePop{0%{transform:scale(1)}30%{transform:scale(1.6)}50%{transform:scale(0.85)}80%{transform:scale(1.1)}100%{transform:scale(1)}}"
    "@keyframes likeGlow{0%{filter:drop-shadow(0 0 0 transparent)}30%{filter:drop-shadow(0 0 8px rgba(220,38,38,0.6))}100%{filter:drop-shadow(0 0 0 transparent)}}"
    "@keyframes commentSlideIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}"
    "@keyframes draftToastIn{0%{opacity:0;transform:translateX(24px)}100%{opacity:1;transform:translateX(0)}}`;\n"
    "const CommentAnimCSS = () => <style dangerouslySetInnerHTML={{__html: COMMENT_ANIMS}}/>;\n\n"
)
ci = ci.replace(old, new)

# index prop
ci = ci.replace("  depth = 0,\n  onReply,\n}) => {", "  depth = 0,\n  onReply,\n  index = 0,\n}) => {")

# likeAnimKey state
ci = ci.replace(
    "  const [reported, setReported] = useState(false);",
    "  const [reported, setReported] = useState(false);\n  const [likeAnimKey, setLikeAnimKey] = useState(0);"
)

# trigger animation
ci = ci.replace(
    "    setLiked(true);\n    setLikeCount((c) => c + 1);\n    if (onLike) onLike(commentId);",
    "    setLiked(true);\n    setLikeCount((c) => c + 1);\n    setLikeAnimKey(k => k + 1);\n    if (onLike) onLike(commentId);"
)

# SVG pop
ci = ci.replace(
    'className="w-4 h-4">',
    'className="w-4 h-4" style={liked ? {animation:"likePop 0.45s cubic-bezier(0.175,0.885,0.32,1.275), likeGlow 0.5s ease-out"} : {}} key={likeAnimKey}>'
)

# slide-in
ci = ci.replace(
    "  return (\n    <div className={`",
    "  return (\n    <>\n    <CommentAnimCSS />\n    <div className={`"
)
# add animation style to the div
ci = ci.replace(
    "${depth > 0 ? 'mt-2' : ''}`}>",
    "${depth > 0 ? 'mt-2' : ''}`} style={{animation:`commentSlideIn 0.4s ease-out ${index * 50}ms both`}}>"
)

# draft toast
ci = ci.replace(
    '{showDraftSaved && (\n            <span className="text-[10px] text-amber-700 font-sans ml-auto italic">',
    '{showDraftSaved && (\n            <span className="text-[10px] text-amber-700 font-sans ml-auto italic" style={{animation:"draftToastIn 0.3s ease-out"}}>'
)

# close fragment - find last </div> before );
lines = ci.split('\n')
for i in range(len(lines)-1, -1, -1):
    if lines[i].rstrip() == '</div>' and i+1 < len(lines) and lines[i+1].rstrip() == ');':
        lines.insert(i+1, '    </>')
        break
ci = '\n'.join(lines)

with open(p, 'w') as f:
    f.write(ci)
print(f"CommentItem: {len(ci)} chars")


# ===== CommunityPage.jsx =====
p = os.path.join(BASE, 'pages', 'CommunityPage.jsx')
with open(p, 'r') as f:
    cp = f.read()

# CSS after last import
last_imp = cp.rfind("\nimport ")
ins = cp.find('\n', last_imp + 1)
page_anims = (
    "\n/* Community Page Animations */\n"
    "const PAGE_ANIMS = `@keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}"
    "@keyframes pollFill{from{width:0}to{width:var(--target-w)}}"
    "@keyframes slideDown{from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}"
    "@keyframes bounceDown{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}"
    "@keyframes crossfadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;\n"
    "const PageAnimCSS = () => <style dangerouslySetInnerHTML={{__html: PAGE_ANIMS}}/>;\n\n"
)
cp = cp[:ins+1] + page_anims + cp[ins+1:]

# state vars
cp = cp.replace(
    "  const [polls, setPolls] = useState([]);",
    "  const [polls, setPolls] = useState([]);\n  const [newCommentBanner, setNewCommentBanner] = useState(null);\n  const [tabTransition, setTabTransition] = useState(false);"
)

# socket handler
cp = cp.replace(
    "    socket.on('comment:new', handleNewComment);",
    "    socket.on('comment:new', handleNewComment);\n    const origHandler = handleNewComment;\n    // Banner on new comment\n    socket.on('comment:new', (data) => { if (data.comment?.authorName) { setNewCommentBanner(data.comment.authorName); setTimeout(() => setNewCommentBanner(null), 5000); } });"
)

# tab fade
cp = cp.replace(
    "onClick={() => setActiveTab('discussions')}",
    "onClick={() => { setTabTransition(true); setTimeout(() => { setActiveTab('discussions'); setTabTransition(false); }, 150); }}"
)
cp = cp.replace(
    "onClick={() => setActiveTab('posts')}",
    "onClick={() => { setTabTransition(true); setTimeout(() => { setActiveTab('posts'); setTabTransition(false); }, 150); }}"
)

# card hover
cp = cp.replace(
    'className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"',
    'className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-[2px]"'
)

# crossfade on tabs
cp = cp.replace(
    "{activeTab === 'discussions' && (\n            <div className=\"space-y-4\">",
    "{activeTab === 'discussions' && (\n            <div className=\"space-y-4\" style={{animation: tabTransition ? 'none' : 'crossfadeIn 0.25s ease-out'}}>"
)
cp = cp.replace(
    "{activeTab === 'posts' && (\n            <div className=\"space-y-3\">",
    "{activeTab === 'posts' && (\n            <div className=\"space-y-3\" style={{animation: tabTransition ? 'none' : 'crossfadeIn 0.25s ease-out'}}>"
)

# poll bar animation
cp = cp.replace(
    "style={{ width: `${pct}%` }}",
    "style={{ width: `${pct}%`, animation: `pollFill 1.2s ease-out ${(idx || 0) * 80}ms both` }}"
)

# banner + PageAnimCSS in return
cp = cp.replace(
    "  return (\n    <div className=\"max-w-5xl mx-auto\">",
    "  return (\n    <>\n    <PageAnimCSS />\n"
    "    {newCommentBanner && (\n"
    '      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 px-4 py-2.5 text-sm font-medium shadow-lg flex items-center gap-2" style={{animation:"slideDown 0.3s ease-out"}}>\n'
    '        💬 {newCommentBanner} posted a new comment\n'
    '        <button onClick={() => setNewCommentBanner(null)} className="ml-2 text-xs text-gray-400 hover:text-black dark:hover:text-white">✕</button>\n'
    "      </div>\n"
    "    )}\n"
    '    <div className="max-w-5xl mx-auto">'
)

# close fragment
cp = cp.replace(
    "    </div>\n  );\n};\n\nexport default CommunityPage;",
    "    </div>\n    </>\n  );\n};\n\nexport default CommunityPage;"
)

with open(p, 'w') as f:
    f.write(cp)
print(f"CommunityPage: {len(cp)} chars")
print("DONE")
