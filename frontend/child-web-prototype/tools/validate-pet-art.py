"""validate-pet-art.py — 校验成品宠物 PNG 规范

用法:
    python tools/validate-pet-art.py [species]

    species: dragon | dino | hero（默认 dragon）

规范:
    - 文件存在: assets/pets/sp-<species>-1..5.png
    - 尺寸: 1024×1024 px
    - 模式: RGBA（含 alpha 通道）
    - 透明: alpha 通道最小值为 0（即确有透明区域，非纯填充图）
"""
from PIL import Image
import pathlib
import sys

d = pathlib.Path(__file__).resolve().parent.parent / "assets" / "pets"
species = sys.argv[1] if len(sys.argv) > 1 else "dragon"

ok = True
for n in range(1, 6):
    f = d / f"sp-{species}-{n}.png"
    if not f.exists():
        print("MISSING", f.name)
        ok = False
        continue
    im = Image.open(f)
    if im.size != (1024, 1024):
        print("SIZE", f.name, im.size)
        ok = False
    if im.mode != "RGBA" or im.getextrema()[3][0] != 0:
        print("NOT-TRANSPARENT", f.name)
        ok = False

print("PASS validate-pet-art" if ok else "FAIL validate-pet-art")
sys.exit(0 if ok else 1)
