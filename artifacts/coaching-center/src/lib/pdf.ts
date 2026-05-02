import jsPDF from 'jspdf';

export interface ReceiptData {
  receiptNo: string;
  date: string;
  studentName: string;
  studentId?: string;
  batchName?: string;
  month: string;
  feeAmount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: string;
  transactionId?: string;
  instituteName: string;
  instituteAddress?: string;
  institutePhone?: string;
}

export function generateReceipt(r: ReceiptData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
  const w = 148;
  let y = 14;

  const line = (y2: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.line(12, y2, w - 12, y2);
  };
  const bold = (size = 11) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(size); };
  const normal = (size = 10) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(size); };

  // Header
  bold(14);
  doc.setTextColor(11, 17, 32);
  doc.text(r.instituteName, w / 2, y, { align: 'center' });
  y += 6;
  normal(9);
  doc.setTextColor(100, 116, 139);
  if (r.instituteAddress) { doc.text(r.instituteAddress, w / 2, y, { align: 'center' }); y += 5; }
  if (r.institutePhone) { doc.text(r.institutePhone, w / 2, y, { align: 'center' }); y += 5; }

  y += 2;
  line(y); y += 6;

  // Title
  bold(13);
  doc.setTextColor(14, 165, 233); // sky-500
  doc.text('FEE RECEIPT / \u09AB\u09BF \u09B0\u09B6\u09BF\u09A6', w / 2, y, { align: 'center' });
  y += 8;
  line(y); y += 7;

  // Receipt info
  const kv = (label: string, value: string) => {
    normal(10);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 14, y);
    bold(10);
    doc.setTextColor(15, 23, 42);
    doc.text(value, w - 14, y, { align: 'right' });
    y += 6;
  };

  kv('Receipt No:', r.receiptNo);
  kv('Date:', r.date);
  kv('Student Name:', r.studentName);
  if (r.studentId) kv('Student ID:', r.studentId);
  if (r.batchName) kv('Batch:', r.batchName);
  kv('Month:', r.month);

  y += 2;
  line(y); y += 7;

  // Amount table
  bold(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Fee', 14, y);
  doc.text('Discount', w / 2, y, { align: 'center' });
  doc.text('Final Amount', w - 14, y, { align: 'right' });
  y += 5;

  bold(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`\u09F3${r.feeAmount.toLocaleString()}`, 14, y);
  doc.setTextColor(239, 68, 68);
  doc.text(`-\u09F3${r.discount.toLocaleString()}`, w / 2, y, { align: 'center' });
  doc.setTextColor(52, 211, 153);
  doc.text(`\u09F3${r.finalAmount.toLocaleString()}`, w - 14, y, { align: 'right' });
  y += 8;

  line(y); y += 7;

  // Payment info
  kv('Payment Method:', r.paymentMethod);
  if (r.transactionId) kv('Transaction ID:', r.transactionId);

  y += 4;
  line(y); y += 8;

  // Footer
  normal(9);
  doc.setTextColor(100, 116, 139);
  doc.text('ধন্যবাদ / Thank you for your payment.', w / 2, y, { align: 'center' });
  y += 5;
  doc.text('This is a computer-generated receipt.', w / 2, y, { align: 'center' });

  doc.save(`receipt-${r.receiptNo}.pdf`);
}
