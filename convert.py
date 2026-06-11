import re

def convert():
    with open('landing.html', 'r', encoding='utf-8') as f:
        text = f.read()

    css_match = re.search(r'<style>([\s\S]*?)<\/style>', text)
    if css_match:
        with open('src/app/globals.css', 'w', encoding='utf-8') as f:
            f.write(css_match.group(1))

    js_match = re.search(r'<script>([\s\S]*?)<\/script>', text)
    js = js_match.group(1) if js_match else ''

    body_match = re.search(r'<body>([\s\S]*?)<\/body>', text)
    if body_match:
        body = body_match.group(1)
        body = re.sub(r'<script>[\s\S]*?<\/script>', '', body)
        
        body = body.replace('class="', 'className="')
        body = body.replace('for="', 'htmlFor="')
        
        def repl_style(m):
            s = m.group(1)
            parts = s.split(';')
            styles = []
            for p in parts:
                if ':' not in p: continue
                k, v = p.split(':', 1)
                k = k.strip()
                v = v.strip()
                k = re.sub(r'-([a-z])', lambda x: x.group(1).upper(), k)
                styles.append(f"{k}: '{v}'")
            return "style={{" + ', '.join(styles) + "}}"

        body = re.sub(r'style="([^"]*)"', repl_style, body)

        def close_tags(m):
            if m.group(0).endswith('/>'): return m.group(0)
            return m.group(0)[:-1] + '/>'

        body = re.sub(r'<(img|input|br|hr|circle|path|rect)\b([^>]*?)(?<!\/)>', close_tags, body)

        svg_attrs = ['stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin']
        for a in svg_attrs:
            camel = re.sub(r'-([a-z])', lambda x: x.group(1).upper(), a)
            body = body.replace(f'{a}="', f'{camel}="')

        # Fix comments
        body = re.sub(r'<!--(.*?)-->', r'{/* \1 */}', body)

        page_tsx = f"""'use client';

import {{ useEffect }} from 'react';

export default function Home() {{
  useEffect(() => {{
    {js}
  }}, []);

  return (
    <main>
{body}
    </main>
  );
}}
"""
        with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
            f.write(page_tsx)

if __name__ == '__main__':
    convert()
