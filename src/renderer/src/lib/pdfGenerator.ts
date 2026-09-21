import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DEZEM_LOGO_ASPECT_RATIO, DEZEM_LOGO_PNG_BASE64 } from '../assets/dezemLogoBase64'

interface PdfOptions {
  title: string
  subtitle?: string
  headers: string[]
  data: (string | number)[][]
  foot?: (string | number)[][]
  orientation?: 'portrait' | 'landscape'
  clientHeader?: { name: string; cnpj?: string; address?: string }
  // fileName: string // Removido
}

export function generatePdf({
  title,
  subtitle,
  headers,
  data,
  foot,
  orientation = 'portrait',
  clientHeader,
}: PdfOptions): ArrayBuffer {
  // Alterada a assinatura
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Cores da Identidade Visual (Dezem Transportes)
  const primaryColor: [number, number, number] = [132, 84, 0] // --primary
  const textColor: [number, number, number] = [28, 28, 26] // --on-surface
  const mutedColor: [number, number, number] = [116, 119, 117] // --outline
  const surfaceLow: [number, number, number] = [243, 243, 242] // --surface-container-low
  const separatorColor: [number, number, number] = [190, 190, 186] // --outline-variant (mais escuro)

  // Logo (Dezem Transportes) — canto superior direito de todo relatório
  const logoWidth = 28
  const logoHeight = logoWidth * DEZEM_LOGO_ASPECT_RATIO
  doc.addImage(DEZEM_LOGO_PNG_BASE64, 'PNG', pageWidth - 14 - logoWidth, 8, logoWidth, logoHeight)

  // Título
  doc.setFontSize(20)
  doc.setTextColor(...primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 22)

  let startY = 32

  // Subtítulo (Filtros)
  if (subtitle) {
    doc.setFontSize(9)
    doc.setTextColor(...mutedColor)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitle, 14, 30)
    startY = 38
  }

  // Cabeçalho de dados do cliente (opcional)
  if (clientHeader) {
    const parts = [
      `Cliente: ${clientHeader.name}`,
      clientHeader.cnpj ? `CNPJ: ${clientHeader.cnpj}` : null,
      clientHeader.address ? `Endereço: ${clientHeader.address}` : null,
    ].filter((part): part is string => !!part)

    doc.setFontSize(9)
    doc.setTextColor(...mutedColor)
    doc.setFont('helvetica', 'normal')
    doc.text(parts.join('  |  '), 14, startY - 2)
    startY += 5
  }

  // Tabela
  autoTable(doc, {
    startY: startY,
    head: [headers],
    body: data,
    foot: foot,
    showFoot: 'lastPage',
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7,
      textColor: textColor,
      cellPadding: { top: 0.6, bottom: 0.6, left: 1.2, right: 1.2 },
      lineColor: separatorColor,
      lineWidth: { top: 0.2, bottom: 0.2, left: 0.2, right: 0.2 },
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: surfaceLow,
    },
    footStyles: {
      fillColor: surfaceLow,
      textColor: primaryColor,
      fontStyle: 'bold',
      halign: 'left',
    },
    didParseCell: (hookData) => {
      const header = headers[hookData.column.index]?.toLowerCase() ?? ''
      if (hookData.section === 'body' && header.includes('descri')) {
        hookData.cell.styles.fontStyle = 'bold'
      }
    },
  })

  // doc.save(`${fileName}.pdf`) // Removido
  return doc.output('arraybuffer') // Adicionado
}
