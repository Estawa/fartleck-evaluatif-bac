"""Fabrique un guide d'utilisation PDF à partir d'un fichier Markdown.

    python generer_guide.py guide.md sortie.pdf [dossier des images]

En-tête du Markdown (facultatif), entre deux lignes « --- » :
    titre: Nom de l'appli
    sous_titre: Guide d'utilisation
    version: 1.2.0
    date: 30 octobre 2026

Mise en page pensée pour l'impression en noir et blanc : aucune couleur,
images en niveaux de gris, et aucun paragraphe, élément de liste, encadré
ou ligne de tableau coupé entre deux pages.
"""

import base64
import io
import re
import sys
from pathlib import Path

import markdown
from playwright.sync_api import sync_playwright

CSS = """
@page { size: A4; margin: 18mm 17mm 20mm 17mm; }
* { color: #000 !important; background: transparent; box-sizing: border-box; }
html { font-family: "DejaVu Serif", Georgia, serif; font-size: 10.5pt; line-height: 1.45; }
body { margin: 0; }
h1, h2, h3, h4 { font-family: "DejaVu Sans", Arial, sans-serif; line-height: 1.2; break-after: avoid; page-break-after: avoid; }
h1 { font-size: 20pt; margin: 0 0 6mm; border-bottom: 1.5pt solid #000; padding-bottom: 2mm; break-before: page; }
h2 { font-size: 14pt; margin: 7mm 0 2.5mm; }
h3 { font-size: 11.5pt; margin: 5mm 0 2mm; }
p, li, blockquote, pre, figure, .encadre, dl, dd, dt { break-inside: avoid; page-break-inside: avoid; }
p { margin: 0 0 2.6mm; orphans: 3; widows: 3; }
ul, ol { margin: 0 0 3mm; padding-left: 7mm; }
li { margin-bottom: 1.2mm; }
table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 9.5pt; }
thead { display: table-header-group; }
tr, td, th { break-inside: avoid; page-break-inside: avoid; }
th, td { border: 0.6pt solid #000; padding: 1.6mm 2mm; text-align: left; vertical-align: top; }
th { font-family: "DejaVu Sans", Arial, sans-serif; font-weight: bold; }
blockquote { margin: 3mm 0; padding: 2.5mm 4mm; border: 1pt solid #000; border-left-width: 3pt; }
blockquote p:last-child { margin-bottom: 0; }
code { font-family: "DejaVu Sans Mono", monospace; font-size: 9pt; }
pre { border: 0.6pt solid #000; padding: 2.5mm; white-space: pre-wrap; font-size: 8.8pt; }
img { max-width: 100%; max-height: 120mm; display: block; margin: 2mm auto 1mm; border: 0.6pt solid #000; }
p:has(> img) { text-align: center; }
p:has(> em:only-child) { text-align: center; font-size: 9pt; margin-top: 0; }
em.legende, p.legende { display: block; text-align: center; font-size: 9pt; font-style: italic; margin-top: 0; }
strong { font-weight: bold; }
a { text-decoration: none; }
.couverture { height: 245mm; display: flex; flex-direction: column; justify-content: center; text-align: center; }
.couverture .titre { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 30pt; font-weight: bold; margin-bottom: 6mm; }
.couverture .sous-titre { font-size: 15pt; margin-bottom: 18mm; }
.couverture .version { font-size: 11pt; }
.couverture .trait { width: 60mm; border-top: 1.5pt solid #000; margin: 0 auto 10mm; }
nav.sommaire { break-before: page; }
nav.sommaire h1 { break-before: avoid; }
nav.sommaire ul { list-style: none; padding-left: 0; }
nav.sommaire ul ul { padding-left: 6mm; }
nav.sommaire li { margin: 1mm 0; }
nav.sommaire > ul > li > a { font-weight: bold; }
/* impression en noir et blanc : les émojis (dessinés en couleur par la police) passent en gris */
.emoji { filter: grayscale(1) contrast(1.2); }
"""


