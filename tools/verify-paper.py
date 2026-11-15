"""Verify equation labels, figure captions and page counts in the original PDF."""
from pathlib import Path
import json
import re
from pypdf import PdfReader

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
assert "Milkwood" in pages[24] and len(list(paper.pages[24].images)) >= 1
print("Original PDFs: 25 and 4 pages, 29 numbered equations, 15 figure captions and the farmer-letter radar anchor checked.")
