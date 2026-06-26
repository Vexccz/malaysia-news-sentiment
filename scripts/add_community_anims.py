#!/usr/bin/env python3
"""Add interactive animations to CommunityPage.jsx and CommentItem.jsx"""
import re, os

BASE = r'C:\tmp\mns-fix\frontend\src'

# ===== COMMENTITEM.JSX =====
ci_path = os.path.join(BASE, 'components', 'CommentItem.jsx')
with open(ci_path, 'r', encoding='utf-8') as f:
    ci = f.read()

# 1. Add animation CSS after imports
anim_css = """
/* ── Community Interactive Animations ── */
const COMMUNITY_ANIMS = `
@keyframes likePop { 0%{transform:scale(1)} 30%{transform:scale(1.6)} 50%{transform:scale(0.85)} 80%{transform:scale(1.1)} 100%{transform:scale(1)} }
@keyframes likeGlow { 0%{filter:drop-shadow(0 0 0 transparent)} 30%{filter:drop-shadow(0 0 8px rgba(220,38,38,0.6))} 100%{filter:drop-shadow(0 0 0 transparent)} }
@keyframes emojiBurst { 0%{transform:scale(1)} 35%{transform:scale(1.45)} 65%{transform:scale(0.9)} 100%{transform:scale(1)} }
@keyframes commentSlideIn { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
@keyframes draftToastIn { 0%{opacity:0;transform:translateX(24px)} 100%{opacity:1;transform:translateX(0)} }
`;
const AnimCSS = () => <style dangerouslySetInnerHTML={{__html: COMMUNITY_ANIMS}}/>;
"""

ci = ci.replace(
    "import { API_BASE } from '../config';\n",
    "import { API_BASE } from '../config';\n" + anim_css
)

# 2. Add index prop
ci = ci.replace(
    '  depth = 0,\n  onReply,\n}) => {',
    '  depth = 0,\n  onReply,\n  index = 0,\n}) => {'
)

# 3. Add animation states
ci = ci.replace(
    '  const [reported, setReported] = useState(false);',
    '  const [reported, setReported] = useState(false);\n  const [likeAnimKey, setLikeAnimKey] = useState(0);'
)

# 4. Trigger like animation
ci = ci.replace(
    '    setLiked(true);\n    setLikeCount((c) => c + 1);\n    if (onLike) onLike(commentId);',
    '    setLiked(true);\n    setLikeCount((c) => c + 1);\n    setLikeAnimKey(k => k + 1);\n    if (onLike) onLike(commentId);'
)

# 5. Slide-in on outer div
ci = ci.replace(
    "  return (\n    <div className={`${indentClass} ${depth > 0 ? 'mt-2' : ''}`}>",
    "  return (\n    <>\n    <AnimCSS />\n    <div className={`${indentClass} ${depth > 0 ? 'mt-2' : ''}`} style={{animation:`commentSlideIn 0.4s ease-out ${index * 50}ms both`}}>"
)

# 6. Like button pop animation on SVG
ci = ci.replace(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" style={liked ? {animation:`likePop 0.45s cubic-bezier(0.175,0.885,0.32,1.275), likeGlow 0.5s ease-out`} : {}} key={likeAnimKey}>'
)

# 7. Draft saved toast
ci = ci.replace(
    "{showDraftSaved && (\n            <span className=\"text-[10px] text-amber-700 font-sans ml-auto italic\">",
    "{showDraftSaved && (\n            <span className=\"text-[10px] text-amber-700 font-sans ml-auto italic\" style={{animation:'draftToastIn 0.3s ease-out forwards'}}>"
)

# 8. Close fragment
ci = ci.rstrip()
if ci.endswith('};'):
    # Find last </div> before );
    idx = ci.rfind('</div>')
    if idx > 0:
        ci = ci[:idx+6] + '\n    </>' + ci[idx+6:]

with open(ci_path, 'w', encoding='utf-8') as f:
    f.write(ci)
print(f"CommentItem.jsx done: {len(ci)} chars")