def lire(source: Path):
    texte = source.read_text("utf-8")
    meta = {}
    if texte.startswith("---"):
        _, entete, texte = texte.split("---", 2)
        for ligne in entete.strip().splitlines():
            if ":" in ligne:
                k, v = ligne.split(":", 1)
                meta[k.strip()] = v.strip()
    return meta, texte


def image_grise(chemin: Path) -> str:
    from PIL import Image

    im = Image.open(chemin).convert("L")
    if im.height > im.width * 1.25:  # capture de page entière : on garde le haut, lisible
        im = im.crop((0, 0, im.width, int(im.width * 1.25)))
    if im.width > 1400:
        im = im.resize((1400, round(im.height * 1400 / im.width)))
    tampon = io.BytesIO()
    im.save(tampon, "JPEG", quality=72, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(tampon.getvalue()).decode()


EMOJI = re.compile("([\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\u2300-\u23FF\u2190-\u21FF\u25A0-\u25FF\u3030\u303D\u3297\u3299]"
                   "[\uFE0F\u200D\U0001F3FB-\U0001F3FF\u20E3]*(?:\u200D[\U0001F000-\U0001FAFF\u2600-\u27BF][\uFE0F]*)*)")


def griser_emojis(html: str) -> str:
    """Entoure les émojis (hors balises) d'un span qui les passe en gris."""
    morceaux = re.split(r"(<[^>]+>)", html)
    return "".join(m if m.startswith("<") else EMOJI.sub(r'<span class="emoji">\1</span>', m) for m in morceaux)


def construire_html(source: Path, images=None):
    meta, texte = lire(source)
    md = markdown.Markdown(extensions=["tables", "toc", "sane_lists", "attr_list"],
                           extension_configs={"toc": {"toc_depth": "1-2"}})
    corps = md.convert(texte)
    dossier = Path(images) if images else source.parent

    def remplacer(m):
        src = m.group(1)
        if src.startswith("data:"):
            return m.group(0)
        p = (dossier / src)
        return f'src="{image_grise(p)}"' if p.is_file() else m.group(0)

    corps = re.sub(r'src="([^"]+)"', remplacer, corps)
    corps = griser_emojis(corps)
    titre = meta.get("titre", "Guide d'utilisation")
    couverture = f"""<section class="couverture">
      <div class="titre">{titre}</div>
      <div class="trait"></div>
      <div class="sous-titre">{meta.get("sous_titre", "Guide d'utilisation")}</div>
      <div class="version">{("Version " + meta["version"] + "<br>") if meta.get("version") else ""}{meta.get("date", "")}</div>
    </section>"""
    sommaire = f'<nav class="sommaire"><h1>Sommaire</h1>{md.toc_tokens and md.toc}</nav>'
    sommaire = griser_emojis(sommaire.replace('<div class="toc">', "").replace("</div>", ""))
    return (f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>{titre}</title>'
            f"<style>{CSS}</style></head><body>{couverture}{sommaire}{corps}</body></html>"), meta


def generer(source: Path, sortie: Path, images=None) -> None:
    html, meta = construire_html(source, images)
    pied = (f'<div style="font-size:8pt;width:100%;padding:0 17mm;display:flex;justify-content:space-between;'
            f'font-family:DejaVu Sans,Arial,sans-serif;color:#000"><span>{meta.get("titre", "")}'
            f'{(" — version " + meta["version"]) if meta.get("version") else ""}</span>'
            f'<span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>')
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page()
        page.set_content(html, wait_until="load")
        page.pdf(path=str(sortie), format="A4", print_background=False, display_header_footer=True,
                 header_template="<span></span>", footer_template=pied, prefer_css_page_size=True)
        b.close()


if __name__ == "__main__":
    generer(Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3] if len(sys.argv) > 3 else None)
