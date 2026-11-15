from pathlib import Path
import argparse
import hashlib
import io
import json
import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "paper/2521959.pdf"
BLOB = "81363596b882ebf3188bf2f75b49012a2d4237da"
# Explicit page/xref pairing checked against the rendered captions and letter.
RECORDS = [["fig-01",3,4],["fig-02",5,9],["fig-03",6,13],["fig-04",7,16],["fig-05",8,19],["fig-06",12,31],["fig-07",13,35],["fig-08",14,38],["fig-09",15,41],["fig-10",16,44],["fig-11",17,53],["fig-12",20,60],["fig-13",22,65],["fig-14",23,68],["fig-15",23,69],["letter-radar",25,78]]

def extract(output, native):
    payload = SOURCE.read_bytes()
    header = f"blob {len(payload)}\0".encode()
    if hashlib.sha1(header + payload).hexdigest() != BLOB:
        raise ValueError("Paper does not match the audited Git blob")
    output.mkdir(parents=True, exist_ok=True)
    index = []
    with pymupdf.open(SOURCE) as pdf:
        for name, page, xref in RECORDS:
            source = [im for im in pdf[page - 1].get_image_info(xrefs=True) if im["xref"] == xref]
            if len(source) != 1:
                raise ValueError(f"Expected one match for {name} on page {page}")
            asset = pdf.extract_image(xref)
            if native:
                target = output / f"{name}.{asset['ext']}"
                target.write_bytes(asset["image"])
            else:
                target = output / f"{name}.webp"
                with Image.open(io.BytesIO(asset["image"])) as img:
                    img.thumbnail((1440, 1440), Image.Resampling.LANCZOS)
                    img.save(target, "WEBP", quality=89, method=6)
            index.append({
                "id": name, "pdf_page": page, "xref": xref, "file": target.name,
                "bbox_pt_top_left": [round(v, 3) for v in source[0]["bbox"]],
                "native_pixels": [asset["width"], asset["height"]],
                "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
            })
    (output / "index.json").write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--native", action="store_true", help="keep full-resolution embedded images")
    args = parser.parse_args()
    extract(args.output, args.native)
