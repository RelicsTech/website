"""Rebuild the static Tags library from its reviewed public content (stdlib only)."""
import html
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://relicstech.site"
ENTRIES = json.loads((ROOT / "tags/data.json").read_text())
escape = html.escape
CHANNELS = {"1566825645810655393": "PC building help", "1574605845508005989": "Technical support",
            "1574792975895232563": "Peripheral help", "1356781760532320387": "Rate your specialist"}


def inline(text):
    """Format the small Discord Markdown subset in our content, escaping all HTML."""
    tokens = []
    def token(value):
        tokens.append(value)
        return f"\x01{len(tokens)-1}\x02"
    text = re.sub(r"`([^`]+)`", lambda m: token(f"<code>{escape(m[1])}</code>"), text)
    def link(match):
        label, url = match[1], match[2]
        if not url.startswith("https://"):
            return label
        return token(f'<a href="{escape(url, quote=True)}">{escape(label.strip("*"))}</a>')
    text = re.sub(r"\[([^\]]+)\]\(<?(https://[^\s<>]+)>?\)", link, text)
    text = re.sub(r"<#(\d+)>", lambda m: token(
        f'<a href="https://discord.com/channels/1354544808273772626/{m[1]}">#{escape(CHANNELS.get(m[1], "Discord channel"))}</a>'), text)
    text = re.sub(r"<?https://[^\s<>]+>?", lambda m: token(
        '<a href="'+escape(m[0].strip('<>'), quote=True)+'">'+escape(m[0].strip('<>'))+'</a>'), text)
    text = escape(text)
    text = re.sub(r"\*\*\*(.+?)\*\*\*", r"<strong><em>\1</em></strong>", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"__(.+?)__", r"<u>\1</u>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)
    for i, value in enumerate(tokens):
        text = text.replace(f"\x01{i}\x02", value)
    return text


def markdown(text):
    blocks = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if heading := re.match(r"^(#{1,3}) (.*)", line):
            level = min(4, len(heading[1])+1)
            blocks.append(f"<h{level}>{inline(heading[2])}</h{level}>")
        elif line.startswith("-# "):
            blocks.append('<p class="tag-note">'+inline(line[3:])+"</p>")
        else:
            blocks.append("<p>"+inline(line)+"</p>")
    return "\n".join(blocks)


GUIDES = (ROOT/"guides/index.html").read_text()
V = re.search(r"\?v=(\d+)", GUIDES)[1]
HEAD_PRE = GUIDES[GUIDES.index("<head>")+6:GUIDES.index('<meta name="viewport"')]
ROOT_OPEN = re.search(r'<div class="root [^>]*>', GUIDES)[0]
GIND = re.search(r'<div class="gind".*?</svg></div>', GUIDES, re.S)[0]
SIDE = GUIDES[GUIDES.index('<div class="side"'):GUIDES.index('<main')]
SIDE = SIDE.replace('aria-label="Guides"', 'aria-label="Tags"').replace('>GUIDES</span>', '>TAGS</span>')
SIDE = re.sub(r'<div class="jl">.*?</div>', '<div class="jl"><a href="/">Public site</a><a href="/guides/">Guides</a><a href="/tags/" aria-current="page">Tags &amp; questionnaires</a></div>', SIDE, count=1, flags=re.S)
K = 'font-size:15px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--tx2);margin-bottom:16px'
H1 = 'margin:0 0 20px;font-size:clamp(34px,5vw,64px);line-height:1.06;letter-spacing:-.015em;font-weight:var(--hw)'
LEAD = 'margin:0 0 24px;max-width:640px;font-size:var(--b);line-height:1.4;letter-spacing:-.022em;color:var(--tx2)'


def shell(title, description, path, body, current=None):
    url = ORIGIN+path
    full = title if "Relics" in title else title+" | Relics"
    breadcrumbs = [{"@type": "ListItem", "position": 1, "name": "Relics", "item": ORIGIN+"/"},
                   {"@type": "ListItem", "position": 2, "name": "Tags & questionnaires", "item": ORIGIN+"/tags/"}]
    if current:
        breadcrumbs.append({"@type": "ListItem", "position": 3, "name": title, "item": url})
    schema = [{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": breadcrumbs}]
    if current:
        schema.append({"@context":"https://schema.org", "@type":"Article", "headline":title,
                       "description":description, "mainEntityOfPage":url,
                       "image":ORIGIN+"/assets/og/guides.png", "dateModified":"2026-11-24",
                       "publisher":{"@type":"Organization","name":"Relics","url":ORIGIN+"/","logo":{"@type":"ImageObject","url":ORIGIN+"/assets/logo.webp"}},
                       "author":{"@type":"Organization","name":"Relics","url":ORIGIN+"/"}})
    else:
        schema.append({"@context":"https://schema.org", "@type":"CollectionPage", "name":title, "url":url,
                       "mainEntity":{"@type":"ItemList","itemListElement":[{"@type":"ListItem", "position":i+1,"url":ORIGIN+'/tags/'+e['slug']+'/',"name":e['title']} for i,e in enumerate(ENTRIES)]}})
    d = escape(description, quote=True); t = escape(full, quote=True)
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">{HEAD_PRE}<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(full)}</title>
<meta name="description" content="{d}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="color-scheme" content="light dark">
<meta property="og:type" content="{'article' if current else 'website'}"><meta property="og:site_name" content="Relics"><meta property="og:title" content="{t}"><meta property="og:description" content="{d}"><meta property="og:url" content="{url}"><meta property="og:image" content="{ORIGIN}/assets/og/guides.png">
<meta name="twitter:card" content="summary_large_image"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{t}"><meta property="og:locale" content="en_US"><meta name="twitter:title" content="{t}"><meta name="twitter:description" content="{d}"><meta name="twitter:image" content="{ORIGIN}/assets/og/guides.png">
<link rel="icon" href="/assets/logo.webp"><link rel="preload" href="/assets/fonts/HankenGrotesk-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/handbook.css?v={V}"><link rel="stylesheet" href="/assets/tags.css?v={V}">
<script src="/assets/site.js?v={V}" defer></script>
<script type="application/ld+json">{json.dumps(schema).replace('<', chr(92)+'u003c')}</script></head>
<body>
{ROOT_OPEN}
<a class="skip" href="#main">Skip to content</a>
<div class="prog" aria-hidden="true"></div>
{GIND}
{SIDE}<main class="main tags-main" id="main" style="flex:1 1 760px;min-width:0"><div class="sec" style="padding:calc(var(--sec)*.5) var(--px) 0;box-sizing:border-box;max-width:1100px">{body}</div><footer style="margin:32px 0 48px;padding:0 var(--px);font-size:12px;line-height:1.333;color:var(--tx2);display:flex;flex-wrap:wrap;gap:8px 24px"><span>© 2026 Relics · Tags</span><a class="lnk" href="/" style="color:var(--tx2)">Back to relicstech.site</a><a class="lnk" href="/guides/" style="color:var(--tx2)">PC guides</a></footer>
</main>
<div class="tag-toast" role="status" aria-live="polite"></div>
</div>
<script>try{{var s=localStorage.getItem("relics-th"),r=document.querySelector(".root");if(r&&(s==="dark"||s==="light"))r.setAttribute("data-th",s)}}catch(e){{}}</script>
<script src="/assets/tags.js?v={V}" defer></script><script src="/assets/handbook.js?v={V}" defer></script></body>
</html>'''


cards = []
for entry in ENTRIES:
    category, slug, title = entry['category'], entry['slug'], entry['title']
    search = ' '.join([title, entry['name'], category, entry['description'], *[v['content'] for v in entry['variants']]])
    cards.append(f'''<article class="card tag-card" data-category="{escape(category, quote=True)}" data-search="{escape(search, quote=True)}" data-slug="{slug}">
<span class="tag-category">{escape(category)}</span><h2><a href="/tags/{slug}/">{escape(title)}</a></h2><p>{escape(entry['description'])}</p>
<div class="tag-actions"><code>{escape(entry['name'])}</code><a class="btn" href="/tags/{slug}/">Open tag</a><button type="button" class="btn" data-copy="{slug}:0">Copy for Discord</button></div></article>''')
    sections = []
    variants = entry['variants']
    variant_nav = '<nav class="variant-menu" aria-label="Versions">'+''.join(f'<a class="lnk" href="#version-{i}">{escape(v["label"])}</a>' for i,v in enumerate(variants))+'</nav>' if len(variants)>1 else ''
    for i, variant in enumerate(variants):
        image = f'<figure><img src="{variant["image"]}" alt="Hand width and hand length measurement guide" loading="lazy"><figcaption>Measure across your palm and from your wrist to the tip of your middle finger.</figcaption></figure>' if variant.get('image') else ''
        if entry['name']=='keyboard' and image:
            image = f'<figure><img src="{variant["image"]}" alt="Keyboard layout and size reference" loading="lazy"><figcaption>Keyboard reference shared with the questionnaire.</figcaption></figure>'
        sections.append(f'''<section id="version-{i}" class="card tag-content"><div class="tag-actions"><h2>{escape(variant['label'])}</h2>
<button class="btn bp" type="button" data-copy="{slug}:{i}">Copy full text for Discord</button></div>
<div class="tag-markdown">{markdown(variant['content'])}</div>{image}
<details><summary>Discord Markdown &amp; manual copy</summary><textarea class="tag-raw" rows="10" readonly aria-label="{escape(variant['label'], quote=True)} Markdown">{escape(variant['copy'])}</textarea></details></section>''')
    siblings = [e for e in ENTRIES if e['category']==category and e['slug']!=slug]
    related = ''.join(f'<a class="lnk" href="/tags/{e["slug"]}/">{escape(e["title"])}</a>' for e in siblings)
    body = f'''<nav class="tag-breadcrumb" aria-label="Breadcrumb"><a class="lnk" href="/">Relics</a> / <a class="lnk" href="/tags/">Tags</a> / {escape(title)}</nav>
<div id="top" class="kick" style="{K}">{escape(category)} · <code>{escape(entry['name'])}</code></div><h1 style="{H1}">{escape(title)}</h1><p style="{LEAD}">{escape(entry['description'])}</p>
<p class="tag-note">Copy the full text, paste it into your Relics Discord help conversation and add your answers where relevant. Links to Discord channels require server membership.</p>
{variant_nav}{''.join(sections)}<section class="tag-related"><h2>More in {escape(category)}</h2>{related or '<a class="lnk" href="/tags/">Browse the complete library</a>'}</section>
<p style="margin:32px 0 0"><a class="btn bp" href="https://discord.gg/GBMChN9PAj">Get free help on Discord</a></p>'''
    directory = ROOT / 'tags' / slug
    directory.mkdir(exist_ok=True)
    (directory/'index.html').write_text(shell(title, entry['description'], '/tags/'+slug+'/', body, slug))

categories = list(dict.fromkeys(e['category'] for e in ENTRIES))
options = ''.join(f'<option>{escape(category)}</option>' for category in categories)
body = f'''<div id="top" class="kick" style="{K}">Tags</div><h1 style="{H1}">PC help, ready to share.</h1>
<p style="{LEAD}">Discord tags and questionnaires for PC builds, troubleshooting and peripherals. Find the right questions, copy the complete message and get your support conversation started.</p>
<div class="tag-tools"><label for="tag-search">Search every tag<input id="tag-search" type="search" placeholder="Try RAM, budget, mouse or DDU" autocomplete="off"></label>
<label for="tag-category">Category<select id="tag-category"><option value="">All categories</option>{options}</select></label>
<button class="btn" type="button" id="clear-tags">Clear filters</button><button class="btn bp" type="button" id="copy-all-tags">Copy all results for Discord</button></div>
<p class="tag-note">Every tag has its own page. Copy buttons keep the Discord Markdown. “Copy all results” includes the main version of every matching tag. The bot's questionnaires are also available in Discord through <code>/getstarted</code>. Looking for step-by-step fixes? See the <a class="lnk" href="/guides/">PC guides</a>.</p>
<p id="tag-count" class="tag-note" role="status">{len(ENTRIES)} tags</p><p id="tag-empty" class="tag-note" hidden>No tags match. Try another term or clear the filters.</p>
<div class="tag-grid">{''.join(cards)}</div>'''
(ROOT/'tags/index.html').write_text(shell('Discord Tags & PC Help Questionnaires', 'Search Relics Discord tags and PC help questionnaires by category. Copy complete messages for PC builds, troubleshooting, peripherals and Windows support.', '/tags/', body))

ns = 'http://www.sitemaps.org/schemas/sitemap/0.9'
ET.register_namespace('', ns)
tree = ET.parse(ROOT/'sitemap.xml')
for url in list(tree.getroot()):
    loc = url.find('{'+ns+'}loc')
    if loc is not None and loc.text.startswith(ORIGIN+'/tags/'):
        tree.getroot().remove(url)
for path in ['/tags/']+['/tags/'+e['slug']+'/' for e in ENTRIES]:
    url = ET.SubElement(tree.getroot(), '{'+ns+'}url')
    ET.SubElement(url, '{'+ns+'}loc').text = ORIGIN+path
    ET.SubElement(url, '{'+ns+'}lastmod').text = '2026-11-24'
ET.indent(tree, space='  ')
tree.write(ROOT/'sitemap.xml', encoding='utf-8', xml_declaration=True)
print(f'Built library and {len(ENTRIES)} tag pages; sitemap updated.')
