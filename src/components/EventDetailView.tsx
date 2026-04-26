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
  Layers,
  ImagePlus,
  Move,
  Check,
  Maximize2
} from 'lucide-react';
import { AppData, Ticket, Event, TicketType, TicketStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface EventDetailViewProps {
  eventId: string;
  data: AppData;
  onUpdateData: (newData: AppData) => Promise<void>;
}

export default function EventDetailView({ eventId, data, onUpdateData }: EventDetailViewProps) {
  const event = data.events.find(e => e.id === eventId);
  const tickets = data.tickets.filter(t => t.eventId === eventId);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showTicketCard, setShowTicketCard] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [showDesigner, setShowDesigner] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState({ current: 0, total: 0 });
  
  const bulkQrRef = useRef<HTMLDivElement>(null);
  const bulkCanvasRef = useRef<HTMLCanvasElement>(null);

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

  const handleDownloadAll = async () => {
    if (tickets.length === 0) return;
    setIsBulkDownloading(true);
    setBulkDownloadProgress({ current: 0, total: tickets.length });

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      setBulkDownloadProgress({ current: i + 1, total: tickets.length });

      // Generate QR Code in hidden div
      if (bulkQrRef.current) {
        bulkQrRef.current.innerHTML = '';
        const qrData = JSON.stringify({
          ticketId: ticket.id,
          eventId: ticket.eventId,
          eventName: ticket.eventName,
          attendeeName: ticket.attendeeName,
          ticketType: ticket.ticketType,
          issuedAt: ticket.issuedAt
        });
        new (window as any).QRCode(bulkQrRef.current, {
          text: qrData,
          width: 500,
          height: 500,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: (window as any).QRCode.CorrectLevel.H
        });
        
        // Wait a small bit for QR to render if needed, though QRCode is usually sync
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const canvas = bulkCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (event.artwork && event.qrPosition) {
            // Load artwork — onload BEFORE src to avoid race condition
            const artworkImg = new Image();
            artworkImg.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
              artworkImg.onload = () => resolve();
              artworkImg.onerror = () => reject();
              artworkImg.src = event.artwork!;
            });

            canvas.width = artworkImg.naturalWidth;
            canvas.height = artworkImg.naturalHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(artworkImg, 0, 0);

            // Generate fresh high-res QR
            const qrSize = 800;
            const qrDiv = document.createElement('div');
            document.body.appendChild(qrDiv);
            await new Promise<void>((resolve) => {
              new (window as any).QRCode(qrDiv, {
                text: JSON.stringify({
                  ticketId: ticket.id,
                  eventId: ticket.eventId,
                  eventName: ticket.eventName,
                  attendeeName: ticket.attendeeName,
                  ticketType: ticket.ticketType,
                  issuedAt: ticket.issuedAt
                }),
                width: qrSize,
                height: qrSize,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: (window as any).QRCode.CorrectLevel.H
              });
              setTimeout(resolve, 100);
            });

            const renderedQr = qrDiv.querySelector('canvas') as HTMLCanvasElement;
            if (renderedQr) {
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = renderedQr.width;
              tempCanvas.height = renderedQr.height;
              const tempCtx = tempCanvas.getContext('2d')!;
              tempCtx.drawImage(renderedQr, 0, 0);
              const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
              const pixels = imgData.data;
              for (let j = 0; j < pixels.length; j += 4) {
                const avg = (pixels[j] + pixels[j + 1] + pixels[j + 2]) / 3;
                pixels[j + 3] = avg < 128 ? 255 : 0;
                if (avg < 128) { pixels[j] = 0; pixels[j + 1] = 0; pixels[j + 2] = 0; }
              }
              tempCtx.putImageData(imgData, 0, 0);
              const x = (event.qrPosition.x / 100) * canvas.width;
              const y = (event.qrPosition.y / 100) * canvas.height;
              const size = (event.qrPosition.width / 100) * canvas.width;
              ctx.drawImage(tempCanvas, x, y, size, size);
            }
            document.body.removeChild(qrDiv);
          } else {
            // Fallback to plain QR on white background
            canvas.width = 500;
            canvas.height = 500;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 500, 500);
            const qrCanvas = bulkQrRef.current?.querySelector('canvas') as HTMLCanvasElement;
            if (qrCanvas) ctx.drawImage(qrCanvas, 0, 0, 500, 500);
          }

          const link = document.createElement('a');
          link.download = `${ticket.attendeeName.replace(/\s+/g, '_')}_Ticket.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
      }
      
      // Small pause to prevent browser from being overwhelmed
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsBulkDownloading(false);
  };

  return (
    <div className="space-y-8">
      {/* Hidden elements for bulk download */}
      <div className="hidden">
        <div ref={bulkQrRef}></div>
        <canvas ref={bulkCanvasRef}></canvas>
      </div>

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

      {/* Ticket Designer Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            <Layers size={24} className="text-indigo-600" />
            Ticket Designer
          </h2>
          <button 
            onClick={() => setShowDesigner(!showDesigner)} 
            className="btn-secondary"
          >
            {showDesigner ? 'Close Designer' : 'Open Designer'}
          </button>
        </div>

        <AnimatePresence>
          {showDesigner && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <TicketDesigner 
                event={event} 
                onUpdate={(artwork, qrPosition) => {
                  const newEvents = data.events.map(e => e.id === event.id ? { ...e, artwork, qrPosition } : e);
                  onUpdateData({ ...data, events: newEvents });
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tickets List Area */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            <TicketIcon size={24} className="text-indigo-600" />
            Attendees
          </h2>
          <div className="flex items-center gap-3">
             {isBulkDownloading && (
               <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 animate-pulse">
                 Downloading {bulkDownloadProgress.current} of {bulkDownloadProgress.total}...
               </div>
             )}
             <button 
               onClick={handleDownloadAll} 
               className="btn-secondary"
               disabled={isBulkDownloading || tickets.length === 0}
             >
               <Download size={18} />
               {isBulkDownloading ? 'Downloading...' : 'Download All'}
             </button>
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
           data={data}
           onClose={() => setShowBulkModal(false)}
           onUpdateData={onUpdateData}
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

function BulkGenerateModal({ event, data, onClose, onUpdateData }: { event: Event, data: AppData, onClose: () => void, onUpdateData: (newData: AppData) => Promise<void> }) {
  const [count, setCount] = useState(10);
  const [ticketType, setTicketType] = useState<TicketType>('General');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    let currentAppData = { ...data };
    let currentTickets = [...data.tickets];

    for (let i = 0; i < count; i++) {
      setCurrentIndex(i + 1);
      const num = Math.floor(100000 + Math.random() * 899999);
      const newTicket: Ticket = {
        id: `${event.id.split('-')[1]}-${dateStr}-${num}`,
        eventId: event.id,
        eventName: event.name,
        attendeeName: `Generic Guest ${i + 1}`,
        attendeeEmail: 'no-email@event.com',
        ticketType: ticketType,
        issuedAt: Date.now(),
        status: 'Active',
        scanCount: 0
      };
      
      currentTickets = [...currentTickets, newTicket];
      currentAppData = { ...currentAppData, tickets: currentTickets };
      // Sequentially save each ticket to Supabase via onUpdateData
      await onUpdateData(currentAppData);
    }
    
    setIsGenerating(false);
    onClose();
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
            {isGenerating ? (
              <div className="py-10 text-center space-y-4">
                <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                <p className="text-lg font-black uppercase tracking-tighter italic">Generating ticket {currentIndex} of {count}...</p>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300" 
                    style={{ width: `${(currentIndex / count) * 100}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
          <div className="p-6 bg-slate-50 flex justify-end gap-3">
            <button type="button" disabled={isGenerating} onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isGenerating} className="btn-primary px-8">
              {isGenerating ? 'Processing...' : `Generate ${count} Codes`}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function TicketCardModal({ ticket, event, onClose }: { ticket: Ticket, event: Event, onClose: () => void }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
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
        width: 500,
        height: 500,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: (window as any).QRCode.CorrectLevel.H
      });
    }
  }, [ticket]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (event.artwork && event.qrPosition) {
      // Step 1: Load artwork — set onload BEFORE src to avoid race condition
      const artworkImg = new Image();
      artworkImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        artworkImg.onload = () => resolve();
        artworkImg.onerror = () => reject(new Error('Artwork failed to load'));
        artworkImg.src = event.artwork!;
      });

      canvas.width = artworkImg.naturalWidth;
      canvas.height = artworkImg.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(artworkImg, 0, 0);

      // Step 2: Generate QR at high resolution on offscreen canvas
      const qrSize = 800;
      const qrCanvas = document.createElement('canvas');
      qrCanvas.width = qrSize;
      qrCanvas.height = qrSize;
      const qrDiv = document.createElement('div');
      document.body.appendChild(qrDiv);

      const qrData = JSON.stringify({
        ticketId: ticket.id,
        eventId: ticket.eventId,
        eventName: ticket.eventName,
        attendeeName: ticket.attendeeName,
        ticketType: ticket.ticketType,
        issuedAt: ticket.issuedAt
      });

      await new Promise<void>((resolve) => {
        new (window as any).QRCode(qrDiv, {
          text: qrData,
          width: qrSize,
          height: qrSize,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: (window as any).QRCode.CorrectLevel.H
        });
        setTimeout(resolve, 100);
      });

      const renderedQr = qrDiv.querySelector('canvas') as HTMLCanvasElement;
      if (renderedQr) {
        // Make white pixels transparent
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = renderedQr.width;
        tempCanvas.height = renderedQr.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(renderedQr, 0, 0);
        const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const pixels = imgData.data;
        for (let i = 0; i < pixels.length; i += 4) {
          const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          pixels[i + 3] = avg < 128 ? 255 : 0;
          if (avg < 128) { pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; }
        }
        tempCtx.putImageData(imgData, 0, 0);

        // Step 3: Draw QR at correct position and size on ticket
        const x = (event.qrPosition.x / 100) * canvas.width;
        const y = (event.qrPosition.y / 100) * canvas.height;
        const size = (event.qrPosition.width / 100) * canvas.width;
        ctx.drawImage(tempCanvas, x, y, size, size);
      }
      document.body.removeChild(qrDiv);
    } else {
      // Fallback: plain QR on white background
      const qrCanvas = qrRef.current?.querySelector('canvas');
      if (qrCanvas) {
        canvas.width = 500;
        canvas.height = 500;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 500, 500);
        ctx.drawImage(qrCanvas, 0, 0, 500, 500);
      }
    }

    const link = document.createElement('a');
    link.download = `${ticket.attendeeName.replace(/\s+/g, '_')}_Ticket.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute top-4 right-4 flex gap-4">
        {event.artwork && event.qrPosition && (
          <button onClick={handleDownload} className="btn-secondary bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700">
            <Download size={20} />
            Download PNG
          </button>
        )}
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
        {event.artwork && event.qrPosition ? (
          <div className="flex flex-col">
            <div className="relative">
              <img src={event.artwork} alt="Ticket Artwork" className="w-full h-auto block" />
              <div 
                className="absolute bg-white p-1"
                style={{ 
                  left: `${event.qrPosition.x}%`, 
                  top: `${event.qrPosition.y}%`, 
                  width: `${Math.min(event.qrPosition.width, 35)}%`, 
                  aspectRatio: '1 / 1'
                }}
              >
                <div 
                  ref={qrRef} 
                  className="w-full h-full [&>canvas]:w-full [&>canvas]:h-full [&>img]:hidden"
                ></div>
              </div>
            </div>
            <div className="p-3 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest text-center leading-relaxed">
              <div>{ticket.attendeeName}</div>
              <div className="text-slate-400 mt-1">{ticket.id}</div>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </motion.div>
    </div>
  );
}

function TicketDesigner({ event, onUpdate }: { event: Event, onUpdate: (artwork: string, qrPosition: any) => void }) {
  const [step, setStep] = useState(event.artwork ? 2 : 1);
  const [artwork, setArtwork] = useState<string | null>(event.artwork || null);
  const [qrPos, setQrPos] = useState(event.qrPosition || { x: 10, y: 10, width: 20, height: 20 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const resizeStart = useRef({ initialWidth: 0, initialHeight: 0, startX: 0, startY: 0 });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setArtwork(base64);
        setStep(2);
        onUpdate(base64, qrPos);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: qrPos.x,
      initialY: qrPos.y
    };
    setIsDragging(true);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizeStart.current = {
      initialWidth: qrPos.width,
      initialHeight: qrPos.height,
      startX: e.clientX,
      startY: e.clientY
    };
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (isDragging) {
        const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
        const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;
        
        setQrPos(prev => ({
          ...prev,
          x: Math.max(0, Math.min(100 - prev.width, dragStart.current.initialX + dx)),
          y: Math.max(0, Math.min(100 - prev.height, dragStart.current.initialY + dy))
        }));
      }

      if (isResizing) {
        const dw = ((e.clientX - resizeStart.current.startX) / rect.width) * 100;
        
        setQrPos(prev => {
          const ratio = rect.height / rect.width;
          const maxW = Math.min(100 - prev.x, (100 - prev.y) * ratio);
          const newSize = Math.max(5, Math.min(maxW, resizeStart.current.initialWidth + dw));
          return {
            ...prev,
            width: newSize,
            height: newSize
          };
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing]);

  const saveConfig = () => {
    if (artwork) {
      onUpdate(artwork, qrPos);
      setStep(3);
    }
  };

  return (
    <div className="card overflow-hidden border-2 border-slate-900 mt-6">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex gap-4">
          <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${step >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-[8px]">1</span>
            Artwork
          </div>
          <div className="w-8 h-px bg-slate-200 self-center"></div>
          <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-[8px]">2</span>
            Position
          </div>
          <div className="w-8 h-px bg-slate-200 self-center"></div>
          <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-[8px]">3</span>
            Preview
          </div>
        </div>
        {step === 2 && artwork && (
          <button onClick={saveConfig} className="btn-primary text-[10px] py-1.5 px-3">
            <Check size={14} />
            Save Design
          </button>
        )}
      </div>

      <div className="p-8">
        {step === 1 && (
          <div className="py-20 text-center space-y-6">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 border-2 border-dashed border-slate-300">
              <ImagePlus size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Upload Ticket Artwork</h3>
              <p className="text-slate-500 text-sm font-medium mt-1 font-sans">PNG, JPG or WEBP supported. Max 2MB.</p>
            </div>
            <label className="btn-primary cursor-pointer inline-flex items-center gap-3 px-10">
              <Plus size={20} />
              Select File
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {step === 2 && artwork && (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>Drag to move • Corner to resize</span>
              <div className="flex gap-4">
                <span>X: {Math.round(qrPos.x)}%</span>
                <span>Y: {Math.round(qrPos.y)}%</span>
                <span>Size: {Math.round(qrPos.width)}%</span>
              </div>
            </div>
            <div 
              ref={containerRef}
              className="relative border-2 border-slate-900 bg-slate-50 rounded overflow-hidden select-none cursor-crosshair"
              style={{ maxWidth: '600px', margin: '0 auto' }}
            >
              <img src={artwork} alt="Artwork" className="w-full h-auto block" />
              <div 
                onMouseDown={handleMouseDown}
                className="absolute border-2 border-indigo-600 border-dashed bg-indigo-600/10 shadow-[0_0_15px_rgba(79,70,229,0.3)] group"
                style={{ 
                  left: `${qrPos.x}%`, 
                  top: `${qrPos.y}%`, 
                  width: `${qrPos.width}%`, 
                  aspectRatio: '1 / 1',
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <QrCode size={24} className="text-indigo-600 opacity-50" />
                </div>
                <div 
                  onMouseDown={handleResizeMouseDown}
                  className="absolute -bottom-2 -right-2 w-5 h-5 bg-indigo-600 rounded-full border-2 border-white shadow-lg cursor-nwse-resize flex items-center justify-center hover:scale-125 transition-transform z-10"
                >
                  <Maximize2 size={10} className="text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && artwork && (
          <div className="py-10 text-center space-y-8">
            <div className="inline-block relative border-2 border-slate-900 shadow-xl rounded overflow-hidden max-w-[400px]">
              <img src={artwork} alt="Final Preview" className="w-full h-auto" />
              <div 
                className="absolute bg-white p-1"
                style={{ 
                  left: `${qrPos.x}%`, 
                  top: `${qrPos.y}%`, 
                  width: `${qrPos.width}%`, 
                  aspectRatio: '1 / 1'
                }}
              >
                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                  <QrCode size={40} className="text-slate-300" />
                </div>
              </div>
              <div className="absolute inset-0 bg-emerald-600/10 pointer-events-none"></div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-2xl font-black uppercase tracking-tight italic text-slate-900">Design Finalized!</h3>
              <p className="text-slate-500 font-medium font-sans">All new tickets will now be generated with this artwork.</p>
              <div className="flex justify-center gap-4 pt-4">
                <button onClick={() => setStep(2)} className="btn-secondary">
                  <Move size={18} />
                  Adjust Position
                </button>
                <button onClick={() => {
                  if(confirm('Delete artwork and reset design?')) {
                    setArtwork(null);
                    setStep(1);
                    onUpdate('', null);
                  }
                }} className="btn-secondary text-rose-600 border-rose-200">
                  <Trash2 size={18} />
                  Reset Artwork
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
