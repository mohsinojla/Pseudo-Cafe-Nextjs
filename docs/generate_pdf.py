"""
Pseudo Café – Platform Guide PDF Generator
Run: python docs/generate_pdf.py
Output: docs/Pseudo-Cafe-Platform-Guide.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.platypus.flowables import Flowable
from reportlab.lib.colors import HexColor
import os

# ── Colours ──────────────────────────────────────────────────
YELLOW   = HexColor("#EAB308")
YELLOW_L = HexColor("#FEF9C3")
BLACK    = HexColor("#09090B")
GRAY_950 = HexColor("#0C0C0E")
GRAY_900 = HexColor("#18181B")
GRAY_800 = HexColor("#27272A")
GRAY_700 = HexColor("#3F3F46")
GRAY_600 = HexColor("#52525B")
GRAY_500 = HexColor("#71717A")
GRAY_400 = HexColor("#A1A1AA")
GRAY_300 = HexColor("#D4D4D8")
GRAY_200 = HexColor("#E4E4E7")
GRAY_100 = HexColor("#F4F4F5")
WHITE    = HexColor("#FAFAFA")
EMERALD  = HexColor("#10B981")
BLUE     = HexColor("#3B82F6")
PURPLE   = HexColor("#A855F7")
RED      = HexColor("#EF4444")
ORANGE   = HexColor("#F97316")
AMBER    = HexColor("#F59E0B")

PAGE_W, PAGE_H = A4
L_MARGIN = 18*mm
R_MARGIN = 18*mm
T_MARGIN = 14*mm
B_MARGIN = 14*mm

# ── Custom Flowables ─────────────────────────────────────────

class ColorRect(Flowable):
    """Filled rectangle, e.g. for section badges or dividers."""
    def __init__(self, w, h, fill, radius=3):
        super().__init__()
        self.w, self.h, self.fill, self.r = w, h, fill, radius
    def wrap(self, *args): return self.w, self.h
    def draw(self):
        self.canv.setFillColor(self.fill)
        self.canv.roundRect(0, 0, self.w, self.h, self.r, fill=1, stroke=0)


class SectionHeader(Flowable):
    """Yellow‑accent labelled section opener."""
    def __init__(self, label, title, page_w=A4[0], lm=18*mm, rm=18*mm):
        super().__init__()
        self.label  = label
        self.title  = title
        self.inner_w = page_w - lm - rm

    def wrap(self, *args):
        return self.inner_w, 38

    def draw(self):
        c = self.canv
        # label
        c.setFillColor(YELLOW)
        c.setFont("Helvetica-Bold", 6.5)
        c.drawString(0, 30, self.label.upper())
        # yellow underline
        c.setStrokeColor(YELLOW)
        c.setLineWidth(2)
        c.line(0, 28, 36, 28)
        # title
        c.setFillColor(HexColor("#111827"))
        c.setFont("Helvetica-Bold", 18)
        c.drawString(0, 8, self.title)


class CardBox(Flowable):
    """Light grey rounded card background."""
    def __init__(self, width, height, fill=None, border=None, radius=8):
        super().__init__()
        self.width  = width
        self.height = height
        self.fill   = fill or HexColor("#F9FAFB")
        self.border = border or HexColor("#E5E7EB")
        self.radius = radius

    def wrap(self, *args): return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(self.fill)
        c.setStrokeColor(self.border)
        c.setLineWidth(0.75)
        c.roundRect(0, 0, self.width, self.height, self.radius, fill=1, stroke=1)


class DotBullet(Flowable):
    """Yellow dot for bullet lists."""
    def wrap(self, *a): return 6, 6
    def draw(self):
        self.canv.setFillColor(YELLOW)
        self.canv.circle(3, 2, 2.5, fill=1, stroke=0)


class Divider(Flowable):
    def __init__(self, w, color=None):
        super().__init__()
        self.w = w
        self.color = color or GRAY_200
    def wrap(self, *a): return self.w, 1
    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(0.5)
        self.canv.line(0, 0, self.w, 0)


# ── Style helpers ─────────────────────────────────────────────

def S(name, **kw):
    base = {
        "fontName":  "Helvetica",
        "fontSize":  9,
        "leading":   14,
        "textColor": HexColor("#4B5563"),
        "spaceAfter": 4,
    }
    base.update(kw)
    return ParagraphStyle(name, **base)

# Style catalogue
styles = {
    "body":    S("body"),
    "body_sm": S("body_sm", fontSize=8, leading=12),
    "bold":    S("bold",    fontName="Helvetica-Bold", textColor=HexColor("#111827")),
    "h3":      S("h3",      fontName="Helvetica-Bold", fontSize=11,
                            textColor=HexColor("#111827"), spaceAfter=6, spaceBefore=4),
    "h4":      S("h4",      fontName="Helvetica-Bold", fontSize=9,
                            textColor=HexColor("#111827"), spaceAfter=3),
    "label":   S("label",   fontName="Helvetica-Bold", fontSize=6.5,
                            textColor=YELLOW, spaceAfter=2, leading=9),
    "code":    S("code",    fontName="Courier", fontSize=8, leading=12,
                            textColor=HexColor("#1D4ED8"), backColor=HexColor("#EFF6FF"),
                            borderPadding=(2,4,2,4)),
    "code_blk":S("code_blk",fontName="Courier", fontSize=7.5, leading=12,
                            textColor=HexColor("#D1FAE5"), backColor=HexColor("#111827"),
                            borderPadding=(6,8,6,8)),
    "caption": S("caption", fontSize=7.5, textColor=GRAY_500, spaceAfter=2),
    "center":  S("center",  alignment=TA_CENTER),
    "white":   S("white",   textColor=WHITE, fontName="Helvetica-Bold", fontSize=9),
    "tag_yellow": S("tag_y", fontName="Helvetica-Bold", fontSize=6.5,
                             textColor=HexColor("#92400E"), backColor=YELLOW_L,
                             borderPadding=(2,5,2,5)),
    "tag_green": S("tag_g",  fontName="Helvetica-Bold", fontSize=6.5,
                             textColor=HexColor("#166534"), backColor=HexColor("#DCFCE7"),
                             borderPadding=(2,5,2,5)),
    "tag_blue": S("tag_b",   fontName="Helvetica-Bold", fontSize=6.5,
                             textColor=HexColor("#1E40AF"), backColor=HexColor("#DBEAFE"),
                             borderPadding=(2,5,2,5)),
    "tag_gray": S("tag_gr",  fontName="Helvetica-Bold", fontSize=6.5,
                             textColor=HexColor("#374151"), backColor=GRAY_100,
                             borderPadding=(2,5,2,5)),
}

def P(text, style="body", **kw):
    s = styles[style]
    if kw:
        s = ParagraphStyle("_tmp", parent=s, **kw)
    return Paragraph(text, s)

def SP(h=4): return Spacer(1, h)

def HR(w=None):
    w = w or (PAGE_W - L_MARGIN - R_MARGIN)
    return HRFlowable(width=w, thickness=0.5, color=GRAY_200, spaceAfter=6, spaceBefore=6)

def inner_w():
    return PAGE_W - L_MARGIN - R_MARGIN

# ── Header / Footer ──────────────────────────────────────────

def on_page(canvas, doc):
    canvas.saveState()
    w = PAGE_W
    # Header bar
    canvas.setFillColor(GRAY_900)
    canvas.rect(0, PAGE_H - 10*mm, w, 10*mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawString(L_MARGIN, PAGE_H - 6.5*mm, "PSEUDO CAFÉ")
    canvas.setFillColor(YELLOW)
    canvas.drawString(L_MARGIN + 54, PAGE_H - 6.5*mm, "·")
    canvas.setFillColor(GRAY_400)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(L_MARGIN + 62, PAGE_H - 6.5*mm, "Platform Guide")
    # Page number
    canvas.setFillColor(GRAY_500)
    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(w - R_MARGIN, PAGE_H - 6.5*mm, f"Page {doc.page}")
    # Footer
    canvas.setFillColor(GRAY_100)
    canvas.rect(0, 0, w, 8*mm, fill=1, stroke=0)
    canvas.setFillColor(GRAY_500)
    canvas.setFont("Helvetica", 6.5)
    canvas.drawString(L_MARGIN, 3*mm, "Pseudo Café  ·  Restaurant Operations Platform  ·  Confidential")
    canvas.drawRightString(w - R_MARGIN, 3*mm, "Next.js 15  ·  Supabase  ·  Resend  ·  Vercel")
    canvas.restoreState()


def on_cover(canvas, doc):
    # Solid dark cover, no header/footer chrome
    canvas.saveState()
    canvas.setFillColor(GRAY_950)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Gold accent strip top
    canvas.setFillColor(YELLOW)
    canvas.rect(0, PAGE_H - 2, PAGE_W, 2, fill=1, stroke=0)
    # Bottom strip
    canvas.setFillColor(GRAY_800)
    canvas.rect(0, 0, PAGE_W, 14*mm, fill=1, stroke=0)
    canvas.setFillColor(GRAY_500)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(L_MARGIN, 5*mm, "Pseudo Café  ·  Platform Guide v1.0  ·  Confidential")
    canvas.drawRightString(PAGE_W - R_MARGIN, 5*mm, "2025")
    canvas.restoreState()


# ── Cover Page ───────────────────────────────────────────────

def cover_page():
    iw = inner_w()
    els = []

    # Big heading drawn as a Table for positioning control
    els.append(SP(60))
    els.append(P("PLATFORM GUIDE", "label", fontSize=8, spaceAfter=12,
                 textColor=YELLOW))
    els.append(P('<font name="Helvetica-Bold" size="36" color="#FFFFFF">Pseudo</font>'
                 '<font name="Helvetica-Bold" size="36" color="#EAB308"> Café</font>',
                 "body", spaceAfter=2, leading=40))
    els.append(P("Restaurant Operations Platform", "body",
                 textColor=GRAY_400, fontSize=12, leading=16, spaceAfter=20))

    # Yellow divider line
    els.append(ColorRect(52, 3, YELLOW))
    els.append(SP(20))

    els.append(P("A production-grade, multi-tenant restaurant management system —<br/>"
                 "built for real kitchens, real teams, and real revenue.",
                 "body", textColor=HexColor("#D1D5DB"), fontSize=13, leading=20, spaceAfter=36))

    # Meta chips
    meta = [
        ("Framework",  "Next.js 15 · App Router"),
        ("Database",   "Supabase · PostgreSQL"),
        ("Auth",       "Supabase Auth + RBAC"),
        ("Email",      "Resend SDK"),
        ("Deployment", "Vercel"),
    ]
    rows = [[
        P(k, "body", textColor=GRAY_500, fontSize=7, fontName="Helvetica-Bold", leading=9),
        P(v, "body", textColor=HexColor("#E5E7EB"), fontSize=8.5, fontName="Helvetica-Bold", leading=12)
    ] for k, v in meta]

    t = Table(rows, colWidths=[32*mm, 80*mm], rowHeights=16)
    t.setStyle(TableStyle([
        ("TOPPADDING",    (0,0),(-1,-1), 2),
        ("BOTTOMPADDING", (0,0),(-1,-1), 2),
        ("LEFTPADDING",   (0,0),(-1,-1), 0),
        ("RIGHTPADDING",  (0,0),(-1,-1), 0),
        ("LINEBELOW",     (0,0),(-1,-2), 0.3, GRAY_700),
    ]))
    els.append(t)

    els.append(PageBreak())
    return els


# ── Table helpers ─────────────────────────────────────────────

TS_DEFAULT = TableStyle([
    ("BACKGROUND",    (0,0), (-1,0),  GRAY_100),
    ("TEXTCOLOR",     (0,0), (-1,0),  HexColor("#374151")),
    ("FONTNAME",      (0,0), (-1,0),  "Helvetica-Bold"),
    ("FONTSIZE",      (0,0), (-1,0),  7.5),
    ("FONTNAME",      (0,1), (-1,-1), "Helvetica"),
    ("FONTSIZE",      (0,1), (-1,-1), 8),
    ("TEXTCOLOR",     (0,1), (-1,-1), HexColor("#4B5563")),
    ("TOPPADDING",    (0,0), (-1,-1), 6),
    ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ("LEFTPADDING",   (0,0), (-1,-1), 9),
    ("RIGHTPADDING",  (0,0), (-1,-1), 9),
    ("LINEBELOW",     (0,0), (-1,-2), 0.5, GRAY_200),
    ("ROWBACKGROUNDS",(0,1), (-1,-1), [WHITE, GRAY_100]),
    ("VALIGN",        (0,0), (-1,-1), "TOP"),
    ("ROUNDEDCORNERS",(0,0), (-1,-1), [4,4,4,4]),
])

def make_table(headers, rows, col_widths):
    data = [[P(h, "body", fontName="Helvetica-Bold", fontSize=7.5,
               textColor=HexColor("#374151")) for h in headers]]
    for row in rows:
        data.append([P(str(c), "body", fontSize=8) for c in row])
    t = Table(data, colWidths=col_widths)
    t.setStyle(TS_DEFAULT)
    return t


# ── Step helper ───────────────────────────────────────────────

def step(num, title, body_text):
    iw = inner_w()
    num_col = 8*mm
    body_col = iw - num_col - 4*mm

    num_cell = Table([[P(str(num), "body",
                         fontName="Helvetica-Bold", fontSize=8,
                         textColor=BLACK, alignment=TA_CENTER)]],
                     colWidths=[7*mm], rowHeights=[7*mm])
    num_cell.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(0,0), YELLOW),
        ("TOPPADDING",    (0,0),(0,0), 1),
        ("BOTTOMPADDING", (0,0),(0,0), 1),
        ("LEFTPADDING",   (0,0),(0,0), 0),
        ("RIGHTPADDING",  (0,0),(0,0), 0),
        ("ROUNDEDCORNERS",(0,0),(0,0), [3.5,3.5,3.5,3.5]),
    ]))

    body_cell = [
        P(title, "h4"),
        P(body_text, "body_sm"),
    ]

    t = Table([[num_cell, body_cell]],
              colWidths=[num_col, body_col])
    t.setStyle(TableStyle([
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 0),
        ("BOTTOMPADDING", (0,0),(-1,-1), 8),
        ("LEFTPADDING",   (0,0),(-1,-1), 0),
        ("RIGHTPADDING",  (0,0),(-1,-1), 0),
        ("LEFTPADDING",   (1,0),(1,0),   6),
    ]))
    return t


# ── Feature card grid ─────────────────────────────────────────

def feature_2col(items):
    """items: list of (icon, title, body) tuples; laid out 2-wide."""
    iw = inner_w()
    cell_w = (iw - 6) / 2

    rows = []
    for i in range(0, len(items), 2):
        row = []
        for item in items[i:i+2]:
            icon, title, body_txt = item
            content = [
                P(f"{icon}  {title}", "h4", spaceAfter=3),
                P(body_txt, "body_sm"),
            ]
            cell = Table([[content]], colWidths=[cell_w - 6])
            cell.setStyle(TableStyle([
                ("BACKGROUND",    (0,0),(0,0), GRAY_100),
                ("ROUNDEDCORNERS",(0,0),(0,0), [8,8,8,8]),
                ("TOPPADDING",    (0,0),(0,0), 9),
                ("BOTTOMPADDING", (0,0),(0,0), 9),
                ("LEFTPADDING",   (0,0),(0,0), 10),
                ("RIGHTPADDING",  (0,0),(0,0), 10),
                ("BOX",           (0,0),(0,0), 0.5, GRAY_200),
            ]))
            row.append(cell)
        if len(row) == 1:
            row.append("")
        rows.append(row)

    t = Table(rows, colWidths=[cell_w, cell_w], spaceBefore=4, spaceAfter=8)
    t.setStyle(TableStyle([
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("LEFTPADDING",   (0,0),(-1,-1), 0),
        ("RIGHTPADDING",  (0,0),(-1,-1), 0),
        ("COLPADDING",    (1,0),(1,-1), 6),
    ]))
    return t


# ── Inline code snippet ───────────────────────────────────────

def code_block(lines):
    iw = inner_w()
    content = "<br/>".join(lines)
    cell = Table([[P(content, "code_blk")]],
                 colWidths=[iw])
    cell.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(0,0), HexColor("#111827")),
        ("ROUNDEDCORNERS",(0,0),(0,0), [6,6,6,6]),
        ("TOPPADDING",    (0,0),(0,0), 8),
        ("BOTTOMPADDING", (0,0),(0,0), 8),
        ("LEFTPADDING",   (0,0),(0,0), 10),
        ("RIGHTPADDING",  (0,0),(0,0), 10),
    ]))
    return cell


# ── Callout ───────────────────────────────────────────────────

def callout(text):
    iw = inner_w()
    cell = Table([[P(text, "body", fontSize=8.5, textColor=HexColor("#374151"))]],
                 colWidths=[iw - 12])
    cell.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(0,0), HexColor("#FEFCE8")),
        ("LEFTPADDING",   (0,0),(0,0), 12),
        ("RIGHTPADDING",  (0,0),(0,0), 10),
        ("TOPPADDING",    (0,0),(0,0), 8),
        ("BOTTOMPADDING", (0,0),(0,0), 8),
        ("LINEBEFORE",    (0,0),(0,0), 3, YELLOW),
    ]))
    return cell


# ── env-var table ─────────────────────────────────────────────

def env_table(vars_list):
    iw = inner_w()
    rows = []
    for k, v in vars_list:
        rows.append([
            P(k, "code", textColor=HexColor("#1D4ED8"), backColor=HexColor("#EFF6FF"),
              fontSize=7.5),
            P(v, "body_sm"),
        ])
    t = Table(rows, colWidths=[75*mm, iw - 75*mm - 0])
    t.setStyle(TableStyle([
        ("TOPPADDING",    (0,0),(-1,-1), 5),
        ("BOTTOMPADDING", (0,0),(-1,-1), 5),
        ("LEFTPADDING",   (0,0),(-1,-1), 0),
        ("RIGHTPADDING",  (0,0),(-1,-1), 6),
        ("LINEBELOW",     (0,0),(-1,-2), 0.4, GRAY_200),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("BACKGROUND",    (0,0),(-1,-1), WHITE),
        ("BOX",           (0,0),(-1,-1), 0.5, GRAY_200),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [WHITE, GRAY_100]),
    ]))
    return t


# ── Role table ───────────────────────────────────────────────

def role_table():
    iw = inner_w()
    data = [
        ["Owner",   YELLOW_L,            HexColor("#92400E"),
         "Full access — dashboard, menu, staff, reports, all POS screens."],
        ["Manager", HexColor("#DBEAFE"),  HexColor("#1E40AF"),
         "Same as Owner. Can invite staff, apply discounts, view reports."],
        ["Cashier", HexColor("#F3E8FF"),  HexColor("#6B21A8"),
         "Cashier billing screen only. Discount capped by RBAC limit_value."],
        ["Waiter",  HexColor("#DCFCE7"),  HexColor("#166534"),
         "Waiter POS only. Create orders, add notes, fire to kitchen, request bill."],
        ["Kitchen", GRAY_100,             HexColor("#374151"),
         "Kitchen Display only. Advance item status. No access to prices or reports."],
    ]
    rows = []
    for role, bg, fg, desc in data:
        badge = Table([[P(role, "body", fontName="Helvetica-Bold", fontSize=7,
                          textColor=fg)]],
                      colWidths=[18*mm], rowHeights=[13])
        badge.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(0,0), bg),
            ("TOPPADDING",    (0,0),(0,0), 2),
            ("BOTTOMPADDING", (0,0),(0,0), 2),
            ("LEFTPADDING",   (0,0),(0,0), 6),
            ("RIGHTPADDING",  (0,0),(0,0), 6),
            ("ROUNDEDCORNERS",(0,0),(0,0), [10,10,10,10]),
        ]))
        rows.append([badge, P(desc, "body_sm")])

    t = Table(rows, colWidths=[22*mm, iw - 22*mm])
    t.setStyle(TableStyle([
        ("TOPPADDING",    (0,0),(-1,-1), 5),
        ("BOTTOMPADDING", (0,0),(-1,-1), 5),
        ("LEFTPADDING",   (0,0),(-1,-1), 0),
        ("RIGHTPADDING",  (0,0),(-1,-1), 0),
        ("LEFTPADDING",   (1,0),(1,-1), 10),
        ("LINEBELOW",     (0,0),(-1,-2), 0.4, GRAY_200),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
    ]))
    return t


# ── Order flow ────────────────────────────────────────────────

def order_flow():
    iw = inner_w()
    states = [
        ("Draft",      GRAY_100,             HexColor("#374151")),
        ("Placed",     HexColor("#FEF9C3"),   HexColor("#92400E")),
        ("In Kitchen", HexColor("#FFEDD5"),   HexColor("#9A3412")),
        ("Ready",      HexColor("#FEF9C3"),   HexColor("#92400E")),
        ("Served",     GRAY_100,             HexColor("#374151")),
        ("Billed",     HexColor("#DBEAFE"),   HexColor("#1E40AF")),
        ("Paid",       HexColor("#DCFCE7"),   HexColor("#166534")),
        ("Closed ✓",   HexColor("#DCFCE7"),   HexColor("#166534")),
    ]
    cells = []
    for i, (name, bg, fg) in enumerate(states):
        node = Table([[P(name, "body", fontName="Helvetica-Bold", fontSize=7,
                         textColor=fg, alignment=TA_CENTER)]],
                     colWidths=[20*mm], rowHeights=[13])
        node.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(0,0), bg),
            ("TOPPADDING",    (0,0),(0,0), 2),
            ("BOTTOMPADDING", (0,0),(0,0), 2),
            ("LEFTPADDING",   (0,0),(0,0), 2),
            ("RIGHTPADDING",  (0,0),(0,0), 2),
            ("ROUNDEDCORNERS",(0,0),(0,0), [5,5,5,5]),
        ]))
        cells.append(node)
        if i < len(states) - 1:
            cells.append(P("→", "body", textColor=GRAY_400, fontSize=8,
                           alignment=TA_CENTER))

    # Lay out in one row, wrapping if needed
    # Split into two rows of 4 for A4 width
    row1_items = cells[:8]   # Draft→Ready
    row2_items = cells[8:]   # Served→Closed

    col_w_node = 20*mm
    col_w_arr  = 6*mm

    def flow_row(items):
        data = [items]
        widths = []
        for item in items:
            if isinstance(item, Table):
                widths.append(col_w_node)
            else:
                widths.append(col_w_arr)
        t = Table(data, colWidths=widths, rowHeights=[18])
        t.setStyle(TableStyle([
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
            ("TOPPADDING",    (0,0),(-1,-1), 0),
            ("BOTTOMPADDING", (0,0),(-1,-1), 0),
            ("LEFTPADDING",   (0,0),(-1,-1), 0),
            ("RIGHTPADDING",  (0,0),(-1,-1), 1),
        ]))
        return t

    return [flow_row(cells[:8]), SP(4), flow_row(cells[8:])]


# ── Tech grid ─────────────────────────────────────────────────

def tech_grid(items):
    """3-column tech stack grid. items: (name, desc, badge_text, badge_color)"""
    iw = inner_w()
    cell_w = (iw - 10) / 3
    rows = []
    for i in range(0, len(items), 3):
        row = []
        for item in items[i:i+3]:
            name, desc, badge_txt, badge_col = item
            badge = Table([[P(badge_txt, "body", fontName="Helvetica-Bold",
                              fontSize=6, textColor=WHITE)]],
                          colWidths=[None], rowHeights=[11])
            badge.setStyle(TableStyle([
                ("BACKGROUND",    (0,0),(0,0), badge_col),
                ("TOPPADDING",    (0,0),(0,0), 1),
                ("BOTTOMPADDING", (0,0),(0,0), 1),
                ("LEFTPADDING",   (0,0),(0,0), 5),
                ("RIGHTPADDING",  (0,0),(0,0), 5),
                ("ROUNDEDCORNERS",(0,0),(0,0), [10,10,10,10]),
            ]))
            content = [
                P(name, "h4", spaceAfter=2),
                P(desc, "body_sm", spaceAfter=5),
                badge,
            ]
            cell = Table([[content]], colWidths=[cell_w - 6])
            cell.setStyle(TableStyle([
                ("BACKGROUND",    (0,0),(0,0), WHITE),
                ("BOX",           (0,0),(0,0), 0.5, GRAY_200),
                ("ROUNDEDCORNERS",(0,0),(0,0), [7,7,7,7]),
                ("TOPPADDING",    (0,0),(0,0), 9),
                ("BOTTOMPADDING", (0,0),(0,0), 9),
                ("LEFTPADDING",   (0,0),(0,0), 10),
                ("RIGHTPADDING",  (0,0),(0,0), 10),
            ]))
            row.append(cell)
        while len(row) < 3:
            row.append("")
        rows.append(row)

    t = Table(rows, colWidths=[cell_w, cell_w, cell_w], spaceBefore=4, spaceAfter=8)
    t.setStyle(TableStyle([
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("LEFTPADDING",   (0,0),(-1,-1), 0),
        ("RIGHTPADDING",  (0,0),(-1,-1), 0),
        ("COLPADDING",    (1,0),(1,-1), 5),
        ("COLPADDING",    (2,0),(2,-1), 5),
    ]))
    return t


# ── Checklist ────────────────────────────────────────────────

def checklist(items):
    rows = []
    for item in items:
        rows.append([
            P("✓", "body", fontName="Helvetica-Bold", textColor=EMERALD, fontSize=9),
            P(item, "body_sm"),
        ])
    t = Table(rows, colWidths=[7*mm, inner_w() - 7*mm])
    t.setStyle(TableStyle([
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 2),
        ("BOTTOMPADDING", (0,0),(-1,-1), 2),
        ("LEFTPADDING",   (0,0),(-1,-1), 0),
        ("RIGHTPADDING",  (0,0),(-1,-1), 0),
        ("LEFTPADDING",   (1,0),(1,-1), 4),
    ]))
    return t


def checklist_2col(left, right):
    iw = inner_w()
    half = iw / 2 - 4
    l = checklist(left)
    r = checklist(right)
    t = Table([[l, r]], colWidths=[half, half])
    t.setStyle(TableStyle([
        ("TOPPADDING",    (0,0),(-1,-1), 0),
        ("BOTTOMPADDING", (0,0),(-1,-1), 0),
        ("LEFTPADDING",   (0,0),(-1,-1), 0),
        ("RIGHTPADDING",  (0,0),(-1,-1), 0),
        ("LEFTPADDING",   (1,0),(1,-1), 10),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
    ]))
    return t


# ══════════════════════════════════════════════════════════════
#  BUILD DOCUMENT
# ══════════════════════════════════════════════════════════════

out_path = os.path.join(os.path.dirname(__file__), "Pseudo-Cafe-Platform-Guide.pdf")

doc = SimpleDocTemplate(
    out_path,
    pagesize=A4,
    leftMargin=L_MARGIN,
    rightMargin=R_MARGIN,
    topMargin=T_MARGIN + 10*mm,
    bottomMargin=B_MARGIN + 8*mm,
    title="Pseudo Café – Platform Guide",
    author="Pseudo Café",
    subject="Usage, Tech Stack & Deployment",
)

story = []

# ─── COVER ───────────────────────────────────────────────────
story += cover_page()


# ─── PAGE 2: OVERVIEW ────────────────────────────────────────
story.append(SectionHeader("Platform Overview", "What is Pseudo Café?"))
story.append(SP(6))
story.append(P(
    "Pseudo Café is a full-stack, multi-tenant restaurant operations platform that manages "
    "the entire dine-in workflow — from a customer sitting down to a payment being received — "
    "in real time, across every role in a restaurant."
))
story.append(SP(4))
story.append(callout(
    "<b>The problem it solves:</b> Most restaurants still run on paper tickets, verbal "
    "communication, and separate billing apps. Pseudo Café replaces all of that with a "
    "unified digital system where the waiter, kitchen, and cashier all see the same live "
    "data instantly — on any device, with no page refresh."
))
story.append(SP(8))

story.append(feature_2col([
    ("📊", "Owner Dashboard",
     "Live revenue counter, order count, average order value, table occupancy, and top-selling "
     "items — all updated in real time via WebSocket without page refresh."),
    ("🍽️", "Waiter POS",
     "Full-screen floor view with colour-coded table statuses. Search the menu, add items with "
     "per-item kitchen notes, and fire the order to the KDS in one tap."),
    ("👨‍🍳", "Kitchen Display (KDS)",
     "Live order board — no paper tickets. Items cycle Queued → Preparing → Ready with a single "
     "tap. Late orders (15 min+) highlighted in red with a ⚠ LATE badge."),
    ("💳", "Cashier Billing",
     "Itemised bill, RBAC-capped percentage discount, Cash/Card/Other payment method, optional "
     "reference number. One click confirms payment and frees the table instantly."),
    ("👥", "Staff Management",
     "Invite staff by email — credentials delivered via Resend. New staff show Pending until "
     "first login, then automatically flip to Active. Deactivate without deleting."),
    ("📈", "Sales Reports",
     "Date-range reports (Today / 7 days / 30 days) — total revenue, breakdown by payment "
     "method, and top 10 items ranked by revenue."),
]))

story.append(HR())
story.append(SectionHeader("Roles & Permissions", "Who uses what"))
story.append(SP(6))
story.append(P(
    "Every user is assigned a role at invite time. Permissions are enforced at three layers: "
    "the UI (buttons hidden), the API (server-side RBAC check), and the database (Row Level Security). "
    "A rogue API call cannot read another tenant's data."
))
story.append(SP(6))
story.append(role_table())
story.append(PageBreak())


# ─── PAGE 3: ORDER FLOW + REAL-TIME ──────────────────────────
story.append(SectionHeader("Order Lifecycle", "From seat to receipt"))
story.append(SP(6))
story.append(P(
    "Every order follows a strict server-side state machine. Transitions are validated at "
    "the API layer — an order cannot skip states, go backwards, or be paid before it is billed."
))
story.append(SP(8))
story += order_flow()
story.append(SP(8))

story.append(make_table(
    ["State", "Who triggers", "What happens in the system"],
    [
        ["draft",       "System (auto)",  "Created when waiter opens a table. Items can be added."],
        ["placed",      "Waiter",         "Order confirmed and locked. Items cannot be removed."],
        ["in_kitchen",  "Waiter",         "Order appears on KDS. Table card turns amber in real time."],
        ["ready",       "Kitchen (auto)", "All items marked Ready → order auto-advances. Waiter sees update live."],
        ["served",      "Waiter",         "Food delivered to table. Request Bill button enabled."],
        ["billed",      "Waiter",         "Bill requested. Order appears instantly in Cashier queue."],
        ["paid → closed","Cashier",       "Payment recorded. Order closed. Table freed across all devices."],
    ],
    [20*mm, 30*mm, inner_w()-50*mm],
))

story.append(SP(6))
story.append(HR())
story.append(SectionHeader("Real-Time Architecture", "What updates live — without refresh"))
story.append(SP(6))
story.append(P(
    "Supabase Realtime uses PostgreSQL logical replication to stream row-level changes over "
    "WebSocket to every connected client. Three screens stay live simultaneously:"
))
story.append(SP(6))

story.append(feature_2col([
    ("⚡", "Floor View (Waiter)",
     "Table cards update the instant another device changes table status. Two waiters cannot "
     "double-order the same table simultaneously."),
    ("🟠", "Kitchen Display",
     "New orders appear immediately — no polling, no refresh. The age timer ticks every 10 s. "
     "Items update as kitchen staff tap them on their screen."),
    ("📊", "Owner Dashboard",
     "Revenue counter increments live when cashier processes a payment. Order count, top items, "
     "and table occupancy all update in real time via the same WebSocket channel."),
    ("🔒", "Security layer",
     "Supabase RLS policies ensure each WebSocket subscription only delivers rows belonging "
     "to the authenticated user's organisation — no cross-tenant data leakage."),
]))
story.append(PageBreak())


# ─── PAGE 4: HOW TO USE (OWNER + WAITER) ─────────────────────
story.append(SectionHeader("How to Use", "Owner / Manager journey"))
story.append(SP(6))

story.append(step(1, "Log in at /login",
    "Enter email and password. Owner and Manager are redirected to /outlet/[id] — the management "
    "dashboard. The sidebar gives access to Overview, Menu, Staff, and Reports. A Sign out button "
    "sits at the bottom of the sidebar."))
story.append(step(2, "Build the menu — /outlet/[id]/menu",
    "Click Add Item. Enter name, price, and category. Optionally paste an image URL — leave blank "
    "to use the auto-selected category photo (Unsplash). Toggle availability without deleting items "
    "for temporarily unavailable dishes (86'd)."))
story.append(step(3, "Invite staff — /outlet/[id]/staff",
    "Click Invite Staff. Enter full name, email, select a role, and set an initial password "
    "(minimum 8 characters). Staff receive a branded dark-theme welcome email showing their "
    "credentials. They appear with a Pending badge until their first login, then automatically "
    "become Active — no admin action required."))
story.append(step(4, "Monitor operations — Dashboard Overview",
    "Live stat cards show today's revenue (increments on each cashier payment), order count, "
    "average order value, and table occupancy. Top 5 items sold appear in a bar chart below. "
    "Three quick-links open Waiter POS, Kitchen Display, and Cashier views directly."))
story.append(step(5, "Review performance — /outlet/[id]/reports",
    "Switch between Today, Last 7 days, and Last 30 days. See total revenue, a breakdown by "
    "payment method (Cash / Card / Other), and a table of the top 10 items ranked by revenue "
    "with quantity sold."))

story.append(HR())
story.append(SectionHeader("How to Use", "Waiter journey"))
story.append(SP(6))

story.append(step(1, "Open the floor — /waiter/[id]",
    "Colour-coded table grid: Green = Free, Blue = Seated, Amber = Order in kitchen, "
    "Red = Bill requested. The grid updates live without refresh across all devices."))
story.append(step(2, "Tap a table → build order",
    "The right panel opens with the full menu grouped by category. Use the search bar to "
    "find items instantly. Tap + to add, − to remove. Tap the note icon after adding an "
    "item to set special instructions (e.g. \"no onions, extra sauce\"). Notes travel to KDS."))
story.append(step(3, "Send to Kitchen",
    "Cart total is shown at the bottom. Tap Send to Kitchen — the order fires to the KDS and "
    "the table card turns amber. If the API fails, an inline error banner shows the reason. "
    "You can add more items later; they join the existing order."))
story.append(step(4, "Request Bill",
    "When food is served and the guest asks for the bill, tap Request Bill in the table header. "
    "The order moves to billed state and appears instantly in the Cashier queue. The table "
    "card turns red."))
story.append(PageBreak())


# ─── PAGE 5: KITCHEN + CASHIER + EXTRAORDINARY ───────────────
story.append(SectionHeader("How to Use", "Kitchen Display & Cashier"))
story.append(SP(4))

iw = inner_w()
half = iw / 2 - 4

left_steps = [
    step(1, "Live order cards",
         "Orders appear sorted oldest-first. Table label and elapsed time shown. "
         "Orders older than 15 minutes display a red border and ⚠ LATE badge."),
    step(2, "Advance item status",
         "Tap any item to cycle: Queued → Preparing → Ready. "
         "Kitchen notes from the waiter appear in yellow beneath the item name."),
    step(3, "Auto-complete",
         "When all items are Ready, the order auto-advances to ready state, "
         "disappears from the KDS, and the waiter's floor view updates live."),
]
right_steps = [
    step(1, "Bill queue",
         "Left sidebar lists all billed orders oldest-first. Click an order "
         "to load the full itemised bill with unit prices and quantities."),
    step(2, "Apply discount",
         "Enter a percentage discount. The RBAC system silently caps it at "
         "the cashier's allowed maximum — any attempt over the limit returns "
         "an inline error message, not a page crash."),
    step(3, "Confirm payment",
         "Select Cash, Card, or Other. Optionally enter a reference/TXN ID. "
         "Press Confirm Payment. Payment is recorded, order closes, "
         "and the table frees instantly across all devices."),
]

t = Table([[left_steps, right_steps]], colWidths=[half, half])
t.setStyle(TableStyle([
    ("VALIGN",        (0,0),(-1,-1), "TOP"),
    ("TOPPADDING",    (0,0),(-1,-1), 0),
    ("BOTTOMPADDING", (0,0),(-1,-1), 0),
    ("LEFTPADDING",   (0,0),(-1,-1), 0),
    ("RIGHTPADDING",  (0,0),(-1,-1), 0),
    ("LEFTPADDING",   (1,0),(1,-1), 10),
]))
story.append(t)

story.append(HR())
story.append(SectionHeader("Standout Features", "What makes it extraordinary"))
story.append(SP(4))

story.append(feature_2col([
    ("⚡", "Zero-polling real-time",
     "Every screen uses Supabase Realtime (WebSocket). No refresh, no polling. "
     "Sub-second latency across all connected devices simultaneously — tested with "
     "KDS, floor view, and dashboard open at the same time."),
    ("🔒", "Three-layer security",
     "UI hides unauthorised buttons. API runs RBAC can() check server-side. "
     "Database enforces Row Level Security — even a rogue API call cannot read "
     "another tenant's data."),
    ("🏢", "Multi-tenant by design",
     "Every table has org_id. A single deployment hosts unlimited restaurant "
     "organisations. No data leakage at the DB layer. Ready to scale to SaaS "
     "with zero schema changes."),
    ("📧", "Branded staff onboarding",
     "Welcome emails sent via Resend — dark-themed HTML with credentials card, "
     "role badge, and sign-in CTA. Staff show Pending until first login; "
     "auto-activate without any admin action."),
    ("📝", "Per-item kitchen notes",
     "Waiters attach special instructions to individual items. Notes travel "
     "from POS → database → KDS in real time, eliminating verbal re-transmission "
     "and reducing kitchen errors."),
    ("🛡️", "State machine enforcement",
     "Orders follow a strict state machine enforced at the API layer. Cannot "
     "skip states or pay before billing. Every transition is timestamped "
     "for auditability and revenue reconciliation."),
]))
story.append(PageBreak())


# ─── PAGE 6: TECH STACK ──────────────────────────────────────
story.append(SectionHeader("Tech Stack", "Built with"))
story.append(SP(6))

story.append(tech_grid([
    ("Next.js 15",       "App Router with React Server Components. Route groups for layout "
                         "isolation. Server-side rendering for auth-protected pages.",
     "Framework", GRAY_700),
    ("TypeScript 6",     "Strict mode. All API responses, DB rows, and component props "
                         "fully typed. Zero any escapes in business logic.",
     "Language", BLUE),
    ("Tailwind CSS v4",  "Utility-first CSS. Yellow/black glassmorphism design system. "
                         "All styles inlined — no separate CSS files to manage.",
     "Styling", GRAY_600),
    ("Supabase",         "PostgreSQL database, Auth (email+password), Realtime subscriptions, "
                         "Row Level Security. Managed cloud — free tier to Pro ready.",
     "Backend", EMERALD),
    ("@supabase/ssr",    "Cookie-based auth for SSR. Session tokens in HTTP-only cookies. "
                         "Middleware refreshes sessions on every request transparently.",
     "Auth", EMERALD),
    ("Zod",              "Runtime schema validation on every API route. Malformed requests "
                         "return structured 400 errors. Schemas shared client ↔ server.",
     "Validation", YELLOW),
    ("Resend SDK",       "Transactional email — branded HTML welcome emails to invited staff. "
                         "Reliable delivery. Free tier: 3,000 emails/month.",
     "Email", PURPLE),
    ("TanStack Query v5","Server-state management with caching. Integrated with Supabase "
                         "Realtime for cache invalidation on live events.",
     "State", GRAY_600),
    ("Lucide React",     "700+ MIT-licensed SVG icons used throughout all staff-facing "
                         "UI — sidebar, stat cards, POS screens, and action buttons.",
     "Icons", GRAY_600),
    ("Framer Motion",    "Production-ready animations for the customer-facing pages — "
                         "hero sections, card reveals, and page transitions.",
     "Animation", GRAY_600),
    ("Three.js + R3F",   "WebGL 3D for the customer-facing pizza customiser. React Three "
                         "Fiber (R3F) and Drei helpers for declarative 3D scenes.",
     "3D", GRAY_600),
    ("Vercel",           "Zero-config Next.js deployment. Edge network, HTTPS, preview "
                         "deploys on every PR, and env variable management.",
     "Deploy", BLUE),
]))

story.append(HR())
story.append(SectionHeader("External Services", "What the platform depends on"))
story.append(SP(6))

story.append(make_table(
    ["Service", "Purpose", "Free Tier Limit", "Upgrade When"],
    [
        ["Supabase\nsupabase.com",
         "PostgreSQL DB, Auth, Realtime, Storage, Row Level Security",
         "500 MB DB · 50 K MAU · 200 concurrent connections",
         "DB hits 500 MB or users exceed 50 K MAU"],
        ["Resend\nresend.com",
         "Transactional staff welcome emails with credentials",
         "3,000 emails/month · 100 per day",
         "Inviting more than 100 staff per day"],
        ["Vercel\nvercel.com",
         "Next.js hosting, CDN, serverless API functions",
         "Hobby: 100 GB bandwidth · unlimited deploys",
         "Commercial use or bandwidth > 100 GB/month"],
        ["Unsplash CDN\nimages.unsplash.com",
         "Default food photos for menu item cards",
         "Unlimited CDN reads — no API key used",
         "Never — static CDN URLs, zero API calls"],
    ],
    [30*mm, 55*mm, 52*mm, inner_w()-137*mm],
))

story.append(SP(6))
story.append(callout(
    "<b>Total cost at demo/MVP scale: $0/month.</b>  Every dependency is within its free tier "
    "for a single outlet with a normal team size. The platform is architected to upgrade to "
    "Supabase Pro and Vercel Pro on demand with no code changes."
))
story.append(PageBreak())


# ─── PAGE 7: DEPLOYMENT PART 1 ───────────────────────────────
story.append(SectionHeader("Deployment", "From code to live URL"))
story.append(SP(4))
story.append(P(
    "This guide takes you from a fresh clone to a publicly accessible deployment on Vercel, "
    "backed by Supabase cloud — in under 30 minutes. No DevOps, no servers to manage."
))
story.append(SP(8))

story.append(P("Phase 1 — External services setup", "h3"))
story.append(step(1, "Create a Supabase project",
    "Go to supabase.com → New project. Choose a region close to your users (ap-south-1 "
    "for Pakistan). After creation go to Project Settings → API and copy three values: "
    "Project URL → NEXT_PUBLIC_SUPABASE_URL, anon key → NEXT_PUBLIC_SUPABASE_ANON_KEY, "
    "service_role key → SUPABASE_SERVICE_ROLE_KEY."))
story.append(step(2, "Apply the database schema",
    "In Supabase → SQL Editor, paste and run the full migration SQL. This creates all tables "
    "(organizations, outlets, users, roles, menu_items, orders, order_items, payments, tables, "
    "shifts), RLS policies, 13 performance indexes, and the role/permission seed data."))
story.append(step(3, "Seed demo data (optional)",
    "Fill in your .env.local with the Supabase credentials, then run: npm run seed — "
    "this creates a demo org, outlet, 4 menu categories, 13 menu items with Unsplash images, "
    "10 tables, and an owner account you can log in with immediately."))
story.append(step(4, "Create a Resend account",
    "Go to resend.com → Sign up free → API Keys → Create key. Copy the re_... key as "
    "RESEND_API_KEY. On the free tier you can send from onboarding@resend.dev without any "
    "DNS setup. For production, add and verify your own domain under Resend → Domains."))

story.append(SP(4))
story.append(P("Phase 2 — Local development", "h3"))
story.append(SP(4))
story.append(code_block([
    "# 1. Clone and install",
    "git clone https://github.com/your-org/pseudo-cafe.git",
    "cd pseudo-cafe && npm install",
    "",
    "# 2. Set up environment (fill in the 5 variables below)",
    "cp .env.example .env.local",
    "",
    "# 3. Start development server",
    "npm run dev",
    "# → http://localhost:3000",
]))
story.append(SP(6))

story.append(P("Environment variables", "h3"))
story.append(SP(4))
story.append(env_table([
    ("NEXT_PUBLIC_SUPABASE_URL",     "Your Supabase project URL — e.g. https://xyz.supabase.co"),
    ("NEXT_PUBLIC_SUPABASE_ANON_KEY","Public anon key from Supabase API settings (starts with sb_publishable_)"),
    ("SUPABASE_SERVICE_ROLE_KEY",    "Secret service_role key — server-only, NEVER exposed to the browser"),
    ("RESEND_API_KEY",               "API key from resend.com — starts with re_"),
    ("NEXT_PUBLIC_SITE_URL",         "Your public URL — http://localhost:3000 in dev, https://yourapp.vercel.app in prod"),
]))
story.append(PageBreak())


# ─── PAGE 8: DEPLOYMENT PART 2 + CHECKLIST ───────────────────
story.append(P("Phase 3 — Deploy to Vercel", "h3"))
story.append(SP(4))

story.append(step(1, "Push to GitHub",
    "Create a new GitHub repository and push your code. Ensure .env.local is in .gitignore — "
    "never commit secrets."))
story.append(code_block([
    "git init && git add .",
    'git commit -m "Initial commit"',
    "git remote add origin https://github.com/your-org/pseudo-cafe.git",
    "git push -u origin main",
]))

story.append(step(2, "Import to Vercel",
    "Go to vercel.com/new → Import Git Repository → select your repo. "
    "Framework preset is auto-detected as Next.js. Leave build settings as default."))
story.append(step(3, "Add environment variables",
    "In the Vercel import screen → Environment Variables section, add all five variables. "
    "Set NEXT_PUBLIC_SITE_URL to your Vercel deployment URL (e.g. https://pseudo-cafe.vercel.app). "
    "You can update this after the first deploy."))
story.append(step(4, "Deploy",
    "Click Deploy. Vercel builds the Next.js app (~90 seconds) and provisions serverless "
    "functions for all API routes. You get a live HTTPS URL with a global CDN instantly."))
story.append(step(5, "Update Supabase redirect URLs",
    "In Supabase → Authentication → URL Configuration. Add your Vercel URL to Site URL "
    "and Redirect URLs. This is required for auth redirects to work in production."))
story.append(step(6, "Custom domain (optional)",
    "Vercel → Project → Settings → Domains. Add your domain (e.g. app.pseudocafe.com). "
    "Vercel provides a CNAME record — add it to your DNS provider. SSL is auto-provisioned. "
    "Update NEXT_PUBLIC_SITE_URL and Supabase redirect URLs to the new domain."))

story.append(HR())
story.append(P("Production readiness checklist", "h3"))
story.append(SP(6))

story.append(checklist_2col(
    [
        "All 5 environment variables set in Vercel",
        "Supabase Site URL updated to production domain",
        "Database schema migration applied",
        "RLS policies enabled on all tables",
        "Owner account created (seed or manually)",
        "Resend domain verified for custom sender",
        "Menu items added with images",
        "Tables configured for the outlet",
    ],
    [
        "npm run build passes with 0 TypeScript errors",
        "Supabase Realtime enabled on project",
        "Service role key is server-only (no NEXT_PUBLIC_ prefix)",
        ".env.local is in .gitignore",
        "End-to-end order flow tested in staging",
        "Staff invite email delivery confirmed",
        "KDS live updates verified on second device",
        "Supabase DB password is 20+ characters",
    ]
))

story.append(SP(8))
story.append(callout(
    "<b>Full production stack:</b>  Custom domain (DNS) → Vercel Edge Network (CDN + SSL) → "
    "Next.js serverless functions (API routes) → Supabase PostgreSQL (database + auth + realtime) "
    "→ Resend (transactional email).  All connections encrypted in transit.  "
    "No infrastructure to manage, patch, or scale manually."
))

story.append(SP(16))

# Footer row
iw = inner_w()
footer = Table([[
    P("<b>Pseudo Café</b>  ·  Restaurant Operations Platform", "body",
      fontSize=7.5, textColor=GRAY_500),
    P("Next.js 15  ·  Supabase  ·  Resend  ·  Vercel  ·  Version 1.0  ·  2025",
      "body", fontSize=7, textColor=GRAY_400, alignment=TA_RIGHT),
]], colWidths=[iw/2, iw/2])
footer.setStyle(TableStyle([
    ("TOPPADDING",    (0,0),(-1,-1), 0),
    ("BOTTOMPADDING", (0,0),(-1,-1), 0),
    ("LEFTPADDING",   (0,0),(-1,-1), 0),
    ("RIGHTPADDING",  (0,0),(-1,-1), 0),
    ("LINEABOVE",     (0,0),(-1,-1), 0.5, GRAY_200),
]))
story.append(footer)


# ── Build PDF ─────────────────────────────────────────────────
doc.build(
    story,
    onFirstPage=on_cover,
    onLaterPages=on_page,
)
print(f"PDF saved → {out_path}")
