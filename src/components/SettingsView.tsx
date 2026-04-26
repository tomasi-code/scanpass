/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Save, Trash2, Smartphone, Ticket as TicketIcon, RotateCcw, AlertCircle } from 'lucide-react';
import { AppData, AppSettings } from '../types';

interface SettingsProps {
  data: AppData;
  onUpdateData: (newData: AppData) => Promise<void>;
}

export default function SettingsView({ data, onUpdateData }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>(data.settings);
  const [newType, setNewType] = useState('');

  const handleSave = () => {
    onUpdateData({ ...data, settings });
  };

  const clearAllData = () => {
    if (confirm('CRITICAL SYSTEM OVERRIDE: This will permanently delete ALL events, tickets, and scan logs. This action IS NOT REVERSIBLE. Proceed?')) {
      const resetData: AppData = {
        events: [],
        tickets: [],
        scanLogs: [],
        settings: settings
      };
      onUpdateData(resetData);
    }
  };

  const addType = () => {
    if (newType && !settings.defaultTicketTypes.includes(newType)) {
      setSettings({
        ...settings,
        defaultTicketTypes: [...settings.defaultTicketTypes, newType.toUpperCase()]
      });
      setNewType('');
    }
  };

  const removeType = (type: string) => {
    setSettings({
      ...settings,
      defaultTicketTypes: settings.defaultTicketTypes.filter(t => t !== type)
    });
  };

  return (
    <div className="max-w-4xl space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">Settings</h1>
          <p className="text-slate-500 mt-2 text-lg font-medium tracking-wide">Configure operational parameters and system state.</p>
        </div>
      </div>

      <div className="space-y-10">
        <section className="card p-10 border-2 border-slate-900 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3 mb-10 pb-4 border-b-2 border-slate-900/5">
            <div className="p-2 bg-indigo-600 rounded text-white"><Smartphone size={20} /></div>
            Core Parameters
          </h2>
          <div className="space-y-8">
            <div>
              <label className="stat-label mb-2">SYSTEM NAME</label>
              <input 
                type="text" 
                className="input-field border-2 border-slate-900 shadow-[4px_4px_0_rgba(0,0,0,0.05)]" 
                value={settings.appName}
                onChange={e => setSettings({ ...settings, appName: e.target.value })}
              />
              <p className="text-[10px] font-black italic text-slate-400 uppercase tracking-widest mt-2 px-1">Global identifier for the primary console.</p>
            </div>
            
            <div className="flex items-center justify-between p-8 bg-slate-50 border-2 border-slate-900 rounded shadow-[4px_4px_0_rgba(0,0,0,0.05)]">
               <div>
                  <p className="text-xl font-black uppercase tracking-tighter text-slate-900 italic">Redundancy / Multi-Scan</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Allow multiple check-ins recorded per authentication token.</p>
               </div>
               <button 
                  onClick={() => setSettings({ ...settings, allowMultipleScans: !settings.allowMultipleScans })}
                  className={`w-20 h-10 rounded border-2 border-slate-900 transition-all relative ${settings.allowMultipleScans ? 'bg-indigo-600' : 'bg-slate-300'}`}
               >
                  <div className={`absolute top-1 w-6 h-6 bg-white border-2 border-slate-900 transition-all ${settings.allowMultipleScans ? 'left-11' : 'left-1'}`}></div>
               </button>
            </div>
          </div>
        </section>

        <section className="card p-10 border-2 border-slate-900 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
           <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3 mb-10 pb-4 border-b-2 border-slate-900/5">
            <div className="p-2 bg-indigo-600 rounded text-white"><TicketIcon size={20} /></div>
            Schema Defaults
          </h2>
          <div className="space-y-8">
             <div>
                <label className="stat-label mb-2 text-xs">Whitelist: Ticket Types</label>
                <div className="flex flex-wrap gap-3 mb-6">
                    {settings.defaultTicketTypes.map(type => (
                      <div key={type} className="flex items-center gap-3 bg-white border-2 border-slate-900 text-slate-900 px-4 py-2 rounded font-black uppercase text-[10px] tracking-widest shadow-[3px_3px_0_rgba(0,0,0,0.1)]">
                        {type}
                        <button onClick={() => removeType(type)} className="text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    ))}
                </div>
                <div className="flex gap-4">
                    <input 
                      type="text" 
                      className="input-field border-2 border-slate-900" 
                      placeholder="ENTER NEW CATEGORY..." 
                      value={newType}
                      onChange={e => setNewType(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addType()}
                    />
                    <button 
                      onClick={addType}
                      className="px-8 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded hover:bg-indigo-600 transition-colors shadow-[4px_4px_0_rgba(0,0,0,0.1)]"
                    >
                      APPEND
                    </button>
                </div>
             </div>
          </div>
        </section>

        <section className="card p-10 border-2 border-rose-600/20 bg-rose-50/10 shadow-[10px_10px_0_rgba(225,29,72,0.05)]">
           <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3 mb-8 text-rose-600">
            <div className="p-2 bg-rose-600 rounded text-white"><RotateCcw size={20} /></div>
            TERMINAL OVERRIDE
          </h2>
          <div className="p-8 bg-white border-2 border-rose-500 shadow-[6px_6px_0_rgba(244,63,94,0.1)] rounded flex flex-col md:flex-row items-center gap-8 justify-between">
             <div className="flex items-start gap-5">
                <div className="p-4 bg-rose-50 rounded border-2 border-rose-100 text-rose-500">
                  <AlertCircle size={32} />
                </div>
                <div>
                  <p className="text-2xl font-black uppercase tracking-tighter text-slate-900 italic leading-none">Purge Local Memory</p>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-2">Zero-out all event partitions and ticket logs.</p>
                </div>
             </div>
             <button 
               onClick={clearAllData} 
               className="px-10 py-5 bg-rose-600 text-white font-black uppercase tracking-widest text-xs rounded shadow-[6px_6px_0_rgb(159,18,57)] hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-3"
             >
                <Trash2 size={20} />
                INITIATE PURGE
             </button>
          </div>
        </section>

        <div className="flex justify-end pt-12 pb-20">
          <button onClick={handleSave} className="btn-primary px-24 py-5 text-xl flex items-center gap-4 group">
            <Save size={24} className="group-hover:scale-110 transition-transform" />
            COMMIT STATE
          </button>
        </div>
      </div>
    </div>
  );
}
