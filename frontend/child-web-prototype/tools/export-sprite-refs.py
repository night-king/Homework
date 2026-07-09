import re, pathlib, sys, tempfile
from playwright.sync_api import sync_playwright

PROTO = pathlib.Path(__file__).resolve().parent.parent / "child-homepage.html"
OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "pets" / "ref"
OUT.mkdir(parents=True, exist_ok=True)
species = sys.argv[1] if len(sys.argv) > 1 else "dragon"
html = PROTO.read_text(encoding="utf-8")

def square_viewbox(vb):  # "-12 -8 130 148" -> 居中补成正方形
    x, y, w, h = [float(n) for n in vb.split()]
    s = max(w, h)
    return f"{x - (s-w)/2} {y - (s-h)/2} {s} {s}"

# Extract all SVG defs and symbols for the species
# Find the outer SVG element that holds defs + symbols
svg_match = re.search(r'(<svg\b[^>]*>.*?</svg>)', html, re.DOTALL | re.IGNORECASE)
if not svg_match:
    print("ERROR: no SVG found in HTML"); sys.exit(1)
outer_svg = svg_match.group(1)

with sync_playwright() as p:
    b = p.chromium.launch()
    for n in range(1, 6):
        sid = f"sp-{species}-{n}"
        m = re.search(rf'<symbol id="{sid}" viewBox="([^"]+)"', html)
        if not m:
            print("MISSING symbol", sid); sys.exit(1)
        vb = square_viewbox(m.group(1))

        # Build a minimal standalone HTML with transparent background
        # Include the full outer SVG (with defs + all symbols) but hidden,
        # then render target symbol in a visible SVG
        mini_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
html, body {{
  margin: 0; padding: 0;
  width: 1024px; height: 1024px;
  background: transparent !important;
  overflow: hidden;
}}
#hidden-defs {{
  position: absolute; width: 0; height: 0; overflow: hidden;
}}
#render {{
  position: absolute; left: 0; top: 0;
  width: 1024px; height: 1024px;
  background: transparent;
}}
</style>
</head>
<body>
<div id="hidden-defs">
{outer_svg}
</div>
<svg id="render" width="1024" height="1024" viewBox="{vb}" xmlns="http://www.w3.org/2000/svg">
  <use href="#{sid}"/>
</svg>
</body>
</html>"""

        # Write to temp file
        tmp = pathlib.Path(tempfile.gettempdir()) / f"_ref_{sid}.html"
        tmp.write_text(mini_html, encoding="utf-8")

        pg = b.new_page(viewport={"width": 1024, "height": 1024})

        # Set transparent background via CDP before navigation
        cdp = pg.context.new_cdp_session(pg)
        cdp.send("Emulation.setDefaultBackgroundColorOverride",
                 {"color": {"r": 0, "g": 0, "b": 0, "a": 0}})

        pg.goto(tmp.as_uri())
        pg.wait_for_timeout(200)

        out_path = str(OUT / f"ref-{species}-{n}.png")
        pg.screenshot(path=out_path, omit_background=True)
        print("wrote", f"ref-{species}-{n}.png", "viewBox", vb)
        pg.close()
        tmp.unlink(missing_ok=True)

    b.close()
print("DONE 5 refs")
