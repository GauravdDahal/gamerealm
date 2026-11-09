import re,sys
sys.argv=[sys.argv[0]]
exec(open('scripts/recolor.py').read().split('unmapped=set()')[0])
unm=set()
def T(h):
    t,ok=tok(h)
    if not ok: unm.add((h,t))
    return t
def conv(line):
    # SVG presentation attrs -> style (var() does not work in attributes)
    def attr(m):
        return "style={{ %s: 'rgb(var(--c-%s))' }}"%(m.group(1),T(m.group(2)))
    line=re.sub(r'\b(stopColor|fill|stroke)="#([0-9a-fA-F]{6})"',attr,line)
    line=re.sub(r"fill=\{i % 2 \? '#fff6cf' : '#7a6529'\}","style={{ fill: i % 2 ? 'rgb(var(--c-ink))' : 'rgb(var(--c-accent-dim))' }}",line)
    line=re.sub(r'#([0-9a-fA-F]{6})\b',lambda m:'rgb(var(--c-%s))'%T(m.group(1)),line)
    line=re.sub(r'rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)',lambda m:(m.group(0) if (m.group(1),m.group(2),m.group(3)) in (('0','0','0'),('255','255','255')) else 'rgb(var(--c-%s) / %s)'%(T('%02x%02x%02x'%tuple(map(int,m.groups()[:3]))),m.group(4))),line)
    return line
base='src/components/'
for f in ['landingPage/ChatPopup.jsx','InstallApp.jsx','chat/MessageMedia.jsx','landingPage/SpinWheel.jsx','landingPage/Testomonials.jsx']:
    L=open(base+f).read().split('\n'); out=[]
    for i,l in enumerate(L):
        if f.endswith('SpinWheel.jsx') and 12<=i<=20 : out.append(l); continue
        out.append(conv(l))
    open(base+f,'w').write('\n'.join(out))
s=open(base+'common/LoadingSpinner.jsx').read().replace('"#5761e3"','"rgb(var(--c-accent))"')
open(base+'common/LoadingSpinner.jsx','w').write(s)
print(sorted(unm))