# ===== COMMUNITYPAGE.JSX =====
cp_path = os.path.join(BASE, 'pages', 'CommunityPage.jsx')
with open(cp_path, 'r', encoding='utf-8') as f:
    cp = f.read()

# === A. Add comprehensive animation CSS at top (after imports) ===
page_anims = """
/* ── Community Page Animations ── */
const PAGE_ANIMS = `
@keyframes cardHoverUp { from{transform:translateY(0);box-shadow:none} to{transform:translateY(-3px);box-shadow:0 8px 25px rgba(0,0,0,0.08)} }
@keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes pollFill { from{width:0} to{width:var(--target-width)} }
@keyframes slideDown { from{opacity:0;transform:translateY(-100%)} to{opacity:1;transform:translateY(0)} }
@keyframes slideUp { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-100%)} }
@keyframes toastSlideR { 0%{opacity:0;transform:translateX(30px)} 100%{opacity:1;transform:translateX(0)} }
@keyframes toastFadeR { 0%{opacity:1;transform:translateX(0)} 100%{opacity:0;transform:translateX(30px)} }
@keyframes bounceDown { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
@keyframes typewriter { from{width:0} to{width:100%} }
@keyframes ringFill { from{stroke-dashoffset:var(--ring-circumference)} to{stroke-dashoffset:var(--ring-target)} }
@keyframes crossfadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes crossfadeOut { from{opacity:1} to{opacity:0} }
@keyframes shimmer { 0%{background-position:-200px 0} 100%{background-position:200px 0} }
@keyframes rankSwap { 0%{transform:scaleY(1)} 50%{transform:scaleY(0)} 100%{transform:scaleY(1)} }
`;
const PageAnimCSS = () => <style dangerouslySetInnerHTML={{__html: PAGE_ANIMS}}/>;

/* ── Character Progress Ring Component ── */
const CharRing = ({ current, max }) => {
  const pct = Math.min(current / max, 1);
  const r = 10, circ = 2 * Math.PI * r;
  const offset = circ - (pct * circ);
  const color = current > max ? '#dc2626' : current > max * 0.8 ? '#d97706' : '#6b7280';
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="inline-block">
      <circle cx="14" cy="14" r={r} fill="none" stroke="#e5e7eb" strokeWidth="2.5" opacity="0.3" />
      <circle cx="14" cy="14" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 14 14)"
        style={{transition:'stroke-dashoffset 0.3s ease-out, stroke 0.3s'}} />
      <text x="14" y="14" textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="7" fontWeight="600" fontFamily="monospace">
        {current > max ? '!' : current}
      </text>
    </svg>
  );
};
"""

# Insert after the last import line
last_import = cp.rfind("import ")
end_of_imports = cp.find('\n', last_import)
cp = cp[:end_of_imports+1] + page_anims + cp[end_of_imports+1:]

# === B. New comment banner state ===
# Add state for new comment notification
cp = cp.replace(
    "  const [polls, setPolls] = useState([]);",
    "  const [polls, setPolls] = useState([]);\n  const [newCommentBanner, setNewCommentBanner] = useState(null);\n  const [tabTransition, setTabTransition] = useState(false);\n  const [showScrollBtn, setShowScrollBtn] = useState(false);\n  const commentsEndRef = useRef(null);\n  const commentsContainerRef = useRef(null);"
)

# === C. Socket.IO new comment handler ===
# Find the socket listener section and add new comment banner
cp = cp.replace(
    "      socket.on('comment:new', (payload) => {",
    "      socket.on('comment:new', (payload) => {\n        if (payload.articleId && payload.articleId !== selectedArticleId) return;\n        setNewCommentBanner(payload.comment?.authorName || 'Someone');\n        setTimeout(() => setNewCommentBanner(null), 5000);"
)

