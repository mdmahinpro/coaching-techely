import { Clock, Users, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface Batch {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  capacity: number;
  enrolled: number;
  fee: number;
  teacher?: string;
}

interface Props {
  batch: Batch;
  index?: number;
}

export function BatchCard({ batch, index = 0 }: Props) {
  const pct = Math.round((batch.enrolled / batch.capacity) * 100);
  const available = batch.capacity - batch.enrolled;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="card p-5 hover:border-sky-400/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white">{batch.name}</h3>
          <p className="text-sky-400 text-sm mt-0.5">{batch.subject}</p>
        </div>
        <span className={available > 5 ? 'badge-green' : available > 0 ? 'badge-yellow' : 'badge-red'}>
          {available > 0 ? `${available} seats` : 'Full'}
        </span>
      </div>

      <div className="space-y-2 text-sm text-slate-400 mb-4">
        <div className="flex items-center gap-2"><Clock size={14} /> {batch.schedule}</div>
        <div className="flex items-center gap-2"><Users size={14} /> {batch.enrolled}/{batch.capacity} enrolled</div>
        {batch.teacher && <div className="flex items-center gap-2"><BookOpen size={14} /> {batch.teacher}</div>}
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Capacity</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="font-inter font-bold text-white">৳{batch.fee.toLocaleString()}/mo</span>
        <a href="/admission" className="btn-primary text-xs py-1.5 px-4">Enroll</a>
      </div>
    </motion.div>
  );
}
