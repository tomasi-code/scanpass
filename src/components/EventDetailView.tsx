/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Download, 
  Printer, 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Mail,
  User,
  Ticket as TicketIcon,
  Tag,
  FileSpreadsheet,
  QrCode,
  Trash2,
  Layers
} from 'lucide-react';
import { AppData, Ticket, Event, TicketType, TicketStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface EventDetailViewProps {
  eventId: string;
  data: AppData;
  onUpdateData: (newData: AppData) => void;
}

export default function EventDetailView({ eventId, data, onUpdateData }: EventDetailViewProps) {
  const event = data.events.find(e => e.id === eventId);
  const tickets = data.tickets.filter(t => t.eventId === eventId);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showTicketCard, setShowTicketCard] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');

  if (!event) return <div>Event not found</div>;

  const scanned = tickets.filter(t => t.scanCount > 0).length;
  const scanRate = tickets.length > 0 ? (scanned / tickets.length) * 100 : 0;

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.attendeeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.attendeeEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    const headers = ['Ticket ID', 'Attendee Name', 'Email', 'Type', 'Status', 'Issued Date', 'Scan Count', 'Last Scanned'];
    const rows = tickets.map(t => [
      t.id,
      t.attendeeName,
      t.attendeeEmail,
      t.ticketType,
      t.status,
      new Date(t.issuedAt).toLocaleString(),
      t.scanCount,
      t.lastScannedAt ? new Date(t.lastScannedAt).toLocaleString() : 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${event.name.replace(/\s+/g, '_')}_tickets.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRevoke = (ticketId: string) => {
    if (confirm('Are you sure you want to revoke this ticket? It will no longer be valid for scanning.')) {
      const newData = {
        ...data,
        tickets: data.tickets.map(t => t.id === ticketId ? { ...t, status: 'Revoked' as TicketStatus } : t)
      };
      onUpdateData(newData);
    }
  };

  const handleDeleteTicket = (ticketId: string) => {
    if (confirm('Delete this attendee ticket permanently?')) {
      const newData = {
        ...data,
        tickets: data.tickets.filter(t => t.id !== ticketId)
      };
      onUpdateData(newData);
    }
  };

  return (
    <div className="space-y-8">
      {/* Event Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6 bg-indigo-600 text-white">
          <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Total Issued</p>
          <p className="text-4xl font-black mt-1">{tickets.length}</p>
        </div>
        <div className="card p-6">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Scanned</p>
          <p className="text-4xl font-black mt-1 text-emerald-500">{scanned}</p>
        </div>
        <div className="card p-6">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Scan Rate</p>
          <p className="text-4xl font-black mt-1 text-indigo-600">{Math.round(scanRate)}%</p>
        </div>
        <div className="card p-6">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Capacity</p>
          <p className="text-4xl font-black mt-1 text-slate-900">{tickets.length} / {event.maxCapacity}</p>
        </div>
      </div>

      {/* Tickets List Area */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            <TicketIcon size={24} className="text-indigo-600" />
            Attendees
          </h2>
          <div className="flex items-center gap-3">
             <button onClick={exportCSV} className="btn-secondary">
               <FileSpreadsheet size={18} />
               CSV
             </button>
             <button onClick={() => setShowBulkModal(true)} className="btn-secondary">
               <Layers size={18} />
               Bulk
             </button>
             <button onClick={() => setShowTicketModal(true)} className="btn-primary" disabled={tickets.length >= event.maxCapacity}>
               <Plus size={20} />
               Add Attendee
             </button>
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search attendees..." 
                className="input-field pl-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className="input-field w-auto text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Scanned">Scanned</option>
              <option value="Revoked">Revoked</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Attendee</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Ticket</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Scans</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm">
                      <p className="font-black uppercase tracking-tight text-slate-900">{ticket.attendeeName}</p>
                      <p className="text-slate-500 font-medium">{ticket.attendeeEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          ticket.ticketType === 'VIP' ? 'bg-amber-100 text-amber-700' :
                          ticket.ticketType === 'Staff' ? 'bg-slate-100 text-slate-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>
                          {ticket.ticketType}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{ticket.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-black uppercase tracking-tight ${
                        ticket.status === 'Active' ? 'bg-indigo-50 text-indigo-600' :
                        ticket.status === 'Scanned' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black">{ticket.scanCount}</p>
                      {ticket.lastScannedAt && (
                        <p className="text-[10px] text-slate-400 font-bold tracking-tight uppercase">
                          {new Date(ticket.lastScannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => setShowTicketCard(ticket)}
                          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="View/Print Ticket"
                        >
                          <QrCode size={18} />
                        </button>
                        <button 
                          onClick={() => handleRevoke(ticket.id)}
                          className="p-2 text-slate-400 hover:text-amber-600 transition-colors disabled:opacity-30" 
                          title="Revoke Access"
                          disabled={ticket.status === 'Revoked'}
                        >
                          <XCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors" 
                          title="Delete Attendee"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTickets.length === 0 && (
              <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                No tickets found.
              </div>
            )}
          </div>
        </div>
      </div>

      {showTicketModal && (
        <AddTicketModal 
          event={event}
          onClose={() => setShowTicketModal(false)}
          onSave={(ticket) => {
            onUpdateData({ ...data, tickets: [...data.tickets, ticket] });
            setShowTicketModal(false);
          }}
        />
      )}

      {showBulkModal && (
        <BulkGenerateModal 
           event={event}
           onClose={() => setShowBulkModal(false)}
           onSave={(newTickets) => {
             onUpdateData({ ...data, tickets: [...data.tickets, ...newTickets] });
             setShowBulkModal(false);
           }}
        />
      )}

      <AnimatePresence>
        {showTicketCard && (
          <TicketCardModal 
            ticket={showTicketCard} 
            event={event}
            onClose={() => setShowTicketCard(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AddTicketModal({ event, onClose, onSave }: { event: Event, onClose: () => void, onSave: (t: Ticket) => void }) {
  const [formData, setFormData] = useState({
    attendeeName: '',
    attendeeEmail: '',
    ticketType: 'General' as TicketType
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const num = Math.floor(1000 + Math.random() * 9000);
    const newTicket: Ticket = {
      id: `${event.id.split('-')[1]}-${dateStr}-${num}`,
      eventId: event.id,
      eventName: event.name,
      ...formData,
      issuedAt: Date.now(),
      status: 'Active',
      scanCount: 0
    };
    onSave(newTicket);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-2 border-slate-900"
      >
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-black uppercase tracking-tight">Issue Ticket</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{event.name}</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendee Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input required type="text" className="input-field pl-9" placeholder="John Doe" value={formData.attendeeName} onChange={e => setFormData({...formData, attendeeName: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input required type="email" className="input-field pl-9" placeholder="john@example.com" value={formData.attendeeEmail} onChange={e => setFormData({...formData, attendeeEmail: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Type</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select className="input-field pl-9" value={formData.ticketType} onChange={e => setFormData({...formData, ticketType: e.target.value as TicketType})}>
                  <option value="General">General Admission</option>
                  <option value="VIP">VIP Guest</option>
                  <option value="Staff">Event Staff</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-6 bg-slate-50 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary px-8">Generate</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function BulkGenerateModal({ event, onClose, onSave }: { event: Event, onClose: () => void, onSave: (t: Ticket[]) => void }) {
  const [count, setCount] = useState(10);
  const [ticketType, setTicketType] = useState<TicketType>('General');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTickets: Ticket[] = [];
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    for (let i = 0; i < count; i++) {
      const num = Math.floor(100000 + Math.random() * 899999);
      newTickets.push({
        id: `${event.id.split('-')[1]}-${dateStr}-${num}`,
        eventId: event.id,
        eventName: event.name,
        attendeeName: `Generic Guest ${i + 1}`,
        attendeeEmail: 'no-email@event.com',
        ticketType: ticketType,
        issuedAt: Date.now(),
        status: 'Active',
        scanCount: 0
      });
    }
    onSave(newTickets);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-2 border-slate-900"
      >
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-black uppercase tracking-tight">Bulk QR Generation</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Generate blank tickets for physical printing</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Number of Tickets</label>
              <input 
                required 
                type="number" 
                max={500}
                min={1}
                className="input-field" 
                value={count} 
                onChange={e => setCount(parseInt(e.target.value))} 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Type</label>
              <select className="input-field" value={ticketType} onChange={e => setTicketType(e.target.value as TicketType)}>
                <option value="General">General Admission</option>
                <option value="VIP">VIP Guest</option>
                <option value="Staff">Event Staff</option>
              </select>
            </div>
          </div>
          <div className="p-6 bg-slate-50 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary px-8">Generate {count} Codes</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function TicketCardModal({ ticket, event, onClose }: { ticket: Ticket, event: Event, onClose: () => void }) {
  const qrRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (qrRef.current) {
      qrRef.current.innerHTML = '';
      const qrData = JSON.stringify({
        ticketId: ticket.id,
        eventId: ticket.eventId,
        eventName: ticket.eventName,
        attendeeName: ticket.attendeeName,
        ticketType: ticket.ticketType,
        issuedAt: ticket.issuedAt
      });
      new (window as any).QRCode(qrRef.current, {
        text: qrData,
        width: 180,
        height: 180,
        colorDark : "#0f172a",
        colorLight : "#ffffff",
        correctLevel : (window as any).QRCode.CorrectLevel.H
      });
    }
  }, [ticket]);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex gap-4">
        <button onClick={() => window.print()} className="btn-secondary bg-white/10 text-white border-white/20 hover:bg-white/20">
          <Printer size={20} />
          Print
        </button>
        <button onClick={onClose} className="p-2 text-white/60 hover:text-white transition-colors">
          <XCircle size={24} />
        </button>
      </div>
      
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        id="printable-ticket"
        className="ticket-card bg-white p-0 overflow-hidden w-full max-w-sm border-2 border-slate-900 shadow-2xl"
      >
        <div className="bg-[#0f172a] p-6 flex justify-between items-center text-white">
          <span className="font-black tracking-tighter text-xl uppercase italic">SCANPASS</span>
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Official Ticket</span>
        </div>
        
        <div className="p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight mb-1 uppercase tracking-tighter italic">{event.name}</h1>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{new Date(event.date).toLocaleDateString()} • {event.time}</p>
            <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-widest">{event.venue}</p>
          </div>

          <div className="h-0.5 bg-dashed bg-slate-100"></div>

          <div>
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Attendee</p>
             <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{ticket.attendeeName}</h2>
             <span className={`inline-flex items-center px-3 py-1 mt-3 rounded text-[10px] font-black uppercase tracking-widest ${
               ticket.ticketType === 'VIP' ? 'bg-amber-100 text-amber-700' :
               ticket.ticketType === 'Staff' ? 'bg-slate-100 text-slate-700' :
               'bg-indigo-600 text-white shadow-[0_2px_0_rgb(67,56,202)]'
             }`}>
               {ticket.ticketType} Pass
             </span>
          </div>

          <div className="flex flex-col items-center justify-center pt-4">
             <div ref={qrRef} className="p-2 border-4 border-slate-50 rounded"></div>
             <p className="mt-4 font-mono text-[10px] text-slate-400 tracking-widest font-black uppercase">{ticket.id}</p>
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 border-t border-dashed border-slate-200 text-center">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Present this QR code for secure validation.</p>
        </div>
      </motion.div>
    </div>
  );
}
