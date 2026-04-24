/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Calendar, 
  Plus, 
  History, 
  QrCode, 
  Ticket as TicketIcon,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { AppData, ViewState } from '../types';

interface DashboardViewProps {
  data: AppData;
  onNavigateToEvent: (id: string) => void;
  onSetView: (v: ViewState) => void;
}

export default function DashboardView({ data, onNavigateToEvent, onSetView }: DashboardViewProps) {
  const totalEvents = data.events.length;
  const totalTickets = data.tickets.length;
  const scansToday = data.scanLogs.filter((l) => {
    const today = new Date().toDateString();
    return new Date(l.scanTime).toDateString() === today;
  }).length;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">Console</h1>
          <p className="text-slate-500 mt-2 text-lg font-medium tracking-wide">Command center for your event operations.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => onSetView('Events')} 
            className="btn-primary"
          >
            <Plus size={24} />
            Initialize Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard 
          icon={<Calendar className="text-white" size={28} />} 
          label="Active Folders" 
          value={totalEvents} 
          trend="+ current"
          className="bg-slate-900 text-white border-slate-900"
          iconBg="bg-indigo-600"
        />
        <StatCard 
          icon={<TicketIcon className="text-slate-900" size={28} />} 
          label="Total Attendees" 
          value={totalTickets} 
          trend="Lifetime"
        />
        <StatCard 
          icon={<TrendingUp className="text-emerald-600" size={28} />} 
          label="Door Scans" 
          value={scansToday} 
          subLabel="Today"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        <div className="xl:col-span-3 space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black uppercase tracking-tight">Main Terminal</h2>
            <div className="h-0.5 flex-1 bg-slate-900"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickActionButton 
              onClick={() => onSetView('Events')} 
              icon={<Plus size={24} />} 
              label="NEW EVENT" 
              description="CREATE NEW EVENT FOLDER" 
            />
            <QuickActionButton 
              onClick={() => onSetView('Scanner')} 
              icon={<QrCode size={24} />} 
              label="DOOR SCANNER" 
              description="LAUNCH TICKET VALIDATOR" 
              variant="indigo"
            />
            <QuickActionButton 
              onClick={() => onSetView('Events')} 
              icon={<Calendar size={24} />} 
              label="FOLDERS" 
              description="MANAGE EVENT ASSETS" 
            />
            <QuickActionButton 
              onClick={() => onSetView('Log')} 
              icon={<History size={24} />} 
              label="ACTIVITY LOG" 
              description="AUDIT SCAN RECORDS" 
            />
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
           <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black uppercase tracking-tight">Activity</h2>
            <div className="h-0.5 flex-1 bg-slate-900"></div>
          </div>
          <div className="card h-full min-h-[300px]">
            <div className="p-8">
              {data.scanLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300 text-center">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center mb-6">
                     <History size={32} className="opacity-20" />
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Idle State</h4>
                  <p className="text-xs font-bold mt-1 uppercase tracking-widest">Awaiting first check-in...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {data.scanLogs.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 border border-slate-100 rounded hover:border-indigo-200 transition-all group">
                      <div className={`mt-1 p-2 rounded-sm ${
                        log.result === 'granted' ? 'bg-emerald-500 text-white' : 
                        log.result === 'duplicate' ? 'bg-amber-500 text-white' : 
                        'bg-rose-500 text-white'
                      } shadow-[2px_2px_0_rgba(0,0,0,0.1)]`}>
                        {log.result === 'granted' ? <CheckCircle2 size={16} /> : 
                         log.result === 'duplicate' ? <AlertCircle size={16} /> : 
                         <XCircle size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-black text-slate-900 uppercase tracking-tighter truncate text-lg leading-tight group-hover:text-indigo-600 transition-colors">{log.attendeeName}</p>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 whitespace-nowrap">
                            {new Date(log.scanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">{log.eventName}</p>
                        <div className="flex items-center gap-2 mt-2">
                           <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${
                              log.result === 'granted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                              log.result === 'duplicate' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                              'bg-rose-50 text-rose-600 border-rose-100'
                           }`}>
                            {log.result}
                           </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {data.scanLogs.length > 5 && (
                    <button 
                      onClick={() => onSetView('Log')}
                      className="w-full py-4 text-xs font-black uppercase tracking-widest text-indigo-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group"
                    >
                      Audit Full Stream
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, subLabel, className = "", iconBg = "" }: any) {
  return (
    <div className={`card p-8 group border-2 border-slate-900 relative overflow-hidden shadow-[8px_8px_0_rgba(0,0,0,0.05)] ${className}`}>
      <div className="relative z-10">
        <div className={`w-16 h-16 ${iconBg || 'bg-slate-100'} rounded border-2 border-slate-900 flex items-center justify-center mb-6 shadow-[4px_4px_0_rgba(0,0,0,0.1)] group-hover:bg-indigo-50 group-hover:scale-105 transition-all duration-300`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-60 mb-1">{label}</p>
          <div className="flex items-end gap-3">
            <p className="text-6xl font-black italic tracking-tighter leading-none">{value}</p>
            {trend && <span className="text-xs font-black uppercase tracking-widest mb-1 opacity-40">{trend}</span>}
            {subLabel && <span className="text-xs font-black uppercase tracking-widest mb-1 opacity-40">{subLabel}</span>}
          </div>
        </div>
      </div>
      <div className="absolute -bottom-6 -right-6 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
        {icon}
      </div>
    </div>
  );
}

function QuickActionButton({ onClick, icon, label, description, variant = 'slate' }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-start p-8 border-2 border-slate-900 rounded-lg transition-all text-left group relative overflow-hidden w-full ${
        variant === 'indigo' ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-50'
      } shadow-[6px_6px_0_rgba(0,0,0,0.05)] hover:translate-x-1 hover:-translate-y-1 hover:shadow-[10px_10px_0_rgba(0,0,0,0.1)]`}
    >
      <div className={`p-4 rounded border-2 border-slate-900 mb-6 transition-colors shadow-[4px_4px_0_rgba(0,0,0,0.1)] ${
        variant === 'indigo' ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-900 group-hover:bg-white'
      }`}>
        {icon}
      </div>
      <p className="text-2xl font-black uppercase tracking-tighter italic leading-none">{label}</p>
      <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${variant === 'indigo' ? 'text-indigo-100' : 'text-slate-400'}`}>
        {description}
      </p>
      <div className="absolute -bottom-2 -right-2 opacity-10 group-hover:scale-125 transition-transform">
        {icon}
      </div>
    </button>
  );
}
