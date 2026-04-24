import { supabase } from './supabase';
import { AppData, Event, Ticket, ScanLog, AppSettings } from '../types';

export const dataService = {
  // Authentication check handled in App.tsx
  
  async getAppData(): Promise<AppData> {
    const { data: events } = await supabase.from('events').select('*').order('createdAt', { ascending: false });
    const { data: tickets } = await supabase.from('tickets').select('*').order('issuedAt', { ascending: false });
    const { data: scanLogs } = await supabase.from('scan_log').select('*').order('scanTime', { ascending: false });
    const { data: settings } = await supabase.from('settings').select('*').single();

    const defaultSettings: AppSettings = {
      appName: 'SCANPASS',
      defaultTicketTypes: ['GENERAL', 'VIP', 'STAFF'],
      allowMultipleScans: false
    };

    return {
      events: events || [],
      tickets: tickets || [],
      scanLogs: scanLogs || [],
      settings: settings || defaultSettings
    };
  },

  async updateEvent(event: Event) {
    const { error } = await supabase
      .from('events')
      .upsert(event);
    if (error) throw error;
  },

  async deleteEvent(eventId: string) {
    // Delete tickets first? Supabase foreign keys can handle this if set to CASCADE
    // For safety, we do it here or assume cascade
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) throw error;
  },

  async updateTicket(ticket: Ticket) {
    const { error } = await supabase
      .from('tickets')
      .upsert(ticket);
    if (error) throw error;
  },

  async deleteTicket(ticketId: string) {
    const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
    if (error) throw error;
  },

  async addScanLog(log: ScanLog) {
    const { error } = await supabase.from('scan_log').insert(log);
    if (error) throw error;
  },

  async updateSettings(settings: AppSettings) {
    // Assuming settings table has identification or is a single row
    // We'll use a constant ID or upsert based on appName for simplicity in this demo
    const { error } = await supabase
      .from('settings')
      .upsert({ ...settings, id: 1 }); // Hardcoded ID for single config
    if (error) throw error;
  },

  async clearAll() {
    await supabase.from('scan_log').delete().neq('id', '');
    await supabase.from('tickets').delete().neq('id', '');
    await supabase.from('events').delete().neq('id', '');
  }
};
