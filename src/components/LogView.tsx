/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Search, History, Filter, Download, CheckCircle2, XCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { AppData, ScanLog } from '../types';

interface LogViewProps {
  data: AppData;
}

export default function LogView({ data }: LogViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | ScanLog['result']>('all');

  const filteredLogs = data.scanLogs.filter(log => {
    const matchesSearch = log.attendeeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.ticketId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesResult = resultFilter === 'all' || log.result === resultFilter;
    return matchesSearch && matchesResult;
  });

  const exportCSV = () => {
    const headers = ['Scan ID', 'Ticket ID', 'Attendee', 'Event', 'Time', 'Result', 'Error'];
    const rows = data.scanLogs.map(l => [
      l.id,
      l.ticketId,
      l.attendeeName,
      l.eventName,
      new Date(l.scanTime).toLocaleString(),
      l.result,
      l.errorMessage || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `scanpass_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearLogs = () => {
    // This requires access to onUpdateData which isn't in props yet.
    // I will add it to props.
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">Security Log</h1>
          <p className="text-slate-500 mt-2 text-lg font-medium tracking-wide">Audit trail of all validation attempts.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
            <FileSpreadsheet size={18} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="card overflow-hidden border-2 border-slate-900 shadow-[8px_8px_0_rgba(0,0,0,0.05)]">
         <div className="p-6 border-b-2 border-slate-900 bg-slate-50 flex flex-col md:flex-row gap-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="PROBE DATA STREAM..." 
                className="input-field pl-12 border-2 border-slate-900 shadow-[4px_4px_0_rgba(0,0,0,0.05)] focus:translate-x-0.5 focus:translate-y-0.5"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex bg-white rounded border-2 border-slate-900 p-1">
              {(['all', 'granted', 'duplicate', 'invalid'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setResultFilter(r as any)}
                  className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${
                    resultFilter === r ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Time Dimension</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Identity Details</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Serial Code</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Validation State</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="text-lg font-black text-slate-900 leading-none italic uppercase">{new Date(log.scanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{new Date(log.scanTime).toLocaleDateString()}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xl font-black text-slate-900 uppercase tracking-tighter italic leading-none group-hover:text-indigo-600 transition-colors">{log.attendeeName}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">{log.eventName}</p>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col">
                         <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Fingerprint</span>
                         <span className="font-mono text-xs font-bold text-slate-900 bg-slate-50 border border-slate-100 px-2 py-1 rounded w-fit">{log.ticketId.split('-').pop()}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center">
                         {log.result === 'granted' ? (
                           <span className="flex items-center gap-2 px-4 py-2 rounded border-2 border-emerald-500 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest italic shadow-[3px_3px_0_rgba(16,185,129,0.2)]">
                             <CheckCircle2 size={14} /> Granted
                           </span>
                         ) : log.result === 'duplicate' ? (
                           <span className="flex items-center gap-2 px-4 py-2 rounded border-2 border-amber-500 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest italic shadow-[3px_3px_0_rgba(245,158,11,0.2)]" title={log.errorMessage}>
                             <AlertCircle size={14} /> Duplicate
                           </span>
                         ) : (
                           <span className="flex items-center gap-2 px-4 py-2 rounded border-2 border-rose-500 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest italic shadow-[3px_3px_0_rgba(244,63,94,0.2)]" title={log.errorMessage}>
                             <XCircle size={14} /> Denied
                           </span>
                         )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLogs.length === 0 && (
              <div className="p-24 text-center">
                 <History size={64} className="mx-auto text-slate-100 mb-6" />
                 <h3 className="text-xl font-black uppercase tracking-tighter italic text-slate-300">No activity markers detected</h3>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-200 mt-2">Buffer is currently empty</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
