import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PdfOptions {
  title: string
  subtitle?: string
  headers: string[]
  data: (string | number)[][]
  fileName: string
}

export function generatePdf({ title, subtitle, headers, data, fileName }: PdfOptions) {
  const doc = new jsPDF()

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

  // Tabela
  autoTable(doc, {
    startY: startY,
    head: [headers],
    body: data,
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: textColor,
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
  })

  doc.save(`${fileName}.pdf`)
}
