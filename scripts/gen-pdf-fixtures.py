"""Deterministic PDF fixtures for ingestion and large-document verification."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

out = Path('tests/fixtures')
out.mkdir(parents=True, exist_ok=True)

large = canvas.Canvas(str(out / 'contract-150-pages.pdf'), pagesize=letter, invariant=1)
for page in range(1, 151):
    large.setFont('Helvetica-Bold', 16)
    large.drawString(55, 735, f'Long Form Services Agreement - Page {page}')
    large.setFont('Helvetica', 10)
    y = 690
    for clause in range(1, 7):
        label = (page - 1) * 6 + clause
        large.drawString(55, y, f'Clause {label}.1  Service obligations and performance.')
        large.drawString(70, y - 15, 'The Supplier shall provide the Services with reasonable care and skill.')
        large.drawString(70, y - 30, 'The Customer shall pay all undisputed invoices within thirty days.')
        y -= 75
    if page == 120:
        large.setFont('Helvetica-Bold', 10)
        large.drawString(55, 180, 'Clause 87.4  Limitation of Liability.')
        large.setFont('Helvetica', 10)
        large.drawString(70, 165, 'The Supplier total liability shall not exceed AED 250,000 in aggregate.')
    large.setFont('Helvetica', 8)
    large.drawString(55, 35, f'Confidential contract fixture | {page}')
    large.showPage()
large.save()

scan = canvas.Canvas(str(out / 'scanned-no-text.pdf'), pagesize=letter, invariant=1)
scan.setFillColorRGB(.92, .93, .94)
scan.rect(55, 80, 500, 650, fill=1, stroke=0)
scan.setFillColorRGB(.55, .58, .61)
for y in range(680, 140, -28):
    scan.rect(85, y, 420, 9, fill=1, stroke=0)
scan.showPage()
scan.save()

boundary = canvas.Canvas(str(out / 'cross-page-duplicate.pdf'), pagesize=letter, invariant=1)
boundary.setFont('Helvetica', 12)
boundary.drawString(55, 700, 'Indemnity clause:')
boundary.drawString(55, 680, 'The Supplier shall indemnify the Client for')
boundary.showPage()
boundary.setFont('Helvetica', 12)
boundary.drawString(55, 700, 'claims arising from breach of confidentiality.')
boundary.showPage()
boundary.setFont('Helvetica', 12)
boundary.drawString(55, 700, 'The Supplier shall indemnify the Client for claims arising from breach of confidentiality.')
boundary.showPage()
boundary.save()
print('Generated large, no-text, and cross-page quote PDF fixtures.')
