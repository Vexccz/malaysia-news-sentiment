#!/usr/bin/env python3
"""Add animations to LiveFeed only (others done, this one had duplicate)"""
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

def add_fragment_wrapper(text):
    lines = text.split('\n')
    export_idx = -1
    for i in range(len(lines)-1, -1, -1):
        if lines[i].strip().startswith('export default'):
            export_idx = i
            break
    if export_idx < 0:
        return text
    return_idx = -1
    for i in range(export_idx-1, -1, -1):
        stripped = lines[i].strip()
        if stripped == 'return (' or stripped.startswith('return ('):
            return_idx = i
            break
    if return_idx < 0:
        return text
    lines.insert(return_idx + 1, '    <><AnimCSS />')
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
    lines.insert(close_idx, '    </>')
    return '\n'.join(lines)

ANIM_CSS = """/* Page Interactive Animations */
const PAGE_ANIMS = `
@keyframes slideInTop { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
@keyframes sentimentFlash { 0%{filter:brightness(1)} 50%{filter:brightness(1.6)} 100%{filter:brightness(1)} }
`;
const AnimCSS = () => <style dangerouslySetInnerHTML={{__html: PAGE_ANIMS}}/>;
"""

c = read_file('LiveFeed.jsx')
c = insert_after_imports(c, ANIM_CSS)
# DON'T add newIds - already exists in committed code
c = add_fragment_wrapper(c)
write_file('LiveFeed.jsx', c)
print("DONE")
