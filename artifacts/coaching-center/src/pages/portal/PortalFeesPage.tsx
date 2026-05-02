import { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { supabase } from '@/lib/supabase';
import { useStudentStore } from '@/store/useStudentStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertCircle, Receipt, Smartphone, ExternalLink, DollarSign, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface Fee {
  id: string;
  student_id: string;
  month: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'waived';
  payment_date?: string;
  note?: string;
}

export default function PortalFeesPage() {
  const { student } = useStudentStore();
  const { settings } = useSettingsStore();
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    supabase.from('fees').select('*').eq('student_id', student.id)
      .order('month', { ascending: false })
      .then(({ data }) => { setFees((data ?? []) as Fee[]); setLoading(false); });
  }, [student]);

  const paid = fees.filter(f => f.status === 'paid');
  const pending = fees.filter(f => f.status === 'pending' || f.status === 'overdue');
  const totalPaid = paid.reduce((s, f) => s + f.amount, 0);
  const totalPending = pending.reduce((s, f) => s + f.amount, 0);

  const parseNote = (note?: string) => {
    if (!note) return {};
    try { return JSON.parse(note); } catch { return {}; }
  };

  const downloadReceipt = (fee: Fee) => {
    const note = parseNote(fee.note);
    const doc = new jsPDF({ format: 'a5', unit: 'mm' });
    doc.setFillColor(11, 17, 32); doc.rect(0, 0, 148, 210, 'F');
    doc.setTextColor(248, 250, 252);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text(settings.centerName, 74, 25, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('FEE RECEIPT', 74, 33, { align: 'center' });
    doc.setDrawColor(30, 41, 59); doc.line(15, 38, 133, 38);
    const rows = [
      ['Receipt No', note.receipt_no ?? fee.id.slice(-8).toUpperCase()],
      ['Student', student?.name ?? ''],
      ['Student ID', student?.student_id ?? ''],
      ['Month', fee.month],
      ['Amount', formatCurrency(note.final_amount ?? fee.amount)],
      ['Method', note.payment_method ?? 'Cash'],
      ['Date', fee.payment_date ? formatDate(fee.payment_date) : ''],
    ];
    let y = 50;
    rows.forEach(([k, v]) => {
      doc.setTextColor(100, 116, 139); doc.setFontSize(8); doc.text(k, 18, y);
      doc.setTextColor(248, 250, 252); doc.setFontSize(9); doc.text(String(v), 70, y);
      y += 10;
    });
    doc.setDrawColor(30, 41, 59); doc.line(15, y + 2, 133, y + 2);
    doc.setTextColor(56, 189, 248); doc.setFontSize(8);
    doc.text('PAID ✓', 74, y + 12, { align: 'center' });
    doc.save(`receipt_${fee.month}_${student?.student_id}.pdf`);
  };

  const FeeCard = ({ fee }: { fee: Fee }) => {
    const note = parseNote(fee.note);
    const isPaid = fee.status === 'paid';
    const isOverdue = fee.status === 'overdue';
    const isWaived = fee.status === 'waived';

    return (
      <div className={cn('card p-4 border-l-4 transition-all',
        isPaid ? 'border-l-emerald-400' : isOverdue ? 'border-l-red-400' : isWaived ? 'border-l-slate-500' : 'border-l-amber-400')}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn('p-2 rounded-xl shrink-0 mt-0.5',
              isPaid ? 'bg-emerald-400/10' : isOverdue ? 'bg-red-400/10' : isWaived ? 'bg-white/5' : 'bg-amber-400/10')}>
              {isPaid ? <CheckCircle2 size={16} className="text-emerald-400" /> :
               isOverdue ? <AlertCircle size={16} className="text-red-400" /> :
               isWaived ? <DollarSign size={16} className="text-slate-500" /> :
               <Clock size={16} className="text-amber-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-semibold text-white font-hind">{fee.month}</h3>
                <span className={cn('text-xs',
                  isPaid ? 'badge-green' : isOverdue ? 'badge-red' : isWaived ? 'text-slate-400 bg-white/5 px-2 py-0.5 rounded-full' : 'badge-yellow')}>
                  {isPaid ? 'পরিশোধিত' : isOverdue ? 'বকেয়া' : isWaived ? 'মওকুফ' : 'অপরিশোধিত'}
                </span>
              </div>
              <p className="font-inter font-bold text-white">{formatCurrency(note.final_amount ?? fee.amount)}</p>
              {isPaid && fee.payment_date && (
                <p className="text-slate-500 text-xs mt-0.5 font-hind">পরিশোধ: {formatDate(fee.payment_date)}</p>
              )}
              {!isPaid && !isWaived && (
                <div className="mt-3 space-y-2">
                  <p className="text-slate-400 text-xs font-semibold">পেমেন্ট করতে:</p>
                  <div className="flex flex-wrap gap-2">
                    {settings.bkashNumber && (
                      <a href={`https://pay.bkash.com/?app-id=bkash-pay&v=1.2.0-beta&send-money=${settings.bkashNumber}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/15 border border-pink-500/20 text-pink-400 text-xs hover:bg-pink-500/25 transition-all">
                        <Smartphone size={11} /> bKash: {settings.bkashNumber} <ExternalLink size={10} />
                      </a>
                    )}
                    {settings.nagadNumber && (
                      <a href={`https://nagad.com.bd/send-money/${settings.nagadNumber}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/20 text-orange-400 text-xs hover:bg-orange-500/25 transition-all">
                        <Smartphone size={11} /> Nagad: {settings.nagadNumber} <ExternalLink size={10} />
                      </a>
                    )}
                    {settings.centerWhatsapp && (
                      <a href={`https://wa.me/${settings.centerWhatsapp.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/25 transition-all">
                        WhatsApp <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {isPaid && (
            <button onClick={() => downloadReceipt(fee)}
              className="btn-outline text-xs py-1.5 px-3 shrink-0">
              <Receipt size={12} /> Receipt
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <PortalLayout>
      <h1 className="font-inter font-bold text-xl text-white mb-5 font-hind">ফি রেকর্ড</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'মোট পরিশোধ', value: formatCurrency(totalPaid), color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: 'বকেয়া', value: formatCurrency(totalPending), color: 'text-amber-400', bg: 'bg-amber-400/10' },
          { label: 'মোট', value: fees.length, color: 'text-sky-400', bg: 'bg-sky-400/10' },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <p className={cn('font-inter font-bold text-lg', s.color)}>{s.value}</p>
            <p className="text-slate-500 text-xs font-hind">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-sky-400" /></div>
      ) : fees.length === 0 ? (
        <div className="card p-12 text-center"><p className="text-slate-500 font-hind">কোনো ফি রেকর্ড নেই</p></div>
      ) : (
        <div className="space-y-3">
          {fees.map(f => <FeeCard key={f.id} fee={f} />)}
        </div>
      )}
    </PortalLayout>
  );
}
