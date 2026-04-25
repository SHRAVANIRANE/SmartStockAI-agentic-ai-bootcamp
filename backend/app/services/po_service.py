import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.schemas import ReorderRecommendation

class POService:
    @staticmethod
    def generate_po_pdf(store_id: str, product_id: str, recommendation: ReorderRecommendation) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor("#4f8ef7")
        )
        elements.append(Paragraph("PURCHASE ORDER", title_style))
        
        # Details Header
        po_number = f"PO-{datetime.now().strftime('%Y%m%d')}-{store_id}-{product_id}"
        date_str = datetime.now().strftime("%B %d, %Y")
        
        header_text = f"""
        <b>PO Number:</b> {po_number}<br/>
        <b>Date:</b> {date_str}<br/>
        <b>Store ID:</b> {store_id}<br/>
        <b>Supplier:</b> ACME Electronics Supply Co.<br/>
        """
        elements.append(Paragraph(header_text, styles["Normal"]))
        elements.append(Spacer(1, 30))
        
        # Table Data
        data = [
            ["Item", "Description", "Qty", "Unit Price", "Total"],
            [product_id, "Inventory Replenishment", str(recommendation.recommended_quantity), "$150.00", f"${recommendation.recommended_quantity * 150.00:,.2f}"]
        ]
        
        table = Table(data, colWidths=[80, 200, 50, 70, 70])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2a2b36")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f4f4f4")),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#dddddd")),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 40))
        
        # Reasoning
        elements.append(Paragraph("<b>AI Recommendation Context:</b>", styles["Heading3"]))
        elements.append(Paragraph(recommendation.reasoning, styles["Normal"]))
        
        # Footer Signatures
        elements.append(Spacer(1, 60))
        elements.append(Paragraph("Authorized Signature: ___________________________", styles["Normal"]))
        
        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
