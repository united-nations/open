"""Printed dollar controls for the annual regular-budget assessment circulars.

Read only the complete Member State contribution table, not working capital,
credits, or narrative appropriation totals. The 2025+ rightmost column includes
the Peacebuilding Fund assessment and differs from regular-budget net alone.
"""
import re


def printed_assessment_control(document, year: int) -> dict:
    controls = []
    active = False
    for page in document:
        text = ' '.join(page.get_text().split())
        if 'B. Contributions by Member States' in text:
            active = True
        if year == 2019 and 'Gross contributions' in text and 'Net contributions' in text:
            active = True
        if not active or 'Gross contributions' not in text or 'Net contributions' not in text:
            continue
        lines = []
        for word in sorted(page.get_text('words'), key=lambda w: (w[1], w[0])):
            if not lines or abs(lines[-1][0][1] - word[1]) > .8:
                lines.append([word])
            else:
                lines[-1].append(word)
        for words in lines:
            words.sort(key=lambda w: w[0])
            line = ' '.join(w[4] for w in words)
            if 'C. Credits returned to Member States' in line:
                active = False
                break
            if not any(w[4] == 'Total' for w in words):
                continue
            if not any(re.fullmatch(r'100\.0{3,4}', w[4]) for w in words):
                continue
            # Reviewed final-column profile for the 2019–2026 circulars.
            # The leading billion digit can start at x=497–499, so x>=500
            # (used for individual Member State rows) would truncate totals.
            amount_words = [w[4] for w in words if w[0] >= 490 and re.fullmatch(r'[\d,]+', w[4])]
            if not amount_words:
                raise ValueError(f'{year} printed assessment total has no dollar amount')
            controls.append({'amount': int(''.join(amount_words).replace(',', '')),
                             'pdfPage': page.number + 1,
                             'column': 'Total contributions' if year >= 2025 else 'Net contributions'})
    if len(controls) != 1:
        raise ValueError(f'{year} expected one printed assessment dollar total; found {len(controls)}')
    return controls[0]


def validate_assessment_dollars(assessments: dict, control: dict, year: int) -> None:
    actual = sum(row['assessment_amount'] for row in assessments.values())
    # These are whole-dollar bills, whose printed country amounts and total
    # reconcile exactly in every reviewed 2019–2026 circular.
    if actual != control['amount']:
        raise ValueError(f"{year} assessment dollar rows total {actual}, printed {control['column']} "
                         f"is {control['amount']} on PDF page {control['pdfPage']}")
