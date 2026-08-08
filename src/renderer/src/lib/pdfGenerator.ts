import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

  // Cores da Identidade Visual (Dezem Transportes)
  const primaryColor: [number, number, number] = [132, 84, 0] // --primary
  const textColor: [number, number, number] = [28, 28, 26] // --on-surface
  const mutedColor: [number, number, number] = [116, 119, 117] // --outline
  const surfaceLow: [number, number, number] = [243, 243, 242] // --surface-container-low

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
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: textColor,
      cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
      lineColor: surfaceLow,
      lineWidth: 0.1,
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
  })

  // doc.save(`${fileName}.pdf`) // Removido
  return doc.output('arraybuffer') // Adicionado
}
