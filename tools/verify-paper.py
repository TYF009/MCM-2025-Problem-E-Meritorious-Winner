"""Verify equation labels, figure captions and page counts in the original PDF."""
from pathlib import Path
import json
import re
from pypdf import PdfReader
from pypdf.generic import ContentStream

ROOT = Path(__file__).resolve().parents[1]
paper = PdfReader(ROOT / "paper/2521959.pdf")
prompt = PdfReader(ROOT / "problem/2025_ICM_Problem_E.pdf")
assert (len(paper.pages), len(prompt.pages)) == (25, 4)
pages = [page.extract_text() for page in paper.pages]
equations = [int(number) for page in pages[8:22]
             for number in re.findall(r"\((\d+)\)", page) if 1 <= int(number) <= 29]
assert sorted(set(equations)) == list(range(1, 30)), equations
figures = [(int(n), i) for i, page in enumerate(pages, 1)
           for n in re.findall(r"Figure\s+(\d+)\s*:", page)]
index = json.loads((ROOT / "docs/paper-figures/index.json").read_text(encoding="utf8"))
assert figures == [(n, row["pdf_page"]) for n, row in enumerate(index[:-1], 1)], figures
assert index[-1]["id"] == "letter-radar" and index[-1]["pdf_page"] == 25
assert "Milkwood" in pages[24]


def painted_images(stream, resources, parents=frozenset()):
    """Collect drawn image IDs, following PDF form XObjects without decoding pixels."""
    xobjects = resources.get("/XObject", {})
    if not xobjects:
        return set()
    xobjects = xobjects.get_object()
    images = set()
    for operands, operator in ContentStream(stream, paper).operations:
        if operator != b"Do":
            continue
        ref = xobjects.raw_get(operands[0])
        obj = ref.get_object()
        if obj["/Subtype"] == "/Image":
            images.add(ref.idnum)
        elif obj["/Subtype"] == "/Form" and ref.idnum not in parents:
            images.update(painted_images(obj, obj.get("/Resources", resources).get_object(),
                                         parents | {ref.idnum}))
    return images


for record in index:
    page = paper.pages[record["pdf_page"] - 1]
    assert record["xref"] in painted_images(page.get_contents(), page["/Resources"]), record
print("Original PDFs: 25 and 4 pages, 29 equations, 15 captions and all 16 painted image references checked.")
