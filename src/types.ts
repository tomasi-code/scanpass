/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TicketStatus = 'Active' | 'Scanned' | 'Revoked';
export type TicketType = 'General' | 'VIP' | 'Staff';

export interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  description: string;
  maxCapacity: number;
  ticketPrice?: number;
  createdAt: number;
}

export interface Ticket {
  id: string;
  eventId: string;
  eventName: string;
  attendeeName: string;
  attendeeEmail: string;
  ticketType: TicketType;
  issuedAt: number;
  status: TicketStatus;
  scanCount: number;
  lastScannedAt?: number;
}

export interface ScanLog {
  id: string;
  ticketId: string;
  eventId: string;
  attendeeName: string;
  eventName: string;
  scanTime: number;
  result: 'granted' | 'duplicate' | 'invalid';
  errorMessage?: string;
}

export interface AppSettings {
  appName: string;
  defaultTicketTypes: string[];
  allowMultipleScans: boolean;
}

export interface AppData {
  events: Event[];
  tickets: Ticket[];
  scanLogs: ScanLog[];
  settings: AppSettings;
}
