/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Search, Calendar, MapPin, Users, Ticket as TicketIcon, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Event, AppData } from '../types';
import { motion } from 'motion/react';

interface EventsViewProps {
  data: AppData;
  onNavigateToEvent: (id: string) => void;
  onUpdateData: (newData: AppData) => Promise<void>;
}

export default function EventsView({ data, onNavigateToEvent, onUpdateData }: EventsViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const filteredEvents = data.events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          event.venue.toLowerCase().includes(searchQuery.toLowerCase());
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filter === 'upcoming') return matchesSearch && eventDate >= today;
    if (filter === 'past') return matchesSearch && eventDate < today;
    return matchesSearch;
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('CRITICAL: Delete this event folder and ALL associated tickets? This action cannot be undone.')) {
      const newData = {
        ...data,
        events: data.events.filter(ev => ev.id !== id),
        tickets: data.tickets.filter(t => t.eventId !== id),
        scanLogs: data.scanLogs.filter(l => l.eventId !== id)
      };
      onUpdateData(newData);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter italic">Event Folders</h1>
          <p className="text-slate-500 mt-2 text-lg font-medium">Manage your event containers and scannable tickets.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={24} />
          Create Event
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded border-2 border-slate-900 shadow-[4px_4px_0_rgba(0,0,0,0.05)]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search events by name or venue..." 
            className="input-field pl-10 border-none shadow-none focus:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex bg-slate-100 p-1 rounded">
          {(['all', 'upcoming', 'past'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded text-xs font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="card p-24 text-center border-dashed">
          <Calendar size={64} className="mx-auto text-slate-200 mb-6" />
          <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">No events found</h3>
          <p className="text-slate-500 mt-2 font-medium">Click '+ Create Event' to get started or adjust your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredEvents.map(event => (
            <EventCard 
              key={event.id} 
              event={event} 
              data={data}
              onClick={() => onNavigateToEvent(event.id)} 
              onDelete={(e) => handleDelete(event.id, e)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <EventModal 
          onClose={() => setShowModal(false)} 
          onSave={(event) => {
            onUpdateData({ ...data, events: [event, ...data.events] });
            setShowModal(false);
          }} 
        />
      )}
    </div>
  );
}

function EventCard({ event, data, onClick, onDelete }: { event: Event, data: AppData, onClick: () => void, onDelete: (e: any) => void, key?: any }) {
  const tickets = data.tickets.filter(t => t.eventId === event.id);
  const scanned = tickets.filter(t => t.scanCount > 0).length;
  const progress = tickets.length > 0 ? (scanned / tickets.length) * 100 : 0;

  return (
    <div 
      onClick={onClick}
      className="card hover:border-indigo-600 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
    >
      <div className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div className="p-4 bg-[#0f172a] text-white rounded shadow-[4px_4px_0_rgba(99,102,241,0.5)]">
            <Calendar size={28} />
          </div>
          <button onClick={onDelete} className="p-2 text-slate-300 hover:text-rose-600 transition-colors">
            <Trash2 size={20} />
          </button>
        </div>
        
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Event Folder</span>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        
        <h3 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tighter group-hover:text-indigo-600 transition-colors">{event.name}</h3>
        
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Calendar size={16} className="text-indigo-500" />
            <span>{new Date(event.date).toLocaleDateString()} @ {event.time}</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            <MapPin size={16} className="text-indigo-500" />
            <span className="line-clamp-1">{event.venue}</span>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-50">
          <div className="flex justify-between items-end mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center border border-slate-100">
                 <TicketIcon size={14} className="text-slate-600" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attendees</p>
                <p className="text-sm font-black text-slate-900">{tickets.length}</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">{Math.round(progress)}% SCANNED</span>
          </div>
          <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
            <div 
              className="h-full bg-indigo-500 transition-all duration-700" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 opacity-[0.03] pointer-events-none">
        <TicketIcon size={120} />
      </div>
    </div>
  );
}

function EventModal({ onClose, onSave }: { onClose: () => void, onSave: (event: Event) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '19:00',
    venue: '',
    description: '',
    maxCapacity: 100,
    ticketPrice: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: Event = {
      ...formData,
      id: 'EVT-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      createdAt: Date.now()
    };
    onSave(newEvent);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border-2 border-slate-900"
      >
        <form onSubmit={handleSubmit}>
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Create Event</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Setup a new container for attendees</p>
          </div>
          <div className="p-8 space-y-6">
            <div>
              <label className="stat-label">Event Title</label>
              <input 
                required 
                type="text" 
                className="input-field" 
                placeholder="e.g. ANNUAL TECH SUMMIT"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="stat-label">Date</label>
                <input 
                  required 
                  type="date" 
                  className="input-field"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="stat-label">Door Time</label>
                <input 
                  required 
                  type="time" 
                  className="input-field"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="stat-label">Venue Location</label>
              <input 
                required 
                type="text" 
                className="input-field" 
                placeholder="Where is the event being held?"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="stat-label">Max Tickets</label>
                <input 
                  required 
                  type="number" 
                  className="input-field"
                  value={formData.maxCapacity}
                  onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="stat-label">Price Per Guest ($)</label>
                <input 
                  type="number" 
                  className="input-field"
                  value={formData.ticketPrice}
                  onChange={(e) => setFormData({ ...formData, ticketPrice: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <div className="p-8 bg-slate-50 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="btn-secondary">Discard</button>
            <button type="submit" className="btn-primary px-12">Initialize</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
