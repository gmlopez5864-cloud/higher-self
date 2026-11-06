# Small stand-in pictures and voice notes so the Your road suite can run here.
# The packaging machine uses its own fixtures; either set is valid JPEG/WAV input.
import math
import os
import struct
import sys
import wave

from PIL import Image, ImageDraw

out = sys.argv[1]
os.makedirs(out, exist_ok=True)

def jpg(name, color):
    im = Image.new("RGB", (960, 640), color)
    d = ImageDraw.Draw(im)
    d.ellipse((80, 80, 320, 320), fill=(255, 230, 180))
    im.save(os.path.join(out, name), "JPEG", quality=85)

jpg("sunset.jpg", (210, 90, 40))
jpg("trail.jpg", (30, 110, 55))
jpg("coffee.jpg", (110, 70, 35))
jpg("dojo.jpg", (160, 35, 40))

def wav(name):
    rate, secs = 16000, 1
    path = os.path.join(out, name)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        frames = bytearray()
        for i in range(rate * secs):
            frames += struct.pack("<h", int(8000 * math.sin(2 * math.pi * 220 * i / rate)))
        w.writeframes(frames)

wav("voice1.wav")
wav("voice2.wav")
