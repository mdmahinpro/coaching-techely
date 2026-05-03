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
  const discount = r.discount ?? 0;
  const finalAmount = r.finalAmount ?? r.feeAmount;

  const methodIcon: Record<string, string> = {
    cash: '💵',
    bkash: '📱',
    nagad: '🟠',
  };
  const icon = methodIcon[r.paymentMethod?.toLowerCase() ?? ''] ?? '💳';

  const html = /* html */`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt ${r.receiptNo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', 'Noto Sans Bengali', sans-serif;
      background: #f0f4f8;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding: 32px 16px;
    }

    .receipt {
      width: 420px;
      background: #fff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #0b1120 0%, #0f1f3d 60%, #0369a1 100%);
      padding: 28px 28px 36px;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 160px; height: 160px;
      border-radius: 50%;
      background: rgba(56,189,248,0.12);
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -30px; left: 20px;
      width: 100px; height: 100px;
      border-radius: 50%;
      background: rgba(56,189,248,0.07);
    }
    .header-top {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 18px;
      position: relative;
      z-index: 1;
    }
    .logo-circle {
      width: 48px; height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, #38bdf8, #0ea5e9);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 14px rgba(56,189,248,0.4);
      flex-shrink: 0;
    }
    .inst-name {
      font-size: 17px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.3px;
      line-height: 1.2;
    }
    .inst-sub {
      font-size: 11px;
      color: rgba(255,255,255,0.55);
      margin-top: 3px;
      font-family: 'Noto Sans Bengali', sans-serif;
    }
    .receipt-badge {
      position: relative; z-index: 1;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(56,189,248,0.15);
      border: 1px solid rgba(56,189,248,0.3);
      border-radius: 100px;
      padding: 6px 14px;
      margin-bottom: 12px;
    }
    .receipt-badge span {
      font-size: 11px;
      font-weight: 600;
      color: #38bdf8;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    .receipt-badge-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #38bdf8;
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    .receipt-no-row {
      position: relative; z-index: 1;
      display: flex; align-items: flex-end; justify-content: space-between;
    }
    .receipt-no-label {
      font-size: 10px; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 2px;
    }
    .receipt-no-val {
      font-size: 15px; font-weight: 700; color: #fff; font-family: 'Inter', monospace; letter-spacing: 0.5px;
    }
    .receipt-date {
      text-align: right;
    }

    /* ── Curved divider ── */
    .curve {
      height: 28px;
      background: linear-gradient(135deg, #0b1120 0%, #0f1f3d 60%, #0369a1 100%);
      position: relative;
    }
    .curve::after {
      content: '';
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 28px;
      background: #fff;
      border-radius: 28px 28px 0 0;
    }

    /* ── Body ── */
    .body { padding: 20px 28px 28px; }

    /* ── Student card ── */
    .student-card {
      background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
      border: 1px solid #bae6fd;
      border-radius: 14px;
      padding: 14px 18px;
      display: flex; align-items: center; gap: 14px;
      margin-bottom: 20px;
    }
    .avatar {
      width: 44px; height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0ea5e9, #38bdf8);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 700; color: #fff;
      flex-shrink: 0;
    }
    .student-name {
      font-size: 15px; font-weight: 700; color: #0c1a2e;
      font-family: 'Noto Sans Bengali', 'Inter', sans-serif;
    }
    .student-meta {
      font-size: 12px; color: #0369a1; margin-top: 2px; font-weight: 500;
      font-family: 'Inter', monospace;
    }
    .student-batch {
      font-size: 11px; color: #64748b; margin-top: 1px;
      font-family: 'Noto Sans Bengali', sans-serif;
    }

    /* ── Info rows ── */
    .info-section { margin-bottom: 18px; }
    .info-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 9px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label {
      font-size: 12px; color: #94a3b8; font-weight: 500;
      display: flex; align-items: center; gap: 6px;
    }
    .info-label svg { opacity: 0.7; }
    .info-value {
      font-size: 13px; color: #1e293b; font-weight: 600;
      font-family: 'Noto Sans Bengali', 'Inter', sans-serif;
    }

    /* ── Amount box ── */
    .amount-box {
      background: linear-gradient(135deg, #0f172a, #1e3a5f);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
      position: relative;
      overflow: hidden;
    }
    .amount-box::before {
      content: '';
      position: absolute;
      top: -20px; right: -20px;
      width: 90px; height: 90px;
      border-radius: 50%;
      background: rgba(56,189,248,0.1);
    }
    .amount-title {
      font-size: 10px; color: rgba(255,255,255,0.5); text-transform: uppercase;
      letter-spacing: 0.8px; margin-bottom: 14px; position: relative; z-index: 1;
    }
    .amount-breakdown {
      display: flex; justify-content: space-between; gap: 10px;
      margin-bottom: 14px; position: relative; z-index: 1;
    }
    .amt-item { flex: 1; }
    .amt-item-label { font-size: 10px; color: rgba(255,255,255,0.45); margin-bottom: 4px; }
    .amt-item-val { font-size: 15px; font-weight: 700; }
    .amt-fee { color: #cbd5e1; }
    .amt-disc { color: #f87171; }
    .amt-divider {
      width: 1px; background: rgba(255,255,255,0.1); flex-shrink: 0; margin: 0 4px;
    }
    .total-row {
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(56,189,248,0.15);
      border: 1px solid rgba(56,189,248,0.25);
      border-radius: 10px;
      padding: 10px 14px;
      position: relative; z-index: 1;
    }
    .total-label { font-size: 12px; color: rgba(255,255,255,0.7); font-weight: 500; }
    .total-val { font-size: 22px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px; }

    /* ── Payment method chip ── */
    .payment-chip {
      display: inline-flex; align-items: center; gap: 8px;
      background: #f0fdf4; border: 1px solid #86efac;
      border-radius: 100px; padding: 6px 14px;
    }
    .payment-chip-label { font-size: 13px; font-weight: 600; color: #166534; text-transform: capitalize; }

    /* ── Footer ── */
    .footer {
      background: #f8fafc;
      border-top: 1px dashed #e2e8f0;
      padding: 16px 28px;
      text-align: center;
    }
    .footer-thanks {
      font-size: 13px; font-weight: 600; color: #0369a1;
      font-family: 'Noto Sans Bengali', 'Inter', sans-serif;
      margin-bottom: 4px;
    }
    .footer-sub {
      font-size: 10px; color: #94a3b8; letter-spacing: 0.3px;
    }
    .footer-sig {
      margin-top: 20px;
      display: flex; justify-content: space-between; align-items: flex-end;
    }
    .sig-line {
      width: 110px; border-top: 1.5px solid #cbd5e1; padding-top: 6px;
      font-size: 10px; color: #94a3b8; text-align: center;
    }
    .watermark {
      font-size: 9px; color: #cbd5e1; text-align: center; margin-top: 12px;
      letter-spacing: 0.3px;
    }

    /* ── Print media ── */
    @media print {
      body { background: #fff; padding: 0; }
      .receipt {
        box-shadow: none;
        border-radius: 0;
        width: 100%;
        max-width: 420px;
        margin: 0 auto;
      }
      .no-print { display: none !important; }
    }

    /* ── Print button (screen only) ── */
    .print-btn-wrap {
      text-align: center;
      padding: 20px 0 4px;
    }
    .print-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: linear-gradient(135deg, #0ea5e9, #38bdf8);
      color: #fff;
      border: none; cursor: pointer;
      border-radius: 12px;
      padding: 12px 32px;
      font-size: 14px; font-weight: 700;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 4px 14px rgba(14,165,233,0.35);
      transition: opacity 0.15s;
    }
    .print-btn:hover { opacity: 0.88; }
    .print-btn svg { width: 16px; height: 16px; }
  </style>
</head>
<body>
  <div>
    <!-- Print button (screen only) -->
    <div class="print-btn-wrap no-print">
      <button class="print-btn" onclick="window.print()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        Print / Save as PDF
      </button>
    </div>

    <div class="receipt">
      <!-- Header -->
      <div class="header">
        <div class="header-top">
          <div class="logo-circle">🎓</div>
          <div>
            <div class="inst-name">${escapeHtml(r.instituteName)}</div>
            ${r.instituteAddress ? `<div class="inst-sub">${escapeHtml(r.instituteAddress)}</div>` : ''}
            ${r.institutePhone ? `<div class="inst-sub">${escapeHtml(r.institutePhone)}</div>` : ''}
          </div>
        </div>
        <div class="receipt-badge">
          <div class="receipt-badge-dot"></div>
          <span>Fee Receipt &nbsp;·&nbsp; ফি রশিদ</span>
        </div>
        <div class="receipt-no-row">
          <div>
            <div class="receipt-no-label">Receipt Number</div>
            <div class="receipt-no-val">${escapeHtml(r.receiptNo)}</div>
          </div>
          <div class="receipt-date">
            <div class="receipt-no-label">Date</div>
            <div class="receipt-no-val" style="font-size:13px">${escapeHtml(r.date)}</div>
          </div>
        </div>
      </div>

      <!-- Curved divider -->
      <div class="curve"></div>

      <!-- Body -->
      <div class="body">

        <!-- Student card -->
        <div class="student-card">
          <div class="avatar">${escapeHtml(r.studentName.charAt(0).toUpperCase())}</div>
          <div>
            <div class="student-name">${escapeHtml(r.studentName)}</div>
            ${r.studentId ? `<div class="student-meta">${escapeHtml(r.studentId)}</div>` : ''}
            ${r.batchName ? `<div class="student-batch">${escapeHtml(r.batchName)}</div>` : ''}
          </div>
        </div>

        <!-- Info rows -->
        <div class="info-section">
          <div class="info-row">
            <span class="info-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Fee Month
            </span>
            <span class="info-value">${escapeHtml(r.month)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Payment Method
            </span>
            <div class="payment-chip">
              <span>${icon}</span>
              <span class="payment-chip-label">${escapeHtml(r.paymentMethod)}</span>
            </div>
          </div>
          ${r.transactionId ? `
          <div class="info-row">
            <span class="info-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              Transaction ID
            </span>
            <span class="info-value" style="font-family:monospace;font-size:12px;color:#0369a1">${escapeHtml(r.transactionId!)}</span>
          </div>` : ''}
        </div>

        <!-- Amount breakdown -->
        <div class="amount-box">
          <div class="amount-title">Payment Breakdown</div>
          <div class="amount-breakdown">
            <div class="amt-item">
              <div class="amt-item-label">Original Fee</div>
              <div class="amt-item-val amt-fee">৳${r.feeAmount.toLocaleString('en-IN')}</div>
            </div>
            ${discount > 0 ? `
            <div class="amt-divider"></div>
            <div class="amt-item">
              <div class="amt-item-label">Discount</div>
              <div class="amt-item-val amt-disc">−৳${discount.toLocaleString('en-IN')}</div>
            </div>` : ''}
          </div>
          <div class="total-row">
            <span class="total-label">Amount Paid &nbsp;·&nbsp; পরিশোধিত</span>
            <span class="total-val">৳${finalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-thanks">ধন্যবাদ আপনার পেমেন্টের জন্য 🎉</div>
        <div class="footer-sub">Thank you for your payment &nbsp;·&nbsp; Computer-generated receipt</div>
        <div class="footer-sig">
          <div class="sig-line">Student Signature</div>
          <div class="sig-line">Authorized By</div>
        </div>
        <div class="watermark">© ${new Date().getFullYear()} ${escapeHtml(r.instituteName)} &nbsp;·&nbsp; All rights reserved</div>
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 600);
    });
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=520,height=780,scrollbars=yes');
  if (!win) {
    alert('Popup blocked. Please allow popups for this site to print receipts.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
