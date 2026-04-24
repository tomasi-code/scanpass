/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  QrCode, 
  History, 
  Settings as SettingsIcon, 
  Plus, 
  Menu,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  LayoutDashboard,
  Ticket as TicketIcon,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { dataService } from './lib/dataService';
import { AppData, ViewState, Event, Ticket, ScanLog, AppSettings } from './types';
import EventsView from './components/EventsView';
import EventDetailView from './components/EventDetailView';
import ScannerView from './components/ScannerView';
import LogView from './components/LogView';
import SettingsView from './components/SettingsView';
import DashboardView from './components/DashboardView';
import LoginView from './components/LoginView';

// Extend types with ViewState
declare module './types' {
  export type ViewState = 'Dashboard' | 'Events' | 'Scanner' | 'Log' | 'Settings' | 'EventDetail';
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('Dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) refreshData();
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) refreshData();
      else setData(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshData = async () => {
    try {
      const appData = await dataService.getAppData();
      setData(appData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const updateData = async (newData: AppData) => {
    // Optimistic update
    const oldData = data;
    setData(newData);

    try {
      if (!oldData) return;

      // Identify what changed
      if (newData.events.length === 0 && oldData.events.length > 0) {
        await dataService.clearAll();
      } else {
        // Events
        if (newData.events.length > oldData.events.length) {
          const added = newData.events.find(e => !oldData.events.some(oe => oe.id === e.id));
          if (added) await dataService.updateEvent(added);
        } else if (newData.events.length < oldData.events.length) {
          const removed = oldData.events.find(e => !newData.events.some(ne => ne.id === e.id));
          if (removed) await dataService.deleteEvent(removed.id);
        } else {
          // Check for updates
          for (const e of newData.events) {
            const oe = oldData.events.find(prev => prev.id === e.id);
            if (oe && JSON.stringify(oe) !== JSON.stringify(e)) {
              await dataService.updateEvent(e);
            }
          }
        }
      }

      // Tickets
      if (newData.tickets.length > oldData.tickets.length) {
        const added = newData.tickets.find(t => !oldData.tickets.some(ot => ot.id === t.id));
        if (added) await dataService.updateTicket(added);
      } else if (newData.tickets.length < oldData.tickets.length) {
        const removed = oldData.tickets.find(t => !newData.tickets.some(nt => nt.id === t.id));
        if (removed) await dataService.deleteTicket(removed.id);
      } else {
        // Check for updates
        for (const t of newData.tickets) {
          const ot = oldData.tickets.find(prev => prev.id === t.id);
          if (ot && JSON.stringify(ot) !== JSON.stringify(t)) {
            await dataService.updateTicket(t);
          }
        }
      }

      // Scan Logs
      if (newData.scanLogs.length > oldData.scanLogs.length) {
        const added = newData.scanLogs.find(l => !oldData.scanLogs.some(ol => ol.id === l.id));
        if (added) await dataService.addScanLog(added);
      }

      // Settings
      if (JSON.stringify(newData.settings) !== JSON.stringify(oldData.settings)) {
        await dataService.updateSettings(newData.settings);
      }

      // Final sync check
      refreshData();
    } catch (error) {
      console.error('Failed to sync with Supabase:', error);
      setData(oldData); // Revert on failure
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 font-sans text-white">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="w-24 h-24 bg-rose-600 rounded-full flex items-center justify-center mx-auto border-4 border-white/10 shadow-[0_0_50px_rgba(225,29,72,0.3)]">
            <ShieldAlert size={48} />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">Config Required</h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide">
              Supabase environment variables are missing. Please configure them in the <span className="text-white font-bold italic">Settings</span> menu.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-lg text-left space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Required Variables</p>
            <ul className="space-y-2 font-mono text-xs">
              <li className="flex justify-between items-center bg-black/20 p-2 rounded">
                <span className="text-slate-500">VITE_SUPABASE_URL</span>
                <span className="text-rose-500 font-bold">MISSING</span>
              </li>
              <li className="flex justify-between items-center bg-black/20 p-2 rounded">
                <span className="text-slate-500">VITE_SUPABASE_ANON_KEY</span>
                <span className="text-rose-500 font-bold">MISSING</span>
              </li>
            </ul>
          </div>
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.5em]">System Halt // Waiting for environment sync</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#0f172a] text-white">
    <div className="flex flex-col items-center">
      <QrCode size={48} className="animate-pulse mb-4" />
      <span className="font-black uppercase tracking-[0.4em] text-xs">Initializing Session...</span>
    </div>
  </div>;

  if (!session) return <LoginView />;

  if (!data) return <div className="flex items-center justify-center h-screen bg-[#0f172a] text-white">
    <div className="flex flex-col items-center">
      <BarChart3 size={48} className="animate-spin mb-4" />
      <span className="font-black uppercase tracking-[0.4em] text-xs">Loading Secure Data...</span>
    </div>
  </div>;

  const navigateToEvent = (id: string) => {
    setSelectedEventId(id);
    setCurrentView('EventDetail');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-80' : 'w-24'} bg-[#0f172a] text-white flex flex-col transition-all duration-300 z-30`}
      >
        <div className="p-8 flex items-center gap-4 border-b border-white/5">
          <div className="w-12 h-12 bg-indigo-600 rounded flex items-center justify-center border-2 border-white/10 shadow-[4px_4px_0_rgba(99,102,241,0.3)]">
            <QrCode size={28} />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-tighter uppercase italic leading-none">{data.settings.appName}</span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mt-1">Operator Node</span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-6 space-y-4 overflow-y-auto">
          <SidebarItem 
            icon={<LayoutDashboard size={24} />} 
            label="Dashboard" 
            active={currentView === 'Dashboard'} 
            onClick={() => setCurrentView('Dashboard')}
            showLabel={isSidebarOpen}
          />
          <SidebarItem 
            icon={<Calendar size={24} />} 
            label="Events" 
            active={currentView === 'Events' || currentView === 'EventDetail'} 
            onClick={() => setCurrentView('Events')}
            showLabel={isSidebarOpen}
          />
          <SidebarItem 
            icon={<QrCode size={24} />} 
            label="Scanner" 
            active={currentView === 'Scanner'} 
            onClick={() => setCurrentView('Scanner')}
            showLabel={isSidebarOpen}
          />
          <SidebarItem 
            icon={<History size={24} />} 
            label="Scan Log" 
            active={currentView === 'Log'} 
            onClick={() => setCurrentView('Log')}
            showLabel={isSidebarOpen}
          />
          <SidebarItem 
            icon={<SettingsIcon size={24} />} 
            label="Settings" 
            active={currentView === 'Settings'} 
            onClick={() => setCurrentView('Settings')}
            showLabel={isSidebarOpen}
          />
        </nav>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-3 hover:bg-white/5 border-2 border-transparent hover:border-white/10 rounded transition-all"
          >
            <Menu size={24} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b-2 border-slate-900 flex items-center px-10 justify-between z-20">
          <div className="flex items-center gap-3 text-slate-400 text-xs font-black uppercase tracking-widest">
            <span className="hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => setCurrentView('Dashboard')}>{data.settings.appName}</span>
            <ChevronRight size={14} className="text-slate-200" />
            <span className="text-slate-900">{currentView}</span>
            {currentView === 'EventDetail' && selectedEventId && (
              <>
                <ChevronRight size={14} className="text-slate-200" />
                <span className="text-indigo-600">
                  {data.events.find(e => e.id === selectedEventId)?.name || 'Event'}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-6">
             <button title="Sign Out" onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-600 transition-all hover:scale-110">
               <LogOut size={22} />
             </button>
             <button className="p-2 text-slate-400 hover:text-indigo-600 transition-all hover:scale-110">
               <Search size={22} />
             </button>
             <div className="flex items-center gap-3">
               <div className="text-right hidden sm:block">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Status</p>
                 <p className="text-xs font-black uppercase text-emerald-500 mt-1">Live Connection</p>
               </div>
               <div className="w-10 h-10 rounded border-2 border-slate-900 bg-slate-100 flex items-center justify-center shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                 <span className="font-black text-slate-900 italic">AD</span>
               </div>
             </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-10 bg-[#f8fafc]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              {renderView(currentView, data, navigateToEvent, updateData, selectedEventId, setCurrentView)}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, showLabel }: { icon: any, label: string, active: boolean, onClick: () => void, showLabel: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex items-center gap-4 px-4 py-3.5 rounded transition-all group ${
        active 
          ? 'bg-indigo-600 text-white shadow-[4px_4px_0_rgba(255,255,255,0.1)]' 
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <div className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} transition-colors`}>
        {icon}
      </div>
      {showLabel && (
        <span className="text-xs font-black uppercase tracking-[0.2em]">
          {label}
        </span>
      )}
      {active && <div className="absolute left-[-24px] w-2 h-8 bg-indigo-600 rounded-r shadow-[2px_0_10px_rgba(79,70,229,0.5)]"></div>}
    </button>
  );
}

function renderView(
  view: ViewState, 
  data: AppData, 
  navigateToEvent: (id: string) => void, 
  updateData: (d: AppData) => void, 
  selectedEventId: string | null,
  onSetView: (v: ViewState) => void
) {
  switch (view) {
    case 'Dashboard':
      return <DashboardView 
        data={data} 
        onNavigateToEvent={navigateToEvent} 
        onSetView={onSetView}
      />;
    case 'Events':
      return <EventsView data={data} onNavigateToEvent={navigateToEvent} onUpdateData={updateData} />;
    case 'EventDetail':
      return selectedEventId ? <EventDetailView eventId={selectedEventId} data={data} onUpdateData={updateData} /> : <div>Event not found</div>;
    case 'Scanner':
      return <ScannerView data={data} onUpdateData={updateData} />;
    case 'Log':
      return <LogView data={data} />;
    case 'Settings':
      return <SettingsView data={data} onUpdateData={updateData} />;
    default:
      return <div>View not implemented</div>;
  }
}

