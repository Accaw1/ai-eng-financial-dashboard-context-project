"""WCAG contrast for the dashboard's oklch theme tokens (dashboard-merge-check, step 4).

axe cannot evaluate oklch() colors, so this reads the `.dark` block of
frontend/src/index.css (the app renders <main className="dark">) and computes
ratios for the pairs below. Add any new foreground/background pair you introduce.

Usage: python3 contrast.py path/to/frontend/src/index.css   (exit 1 on failure)

A background written "token/NN@base" means a Tailwind opacity class such as
bg-destructive/10 drawn over `base`: Tailwind v4 emits
color-mix(in oklab, var(--token) NN%, transparent), which the browser
alpha-composites over the base color in gamma-encoded sRGB.
"""
import math
import re
import sys

# (foreground token, background token, minimum ratio, where it is used)
PAIRS = [
    ("destructive-foreground", "destructive/10@background", 4.5, "error banner text (App.tsx)"),
    ("muted-foreground", "card", 4.5, "card labels, descriptions, chart ticks"),
    ("muted-foreground", "background", 4.5, "header subtitle"),
    ("foreground", "card", 4.5, "KPI values, chart titles"),
    ("secondary-foreground", "secondary", 4.5, "period pill"),
    ("chart-income", "card", 3.0, "income line (graphic)"),
    ("chart-outcome", "card", 3.0, "outcome line (graphic)"),
    ("chart-profit", "card", 3.0, "profit line (graphic)"),
    ("ring", "card", 3.0, "focus outline on cards"),
    ("ring", "background", 3.0, "focus outline on page"),
    ("income-badge-fg", "income-badge", 3.0, "income badge icon"),
    ("outcome-badge-fg", "outcome-badge", 3.0, "outcome badge icon"),
    ("profit-badge-fg", "profit-badge", 3.0, "profit badge icon"),
]


def oklch_to_linear_srgb(l, c, h):
    h = math.radians(h)
    a, b = c * math.cos(h), c * math.sin(h)
    l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (l - 0.0894841775 * a - 1.2914855480 * b) ** 3
    rgb = (
        4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
        -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
        -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_,
    )
    return [min(max(x, 0.0), 1.0) for x in rgb]


def luminance(rgb):
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]


def encode(x):  # linear -> gamma-encoded sRGB
    return 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055


def decode(x):  # gamma-encoded -> linear sRGB
    return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4


def resolve(spec, tokens):
    """Return linear sRGB for "token" or "token/NN@base"; None if a token is missing."""
    m = re.fullmatch(r"([\w-]+)/(\d+)@([\w-]+)", spec)
    if not m:
        return tokens.get(spec)
    top, pct, base = m.group(1), int(m.group(2)) / 100, m.group(3)
    if top not in tokens or base not in tokens:
        return None
    return [
        decode(encode(t) * pct + encode(b) * (1 - pct))
        for t, b in zip(tokens[top], tokens[base])
    ]


def ratio(fg, bg):
    hi, lo = sorted((luminance(fg), luminance(bg)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


css = open(sys.argv[1]).read()
dark = re.search(r"\.dark\s*\{(.*?)\}", css, re.S).group(1)
tokens = {
    name: oklch_to_linear_srgb(*map(float, (l, c, h)))
    for name, l, c, h in re.findall(r"--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)", dark)
}

failed = 0
for fg, bg, need, where in PAIRS:
    fg_rgb, bg_rgb = resolve(fg, tokens), resolve(bg, tokens)
    if fg_rgb is None or bg_rgb is None:
        print(f"FAIL  missing token in .dark for --{fg} or --{bg}")
        failed += 1
        continue
    r = ratio(fg_rgb, bg_rgb)
    ok = r >= need
    failed += not ok
    print(f"{'PASS' if ok else 'FAIL'}  {r:5.2f}:1 (need {need})  --{fg} on --{bg}  [{where}]")
sys.exit(1 if failed else 0)
