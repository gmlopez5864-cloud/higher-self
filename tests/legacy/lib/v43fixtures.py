# Sample photos and voice notes for the v43 feed suite (no real people, all drawn here).
import sys, math, struct, wave, random
from PIL import Image, ImageDraw, ImageFilter
out = sys.argv[1]
W, H = 1600, 1200
def grad(top, bot):
    im = Image.new("RGB", (W, H)); d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H; d.line((0, y, W, y), fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    return im, d
# 1 sunset over the water
im, d = grad((250, 170, 110), (120, 70, 120)); d.ellipse((620, 380, 980, 740), fill=(255, 214, 140))
d.rectangle((0, 700, W, H), fill=(60, 70, 120))
for i in range(40): y = 720 + i * 12; d.line((700 - i * 8, y, 900 + i * 8, y), fill=(250, 190, 120), width=3)
im.filter(ImageFilter.GaussianBlur(2)).save(out + "/sunset.jpg", quality=88)
# 2 mountain trail
im, d = grad((150, 200, 235), (230, 240, 245))
d.polygon([(0, 900), (420, 300), (800, 820), (1150, 380), (1600, 900)], fill=(90, 110, 130)); d.polygon([(330, 420), (420, 300), (500, 430)], fill=(250, 250, 250))
d.rectangle((0, 880, W, H), fill=(110, 150, 90)); d.polygon([(760, H), (840, H), (810, 880), (800, 880)], fill=(190, 160, 110))
for x in range(40, W, 140): d.polygon([(x, 1000), (x + 40, 860), (x + 80, 1000)], fill=(40, 90, 60))
im.filter(ImageFilter.GaussianBlur(1.5)).save(out + "/trail.jpg", quality=88)
# 3 coffee and notebook on a wooden table
im, d = grad((150, 100, 60), (110, 70, 40))
for y in range(0, H, 90): d.line((0, y, W, y + 20), fill=(130, 85, 50), width=4)
d.rectangle((300, 300, 1000, 1000), fill=(245, 240, 228)); [d.line((360, y, 940, y), fill=(170, 190, 220), width=3) for y in range(380, 960, 50)]
d.ellipse((1080, 380, 1440, 740), fill=(235, 235, 235)); d.ellipse((1120, 420, 1400, 700), fill=(90, 55, 30))
im.filter(ImageFilter.GaussianBlur(1.2)).save(out + "/coffee.jpg", quality=88)
# 4 dojo mat
im, d = grad((230, 220, 190), (200, 185, 150))
for x in range(0, W, 400):
    for y in range(0, H, 200): d.rectangle((x + (y // 200 % 2) * 200, y, x + (y // 200 % 2) * 200 + 396, y + 196), outline=(150, 120, 80), width=6)
d.rectangle((700, 200, 900, 700), fill=(250, 250, 250)); d.rectangle((700, 420, 900, 450), fill=(30, 30, 30))
im.filter(ImageFilter.GaussianBlur(1)).save(out + "/dojo.jpg", quality=88)
# voice notes: soft speech-like hum (wav)
def voice(path, secs, seed):
    random.seed(seed); rate = 16000
    with wave.open(path, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); fr = bytearray()
        for i in range(int(secs * rate)):
            t = i / rate; env = 0.5 + 0.5 * math.sin(2 * math.pi * 2.3 * t)
            v = env * (0.35 * math.sin(2 * math.pi * 180 * t) + 0.15 * math.sin(2 * math.pi * 360 * t)) * 0.6
            fr += struct.pack("<h", int(max(-1, min(1, v)) * 32000))
        w.writeframes(bytes(fr))
voice(out + "/voice1.wav", 6, 1); voice(out + "/voice2.wav", 4, 2)
print("ok")
