"""WCAG contrast for the dashboard's oklch theme tokens (dashboard-merge-check, step 4).

axe cannot evaluate oklch() colors, so this reads the `.dark` block of
frontend/src/index.css (the app renders <main className="dark">) and computes
ratios for the pairs below. Add any new foreground/background pair you introduce.

Usage: python3 contrast.py path/to/frontend/src/index.css   (exit 1 on failure)
"""
import math
import re
import sys

# (foreground token, background token, minimum ratio, where it is used)
PAIRS = [
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
    if fg not in tokens or bg not in tokens:
        print(f"FAIL  missing token --{fg} or --{bg} in .dark")
        failed += 1
        continue
    r = ratio(tokens[fg], tokens[bg])
    ok = r >= need
    failed += not ok
    print(f"{'PASS' if ok else 'FAIL'}  {r:5.2f}:1 (need {need})  --{fg} on --{bg}  [{where}]")
sys.exit(1 if failed else 0)
