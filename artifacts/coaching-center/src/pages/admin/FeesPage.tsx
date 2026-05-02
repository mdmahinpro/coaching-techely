import { useEffect, useState, useCallback, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/shared/Avatar';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, TrendingUp, AlertTriangle, FileText, Send,
  Search, Printer, RefreshCw, CheckCircle2, X, Loader2
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useSettingsStore } from '@/store/useSettingsStore';
import { sendSMS } from '@/lib/sms';
import { generateReceipt } from '@/lib/pdf';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const now = new Date();
const THIS_MONTH = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
const LAST_MONTH = `${MONTHS[now.getMonth() === 0 ? 11 : now.getMonth() - 1]} ${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}`;

type Tab = 'overview' | 'generate' | 'record' | 'due';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'generate', label: 'Generate Fees' },
  { id: 'record', label: 'Record Payment' },
  { id: 'due', label: 'Due Report' },
];

const generateReceiptNo = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `RCT-${d}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
};

const daysOverdue = (month: string): number => {
  try {
    const d = new Date(month + ' 01');
    d.setMonth(d.getMonth() + 1, 0);
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  } catch { return 0; }
};

// ── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const { settings } = useSettingsStore();
  const [payments, setPayments] = useState<any[]>([]); // display table (recent 20)
  const [feeStats, setFeeStats] = useState({ due: 0, collected: 0, pending: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      // Display table — joined, limited to 20 most recent
      supabase.from('fees')
        .select('*, student:students(name, student_id, photo_url), batch:batches(name)')
        .order('payment_date', { ascending: false })
        .limit(20),
      // Stats — all records, no join needed
      supabase.from('fees').select('amount, final_amount, status, month'),
    ]).then(([{ data: displayData }, { data: statsData }]) => {
      setPayments(displayData ?? []);
      const all = statsData ?? [];
      setFeeStats({
        due: all.filter(p => p.month === THIS_MONTH).reduce((s, p) => s + (p.amount ?? 0), 0),
        collected: all.filter(p => p.status === 'paid').reduce((s, p) => s + ((p.final_amount ?? p.amount) ?? 0), 0),
        pending: all.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount ?? 0), 0),
        overdue: all.filter(p => p.status === 'overdue').length,
      });
      setLoading(false);
    });
  }, []);

  const paid = payments.filter(p => p.status === 'paid');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'This Month Due', value: formatCurrency(feeStats.due), color: 'text-sky-400', icon: DollarSign },
          { label: 'Collected', value: formatCurrency(feeStats.collected), color: 'text-emerald-400', icon: TrendingUp },
          { label: 'Pending', value: formatCurrency(feeStats.pending), color: 'text-amber-400', icon: RefreshCw },
          { label: 'Overdue', value: feeStats.overdue, color: 'text-red-400', icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} className={s.color} />
              <span className="text-slate-500 text-xs">{s.label}</span>
            </div>
            <p className={`font-inter font-bold text-xl ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-navy-700/50">
          <h3 className="font-semibold text-white text-sm">Recent Payments</h3>
        </div>
        {loading ? (
          <div className="divide-y divide-navy-700/30">
            {Array.from({length:5}).map((_,i) => <div key={i} className="h-12 mx-4 my-2 bg-navy-700 rounded animate-pulse" />)}
          </div>
        ) : paid.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-10">No payments recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700/50">
                  {['Receipt #','Student','Month','Amount','Method','Date',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium whitespace-nowrap text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paid.slice(0, 20).map(p => {
                  const meta = (() => { try { return JSON.parse(p.note || '{}'); } catch { return {}; } })();
                  return (
                    <tr key={p.id} className="border-b border-navy-700/30 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-sky-400 text-xs">{meta.receipt_no || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={p.student?.name || '?'} size="sm" src={p.student?.photo_url} />
                          <span className="text-white text-sm">{p.student?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{p.month}</td>
                      <td className="px-4 py-3 font-medium text-emerald-400">{formatCurrency(meta.final_amount ?? p.amount ?? 0)}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm capitalize">{meta.payment_method || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{p.payment_date ? formatDate(p.payment_date) : '—'}</td>
                      <td className="px-4 py-3">
                        {meta.receipt_no && (
                          <button
                            onClick={() => generateReceipt({
                              receiptNo: meta.receipt_no,
                              date: p.payment_date ? formatDate(p.payment_date) : formatDate(new Date().toISOString()),
                              studentName: p.student?.name || '',
                              studentId: p.student?.student_id,
                              batchName: p.batch?.name,
                              month: p.month,
                              feeAmount: p.amount,
                              discount: meta.discount ?? 0,
                              finalAmount: meta.final_amount ?? p.amount,
                              paymentMethod: meta.payment_method || 'Cash',
                              transactionId: meta.transaction_id,
                              instituteName: settings.centerName,
                            })}
                            className="p-1.5 rounded-lg hover:bg-sky-500/15 text-slate-400 hover:text-sky-400 transition-colors"
                            title="Print Receipt"
                          >
                            <Printer size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Generate Fees Tab ─────────────────────────────────────────────────────────
function GenerateTab({ batches }: { batches: any[] }) {
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [batchId, setBatchId] = useState('all');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ created: number; skippedExisting: number; skippedSuspended: number } | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setResult(null);
    let q = supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active');
    if (batchId !== 'all') q = q.eq('batch_id', batchId);
    const { count } = await q;
    setPreviewCount(count ?? 0);
    setLoading(false);
  }, [batchId]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const handleGenerate = async () => {
    const monthStr = `${month} ${year}`;
    setGenerating(true);
    setResult(null);

    // Fetch students
    let sq = supabase.from('students').select('id, name, batch_id, status');
    if (batchId !== 'all') sq = sq.eq('batch_id', batchId);
    const { data: allStudents } = await sq;

    const suspended = (allStudents ?? []).filter(s => s.status === 'suspended');
    const active = (allStudents ?? []).filter(s => s.status === 'active');

    // Fetch existing fee records for this month
    let eq = supabase.from('fees').select('student_id').eq('month', monthStr);
    if (batchId !== 'all') eq = eq.eq('batch_id', batchId);
    const { data: existing } = await eq;
    const existingIds = new Set((existing ?? []).map(e => e.student_id));

    const toCreate = active.filter(s => !existingIds.has(s.id));

    // Get batch fee amounts — per-batch when generating for all batches
    const batchFeeMap: Record<string, number> = {};
    if (batchId !== 'all') {
      const { data: bd } = await supabase.from('batches').select('monthly_fee').eq('id', batchId).single();
      batchFeeMap[batchId] = bd?.monthly_fee ?? 1500;
    } else {
      const { data: batchData } = await supabase.from('batches').select('id, monthly_fee');
      (batchData ?? []).forEach(b => { batchFeeMap[b.id] = b.monthly_fee ?? 1500; });
    }

    let created = 0;
    if (toCreate.length > 0) {
      const due = new Date(`${monthStr} 01`);
      due.setDate(10); // due on 10th
      const { error } = await supabase.from('fees').insert(
        toCreate.map(s => ({
          student_id: s.id,
          batch_id: s.batch_id ?? null,
          amount: s.batch_id ? (batchFeeMap[s.batch_id] ?? 1500) : 1500,
          month: monthStr,
          status: 'pending',
          due_date: due.toISOString().slice(0, 10),
        }))
      );
      if (!error) created = toCreate.length;
      else { toast.error('Error creating fees: ' + error.message); setGenerating(false); return; }
    }

    setResult({
      created,
      skippedExisting: active.length - toCreate.length,
      skippedSuspended: suspended.length,
    });
    setGenerating(false);
    toast.success(`Generated ${created} fee records!`);
  };

  const years = Array.from({ length: 4 }, (_, i) => String(now.getFullYear() - 1 + i));

  return (
    <div className="max-w-lg space-y-5">
      <div className="card p-5 space-y-4">
        <h3 className="font-inter font-semibold text-white">Fee Generation Settings</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Month</label>
            <select value={month} onChange={e => setMonth(e.target.value)} className="input-field">
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Year</label>
            <select value={year} onChange={e => setYear(e.target.value)} className="input-field">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Batch</label>
          <select value={batchId} onChange={e => setBatchId(e.target.value)} className="input-field">
            <option value="all">All Batches</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Preview */}
      <div className="card p-4 border border-sky-400/15">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 size={15} className="animate-spin" /> Loading preview…
          </div>
        ) : (
          <div>
            <p className="text-white font-medium text-sm">
              <span className="text-sky-400 font-bold text-lg">{previewCount}</span> active students will get fee records
            </p>
            <p className="text-slate-500 text-xs mt-1">for <span className="text-white">{month} {year}</span></p>
            <p className="text-amber-400/80 text-xs mt-2">⚠ Suspended students are automatically skipped</p>
          </div>
        )}
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || loading}
        className="btn-primary w-full justify-center"
      >
        {generating ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><FileText size={15} /> Generate Fees for {month} {year}</>}
      </button>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-4 border border-emerald-400/20"
          >
            <p className="font-semibold text-white mb-3">Generation Complete</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">✅ Fee records created</span>
                <span className="text-emerald-400 font-bold">{result.created}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">⏭ Skipped (already exist)</span>
                <span className="text-amber-400 font-bold">{result.skippedExisting}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">🚫 Skipped (suspended)</span>
                <span className="text-red-400 font-bold">{result.skippedSuspended}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Record Payment Tab ────────────────────────────────────────────────────────
function RecordPaymentTab() {
  const { settings } = useSettingsStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [unpaidFees, setUnpaidFees] = useState<any[]>([]);
  const [selectedFee, setSelectedFee] = useState<any | null>(null);
  const [discount, setDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad'>('cash');
  const [transactionId, setTransactionId] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [sendSMSFlag, setSendSMSFlag] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<string | null>(null);
  const [savedData, setSavedData] = useState<any | null>(null);
  const dq = useDebounce(query, 250);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dq) { setResults([]); setShowDropdown(false); return; }
    supabase.from('students')
      .select('id, name, student_id, phone, photo_url, batch:batches(id,name)')
      .or(`name.ilike.%${dq}%,student_id.ilike.%${dq}%`)
      .eq('status', 'active')
      .limit(8)
      .then(({ data }) => { setResults(data ?? []); setShowDropdown(true); });
  }, [dq]);

  useEffect(() => {
    if (!selectedStudent) return;
    supabase.from('fees')
      .select('*, batch:batches(name)')
      .eq('student_id', selectedStudent.id)
      .neq('status', 'paid')
      .order('month', { ascending: false })
      .then(({ data }) => { setUnpaidFees(data ?? []); });
  }, [selectedStudent]);

  const finalAmount = Math.max(0, (selectedFee?.amount ?? 0) - discount);

  const handleSave = async () => {
    if (!selectedFee || !selectedStudent) return;
    setSaving(true);
    const receiptNo = generateReceiptNo();
    const meta = {
      receipt_no: receiptNo,
      payment_method: paymentMethod,
      transaction_id: transactionId,
      discount,
      discount_reason: discountReason,
      final_amount: finalAmount,
      received_by: receivedBy,
      notes,
    };

    const { error } = await supabase.from('fees').update({
      status: 'paid',
      payment_date: new Date().toISOString(),
      note: JSON.stringify(meta),
    }).eq('id', selectedFee.id);

    if (error) { toast.error('Payment failed: ' + error.message); setSaving(false); return; }

    // SMS
    if (sendSMSFlag && selectedStudent.phone) {
      const msg = `প্রিয় ${selectedStudent.name}, ৳${finalAmount} ফি গ্রহণ করা হয়েছে। রশিদ: ${receiptNo}। ধন্যবাদ - ${settings.centerName}`;
      await sendSMS(selectedStudent.phone, msg, 'FEE_PAID', settings.smsApiKey, settings.smsSenderId);
    }

    setSavedReceipt(receiptNo);
    setSavedData({ ...meta, studentName: selectedStudent.name, studentId: selectedStudent.student_id, batchName: selectedFee.batch?.name, month: selectedFee.month, feeAmount: selectedFee.amount });
    toast.success(`Payment recorded! Receipt: ${receiptNo}`);
    setSaving(false);

    // Reset for next payment
    setUnpaidFees(prev => prev.filter(f => f.id !== selectedFee.id));
    setSelectedFee(null);
    setDiscount(0);
    setDiscountReason('');
    setTransactionId('');
    setNotes('');
  };

  const printReceipt = () => {
    if (!savedData) return;
    generateReceipt({
      receiptNo: savedReceipt!,
      date: formatDate(new Date().toISOString()),
      studentName: savedData.studentName,
      studentId: savedData.studentId,
      batchName: savedData.batchName,
      month: savedData.month,
      feeAmount: savedData.feeAmount,
      discount: savedData.discount,
      finalAmount: savedData.final_amount,
      paymentMethod: savedData.payment_method,
      transactionId: savedData.transaction_id,
      instituteName: settings.centerName,
      instituteAddress: settings.centerAddress,
      institutePhone: settings.centerPhone,
    });
  };

  const PAYMENT_METHODS: { id: 'cash' | 'bkash' | 'nagad'; label: string; icon: string; sub?: string }[] = [
    { id: 'cash', label: 'Cash', icon: '💵' },
    { id: 'bkash', label: 'bKash', icon: '🅱️', sub: '01XXXXXXXXX' },
    { id: 'nagad', label: 'Nagad', icon: '🟠', sub: '01XXXXXXXXX' },
  ];

  return (
    <div className="max-w-xl space-y-5">
      {/* Student search */}
      <div>
        <label className="text-xs text-slate-400 mb-1.5 block">Search Student</label>
        <div className="relative" ref={dropRef}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedStudent(null); setSelectedFee(null); setSavedReceipt(null); }}
            className="input-field pl-9"
            placeholder="Name or Student ID…"
          />
          <AnimatePresence>
            {showDropdown && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 right-0 mt-1 card-glass border border-navy-600 z-20 max-h-52 overflow-y-auto"
              >
                {results.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedStudent(s); setQuery(s.name); setShowDropdown(false); setSavedReceipt(null); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <Avatar name={s.name} size="sm" src={s.photo_url} />
                    <div>
                      <p className="text-white text-sm font-medium">{s.name}</p>
                      <p className="font-mono text-sky-400 text-xs">{s.student_id}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {selectedStudent && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="space-y-4">
            {/* Student card */}
            <div className="card p-4 flex items-center gap-4">
              <Avatar name={selectedStudent.name} size="md" src={selectedStudent.photo_url} />
              <div>
                <p className="font-semibold text-white">{selectedStudent.name}</p>
                <p className="font-mono text-sky-400 text-xs">{selectedStudent.student_id}</p>
                <p className="text-slate-400 text-xs">{selectedStudent.batch?.name}</p>
              </div>
            </div>

            {/* Unpaid fee selector */}
            {unpaidFees.length === 0 ? (
              <div className="card p-4 text-center">
                <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No pending fees for this student</p>
              </div>
            ) : (
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Select Fee Record</label>
                <div className="space-y-2">
                  {unpaidFees.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFee(f)}
                      className={cn(
                        'w-full card p-3 flex items-center justify-between border-2 transition-all text-left',
                        selectedFee?.id === f.id ? 'border-sky-400/60 bg-sky-400/5' : 'border-transparent hover:border-white/10'
                      )}
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{f.month}</p>
                        <p className="text-slate-500 text-xs">{f.batch?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-inter font-bold text-white">{formatCurrency(f.amount)}</p>
                        <span className={f.status === 'overdue' ? 'badge-red text-xs' : 'badge-yellow text-xs'}>{f.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment form */}
            {selectedFee && (
              <div className="space-y-4">
                {/* Discount */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Discount ৳</label>
                    <input
                      type="number"
                      min={0}
                      max={selectedFee.amount}
                      value={discount}
                      onChange={e => setDiscount(Number(e.target.value))}
                      className="input-field"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Reason</label>
                    <input value={discountReason} onChange={e => setDiscountReason(e.target.value)} className="input-field" placeholder="Optional" />
                  </div>
                </div>

                {/* Final amount preview */}
                <div className="card p-3 flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Final Amount</span>
                  <span className="font-inter font-black text-emerald-400 text-xl">{formatCurrency(finalAmount)}</span>
                </div>

                {/* Payment method */}
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={cn(
                          'card p-3 flex flex-col items-center gap-1 border-2 transition-all',
                          paymentMethod === m.id ? 'border-sky-400/60 bg-sky-400/5' : 'border-transparent hover:border-white/10'
                        )}
                      >
                        <span className="text-xl">{m.icon}</span>
                        <span className="text-xs font-medium text-white">{m.label}</span>
                        {m.sub && <span className="text-[10px] text-slate-500">{m.sub}</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transaction ID (bKash/Nagad) */}
                {paymentMethod !== 'cash' && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Transaction ID</label>
                    <input value={transactionId} onChange={e => setTransactionId(e.target.value)} className="input-field font-mono" placeholder="TRXXXXXXXXXXXXXXXID" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Received By</label>
                    <input value={receivedBy} onChange={e => setReceivedBy(e.target.value)} className="input-field" placeholder="Staff name" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Notes</label>
                    <input value={notes} onChange={e => setNotes(e.target.value)} className="input-field" placeholder="Optional" />
                  </div>
                </div>

                {/* SMS checkbox */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={sendSMSFlag} onChange={e => setSendSMSFlag(e.target.checked)} className="rounded accent-sky-400 w-4 h-4" />
                  <span className="text-slate-400 text-sm">Send payment confirmation SMS</span>
                </label>

                <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center">
                  {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><CheckCircle2 size={15} /> Record Payment</>}
                </button>
              </div>
            )}

            {/* Receipt success */}
            {savedReceipt && savedData && (
              <motion.div initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }} className="card p-4 border border-emerald-400/20 text-center">
                <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-white font-semibold mb-1">Payment Recorded!</p>
                <p className="font-mono text-sky-400 text-sm mb-3">{savedReceipt}</p>
                <button onClick={printReceipt} className="btn-outline justify-center w-full">
                  <Printer size={15} /> Print Receipt (PDF)
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Due Report Tab ────────────────────────────────────────────────────────────
function DueReportTab({ batches }: { batches: any[] }) {
  const { settings } = useSettingsStore();
  type DueFilter = 'this_month' | 'last_month' | 'overdue_2' | string;
  const [filter, setFilter] = useState<DueFilter>('this_month');
  const [batchFilter, setBatchFilter] = useState('all');
  const [dues, setDues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('fees')
      .select('*, student:students(id, name, student_id, phone, photo_url), batch:batches(name)')
      .neq('status', 'paid')
      .order('month', { ascending: true });

    if (filter === 'this_month') q = q.eq('month', THIS_MONTH);
    else if (filter === 'last_month') q = q.eq('month', LAST_MONTH);
    else if (filter === 'overdue_2') {
      // months older than 2 months
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 2);
      q = q.lt('due_date', cutoff.toISOString().slice(0, 10));
    }
    if (batchFilter !== 'all') q = q.eq('batch_id', batchFilter);

    const { data } = await q.limit(100);
    setDues(data ?? []);
    setLoading(false);
  }, [filter, batchFilter]);

  useEffect(() => { load(); }, [load]);

  const sendReminder = async (fee: any) => {
    if (!fee.student?.phone) { toast.error('No phone number'); return; }
    setSending(fee.id);
    const msg = `প্রিয় ${fee.student.name}, ${fee.month} মাসের ৳${fee.amount} ফি বাকি আছে। দয়া করে পরিশোধ করুন। - ${settings.centerName}`;
    const res = await sendSMS(fee.student.phone, msg, 'FEE_REMINDER', settings.smsApiKey, settings.smsSenderId);
    toast.success(`SMS ${res.sent > 0 ? 'sent' : 'queued'} to ${fee.student.name}`);
    setSending(null);
  };

  const sendBulkSMS = async () => {
    const targets = dues.filter(f => selected.has(f.id) && f.student?.phone);
    if (!targets.length) return;
    setBulkSending(true);
    for (const fee of targets) {
      const msg = `প্রিয় ${fee.student.name}, ${fee.month} মাসের ৳${fee.amount} ফি বাকি আছে। দয়া করে পরিশোধ করুন। - ${settings.centerName}`;
      await sendSMS(fee.student.phone, msg, 'FEE_REMINDER', settings.smsApiKey, settings.smsSenderId);
    }
    toast.success(`SMS sent to ${targets.length} students`);
    setBulkSending(false);
    setSelected(new Set());
  };

  const toggleAll = () => {
    if (selected.size === dues.length) setSelected(new Set());
    else setSelected(new Set(dues.map(f => f.id)));
  };

  const DUE_FILTERS: { id: DueFilter; label: string }[] = [
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'overdue_2', label: '2+ Months Overdue' },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {DUE_FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`filter-pill ${filter === f.id ? 'active' : ''}`}>{f.label}</button>
        ))}
        <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)} className="input-field py-1.5 text-sm max-w-[160px]">
          <option value="all">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {selected.size > 0 && (
          <button onClick={sendBulkSMS} disabled={bulkSending} className="btn-primary text-sm py-1.5 ml-auto">
            {bulkSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send SMS to {selected.size} selected
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-navy-700/30">
            {Array.from({length:5}).map((_,i) => <div key={i} className="h-12 mx-4 my-2 bg-navy-700 rounded animate-pulse" />)}
          </div>
        ) : dues.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-10">No dues found for this filter</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700/50">
                  <th className="px-4 py-3 w-8"><input type="checkbox" className="rounded accent-sky-400" onChange={toggleAll} checked={selected.size === dues.length && dues.length > 0} /></th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Student ID</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Name</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Batch</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Month</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Amount</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Days Overdue</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Phone</th>
                  <th className="px-4 py-3 text-slate-400 font-medium text-xs">SMS</th>
                </tr>
              </thead>
              <tbody>
                {dues.map(f => {
                  const days = daysOverdue(f.month);
                  return (
                    <tr key={f.id} className="border-b border-navy-700/30 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="rounded accent-sky-400"
                          checked={selected.has(f.id)}
                          onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(f.id) : n.delete(f.id); return n; })}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-sky-400 text-xs">{f.student?.student_id || '—'}</td>
                      <td className="px-4 py-3 text-white text-sm">{f.student?.name || '—'}</td>
                      <td className="px-4 py-3"><span className="badge-blue text-xs">{f.batch?.name || '—'}</span></td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{f.month}</td>
                      <td className="px-4 py-3 font-medium text-red-400">{formatCurrency(f.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('font-medium text-sm', days > 30 ? 'text-red-400' : days > 10 ? 'text-amber-400' : 'text-slate-400')}>{days}d</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-sm">{f.student?.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => sendReminder(f)}
                          disabled={sending === f.id || !f.student?.phone}
                          className="p-1.5 rounded-lg hover:bg-sky-500/15 text-slate-400 hover:text-sky-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Send SMS Reminder"
                        >
                          {sending === f.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FeesPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('batches').select('id,name,monthly_fee').eq('is_active', true)
      .then(({ data }) => setBatches(data ?? []));
  }, []);

  return (
    <AdminLayout title="ফি ব্যবস্থাপনা">
      {/* Tabs */}
      <div className="flex border-b border-navy-700/50 mb-6 gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
              tab === t.id ? 'text-sky-400 border-sky-400' : 'text-slate-400 border-transparent hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'generate' && <GenerateTab batches={batches} />}
      {tab === 'record' && <RecordPaymentTab />}
      {tab === 'due' && <DueReportTab batches={batches} />}
    </AdminLayout>
  );
}