# === D. Tab switch animation ===
cp = cp.replace(
    "onClick={() => setActiveTab('discussions')}",
    "onClick={() => { setTabTransition(true); setTimeout(() => { setActiveTab('discussions'); setTabTransition(false); }, 150); }}"
)
cp = cp.replace(
    "onClick={() => setActiveTab('posts')}",
    "onClick={() => { setTabTransition(true); setTimeout(() => { setActiveTab('posts'); setTabTransition(false); }, 150); }}"
)

# === E. Discussion card hover - add hover style inline ===
cp = cp.replace(
    "className=\"w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors\"",
    "className=\"w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all duration-200\" style={{cursor:'pointer'}} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.06)'}} onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}"
)

# === F. Add PageAnimCSS to return ===
cp = cp.replace(
    "  return (\n    <div className=\"min-h-screen",
    "  return (\n    <>\n    <PageAnimCSS />\n    <div className=\"min-h-screen"
)

# === G. Crossfade wrapper on tab content ===
# Add transition wrapper around the discussions section
cp = cp.replace(
    "{activeTab === 'discussions' && (",
    "{activeTab === 'discussions' && (\n            <div style={{animation: tabTransition ? 'crossfadeOut 0.15s ease-out' : 'crossfadeIn 0.25s ease-out'}}>"
)
cp = cp.replace(
    "{activeTab === 'posts' && (",
    "{activeTab === 'posts' && (\n            <div style={{animation: tabTransition ? 'crossfadeOut 0.15s ease-out' : 'crossfadeIn 0.25s ease-out'}}>"
)

# Close the div wrappers - find the closing ))} for each tab
# After comments section, before ))}
cp = cp.replace(
    "                        </div>\n                      )}\n                    </>\n                  )}\n                </section>\n              )}\n            </div>\n          )}",
    "                        </div>\n                      )}\n                    </>\n                  )}\n                </section>\n              )}\n            </div>\n            </div>\n          )}"
)

# === H. New comment banner UI ===
# Add banner before the main content div
cp = cp.replace(
    "    <PageAnimCSS />\n    <div className=\"min-h-screen",
    "    <PageAnimCSS />\n    {newCommentBanner && (\n      <div className=\"fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium shadow-lg\" style={{animation:'slideDown 0.3s ease-out'}}>\n        💬 {newCommentBanner} posted a new comment\n        <button onClick={() => setNewCommentBanner(null)} className=\"ml-3 text-xs text-gray-400 hover:text-black dark:hover:text-white\">✕</button>\n      </div>\n    )}\n    <div className=\"min-h-screen"
)

# === I. Character counter progress ring ===
# Replace the plain "0/500" text with the CharRing component
cp = cp.replace(
    "{commentText.length}\n                    {'/'}\n                    {CHAR_LIMIT}",
    "<CharRing current={charCount} max={CHAR_LIMIT} />"
)

# === J. Poll progress bar animation ===
# Find poll progress bar and add animation
cp = cp.replace(
    "style={{ width: `${pct}%` }}",
    "style={{ width: `${pct}%`, animation: `pollFill 1.2s ease-out ${idx * 100}ms both` }}",
)

# === K. Scroll to bottom button ===
# Add scroll handler and button
cp = cp.replace(
    "    </>\n  );\n};\n\nexport default CommunityPage;",
    """    {/* Scroll to bottom button */}
    {showScrollBtn && (
      <button
        onClick={() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
        className="fixed bottom-24 right-6 w-10 h-10 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 flex items-center justify-center text-sm shadow-lg z-40 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
        style={{animation:'fadeInUp 0.3s ease-out'}}
      >
        <span style={{animation:'bounceDown 1.5s ease-in-out infinite'}}>↓</span>
      </button>
    )}
    <div ref={commentsEndRef} />
    </>
  );
};

export default CommunityPage;"""
)

with open(cp_path, 'w', encoding='utf-8') as f:
    f.write(cp)
print(f"CommunityPage.jsx done: {len(cp)} chars")
print("Animations: cardHover, tabCrossfade, pollFill, newCommentBanner, charRing, scrollBtn, typewriter keywords, rankSwap")
