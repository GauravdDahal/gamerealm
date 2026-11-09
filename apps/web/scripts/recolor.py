import re,sys,colorsys,glob
M={ # explicit map: old hex (lower) -> token
 'd8c47b':'accent','e2ce86':'accent2','f4e5a5':'accent2','ead58f':'accent2','faf4bb':'accent2','f0df9b':'accent2','c4a95d':'accent','a88a43':'accent-dim','b18f45':'accent-dim','a98a42':'accent-dim','e4c985':'accent2',
 'f8f4e8':'ink','f6f0dc':'ink','f5f0df':'ink','f8f3e5':'ink','f5e9bd':'ink','f6efd9':'ink','d8cba6':'muted','d8d2bf':'ink',
 'aaa895':'muted','a9a594':'muted','c3bdab':'muted','c0b99f':'muted','999684':'dim','8a8670':'dim','777565':'dim','77735f':'dim','666351':'dim','81774f':'dim','bdbb9a':'accent2',
 '1b190f':'accent-ink','14150f':'night','211d12':'accent-ink','11120f':'night','10110e':'night','0c0d0a':'night','151610':'night',
 'c0392b':'danger','c5214d':'danger','f0a79d':'danger-soft','8a2727':'danger','772f2a':'danger',
 '25261d':'surface2','1c1d16':'surface','29291f':'surface2','171812':'surface','484638':'line','2b3133':'surface2','322c3c':'surface2','605c66':'line',
 '151c28':'surface','100f2b':'surface','2a1650':'surface2','160b2b':'night','0d012e':'night',
 '4f46e5':'secondary','7c3aed':'secondary2','db2777':'hot','060665':'secondary','c0cb1b':'accent2',
 'd5d3ae':'accent2','a09a63':'accent','534c28':'accent-dim',
}
def lum(r,g,b): return (0.2126*r+0.7152*g+0.0722*b)/255
def tok(h):
    h=h.lower()
    if len(h)==3: h=''.join(c*2 for c in h)
    if h in M: return M[h],True
    r,g,b=[int(h[i:i+2],16) for i in (0,2,4)]
    hh,l,s=colorsys.rgb_to_hls(r/255,g/255,b/255)
    L=lum(r,g,b)
    if s>.3 and 0.08<hh<0.2: return ('accent2' if L>.7 else 'accent' if L>.4 else 'accent-dim'),False
    if L<.05: return 'night',False
    if L<.09: return 'surface',False
    if L<.18: return 'surface2',False
    if L<.3: return 'line',False
    if L<.55: return 'dim',False
    if L<.8: return 'muted',False
    return 'ink',False
unmapped=set()
def css(m):
    h=m.group(1)
    if len(h) in (4,8): return m.group(0)       # shadows like #0009 stay
    t,ok=tok(h)
    if not ok: unmapped.add((h,t))
    return f'rgb(var(--c-{t}))'
def csst(m): # rgba(r,g,b,a)
    r,g,b=int(m.group(1)),int(m.group(2)),int(m.group(3)); a=m.group(4)
    h='%02x%02x%02x'%(r,g,b)
    if (r,g,b)==(0,0,0) or (r,g,b)==(255,255,255): return m.group(0)
    t,ok=tok(h)
    if not ok: unmapped.add((h,t))
    return f'rgb(var(--c-{t}) / {a})'
def jsx(m):
    pre,h,op=m.group(1),m.group(2),m.group(3) or ''
    t,ok=tok(h)
    if not ok: unmapped.add((h,t))
    return f'{pre}{t}{op}'
for f in sys.argv[1:]:
    s=open(f).read()
    if f.endswith('.css'):
        s=re.sub(r'#([0-9a-fA-F]{3,8})\b',css,s)
        s=re.sub(r'rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)',csst,s)
        s=re.sub(r'rgb\(17, 24, 39\)','rgb(var(--c-night))',s)
    else:
        s=re.sub(r'(-)\[#([0-9a-fA-F]{3,8})\](/[0-9]+)?',jsx,s)
    open(f,'w').write(s)
print('unmapped (nearest-guess):',sorted(unmapped))
