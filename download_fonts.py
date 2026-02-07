import os
import requests

fonts = [
    "KaTeX_AMS-Regular",
    "KaTeX_Caligraphic-Bold",
    "KaTeX_Caligraphic-Regular",
    "KaTeX_Fraktur-Bold",
    "KaTeX_Fraktur-Regular",
    "KaTeX_Main-Bold",
    "KaTeX_Main-BoldItalic",
    "KaTeX_Main-Italic",
    "KaTeX_Main-Regular",
    "KaTeX_Math-BoldItalic",
    "KaTeX_Math-Italic",
    "KaTeX_SansSerif-Bold",
    "KaTeX_SansSerif-Italic",
    "KaTeX_SansSerif-Regular",
    "KaTeX_Script-Regular",
    "KaTeX_Size1-Regular",
    "KaTeX_Size2-Regular",
    "KaTeX_Size3-Regular",
    "KaTeX_Size4-Regular",
    "KaTeX_Typewriter-Regular"
]

extensions = ["woff2", "woff", "ttf"]
base_url = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/"
output_dir = "extension/lib/fonts"

os.makedirs(output_dir, exist_ok=True)

for font in fonts:
    for ext in extensions:
        filename = f"{font}.{ext}"
        url = base_url + filename
        print(f"Downloading {filename}...")
        try:
            r = requests.get(url)
            if r.status_code == 200:
                with open(os.path.join(output_dir, filename), "wb") as f:
                    f.write(r.content)
            else:
                print(f"Failed to download {filename}: {r.status_code}")
        except Exception as e:
            print(f"Error downloading {filename}: {e}")

print("Done!")
