import jsPDF from 'jspdf';
import { Empresa, Factura, Cliente, ItemFactura, Impuesto } from '../types';

interface ItemWithTax extends ItemFactura {
  impuestos: Impuesto | null;
}

export async function generateInvoicePDF(
  empresa: Empresa,
  factura: Factura,
  cliente: Cliente,
  items: ItemWithTax[]
): Promise<Blob> {
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL EMISOR', 15, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(empresa.nombre, 15, yPos);
  yPos += 5;
  if (empresa.cif) {
    doc.text(`CIF: ${empresa.cif}`, 15, yPos);
    yPos += 5;
  }
  if (empresa.direccion) {
    doc.text(empresa.direccion, 15, yPos);
    yPos += 5;
  }
  if (empresa.telefono) {
    doc.text(`Tel: ${empresa.telefono}`, 15, yPos);
    yPos += 5;
  }
  if (empresa.email) {
    doc.text(`Email: ${empresa.email}`, 15, yPos);
    yPos += 5;
  }

  yPos = 35;
  const rightX = pageWidth - 15;

  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA', rightX, yPos, { align: 'right' });
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nº: ${factura.numero}`, rightX, yPos, { align: 'right' });
  yPos += 5;
  doc.text(`Fecha: ${new Date(factura.fecha).toLocaleDateString('es-ES')}`, rightX, yPos, { align: 'right' });
  yPos += 5;
  doc.text(`Estado: ${factura.estado}`, rightX, yPos, { align: 'right' });

  yPos = Math.max(yPos, 70) + 10;

  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE', 15, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(cliente.nombre, 15, yPos);
  yPos += 5;
  if (cliente.cif) {
    doc.text(`CIF: ${cliente.cif}`, 15, yPos);
    yPos += 5;
  }
  if (cliente.direccion) {
    doc.text(cliente.direccion, 15, yPos);
    yPos += 5;
  }
  if (cliente.telefono) {
    doc.text(`Tel: ${cliente.telefono}`, 15, yPos);
    yPos += 5;
  }
  if (cliente.email) {
    doc.text(`Email: ${cliente.email}`, 15, yPos);
    yPos += 5;
  }

  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F');
  doc.text('Descripción', 17, yPos);
  doc.text('Cant.', 120, yPos, { align: 'right' });
  doc.text('Precio', 140, yPos, { align: 'right' });
  doc.text('IVA', 160, yPos, { align: 'right' });
  doc.text('Total', rightX - 2, yPos, { align: 'right' });
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  items.forEach((item) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    const taxName = item.impuestos ? `${item.impuestos.porcentaje}%` : '0%';

    doc.text(item.descripcion, 17, yPos);
    doc.text(item.cantidad.toString(), 120, yPos, { align: 'right' });
    doc.text(`${item.precio_unitario.toFixed(2)}€`, 140, yPos, { align: 'right' });
    doc.text(taxName, 160, yPos, { align: 'right' });
    doc.text(`${item.total.toFixed(2)}€`, rightX - 2, yPos, { align: 'right' });
    yPos += 6;

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Base: ${item.subtotal.toFixed(2)}€  |  IVA: ${item.total_impuesto.toFixed(2)}€`, 17, yPos);
    doc.setFontSize(10);
    doc.setTextColor(0);
    yPos += 8;
  });

  yPos += 5;
  doc.setLineWidth(0.5);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 8;

  const totalBoxX = pageWidth - 70;
  const totalBoxWidth = 55;

  doc.setFont('helvetica', 'normal');
  doc.text('Base Imponible:', totalBoxX, yPos);
  doc.text(`${factura.subtotal.toFixed(2)}€`, totalBoxX + totalBoxWidth, yPos, { align: 'right' });
  yPos += 6;

  doc.text('Total IVA:', totalBoxX, yPos);
  doc.text(`${factura.total_impuestos.toFixed(2)}€`, totalBoxX + totalBoxWidth, yPos, { align: 'right' });
  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', totalBoxX, yPos);
  doc.text(`${factura.total.toFixed(2)}€`, totalBoxX + totalBoxWidth, yPos, { align: 'right' });

  if (empresa.politica_proteccion_datos) {
    yPos += 15;
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const lines = doc.splitTextToSize(empresa.politica_proteccion_datos, pageWidth - 30);
    doc.text(lines, 15, yPos);
  }

  return doc.output('blob');
}
