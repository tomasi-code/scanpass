/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, XCircle, AlertCircle, Tag } from 'lucide-react';
import { AppData, Ticket, ScanLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ScannerViewProps {
  data: AppData;
  onUpdateData: (newData: AppData) => Promise<void>;
}

export default function ScannerView({ data, onUpdateData }: ScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Use a ref for scanning state so requestAnimationFrame always sees the latest value
  const isScanningRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string>('Ready');
  const [scanResult, setScanResult] = useState<{
    status: 'granted' | 'duplicate' | 'invalid';
    ticket?: Ticket;
    message?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const [libLoaded, setLibLoaded] = useState(false);

  // Load jsQR from working CDN with fallback
  useEffect(() => {
    if ((window as any).jsQR) {
      setLibLoaded(true);
      return;
    }
    const tryLoad = (src: string, fallbackSrc?: string) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        console.log('jsQR loaded from', src);
        setLibLoaded(true);
      };
      script.onerror = () => {
        console.warn('jsQR failed from', src);
        if (fallbackSrc) tryLoad(fallbackSrc);
      };
      document.body.appendChild(script);
    };
    tryLoad(
      'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
      'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js'
    );
  }, []);

  const startScanner = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera not supported. Please use Chrome or Safari.');
      setCameraStatus('Hardware Error');
      return;
    }
    try {
      setError(null);
      setCameraStatus('Waiting for camera...');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: 'environment' } }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.setAttribute('playsInline', 'true');
      video.muted = true;

      video.onloadedmetadata = async () => {
        try {
          await video.play();
          isScanningRef.current = true;
          setIsScanning(true);
          setCameraStatus('Camera active');
          requestAnimationFrame(tick);
        } catch {
          setError('Could not start video playback.');
          setCameraStatus('Error');
        }
      };
    } catch (err: any) {
      let msg = 'Unable to access camera.';
      if (err.name === 'NotAllowedError') msg = 'Camera permission denied.';
      else if (err.name === 'NotFoundError') msg = 'No camera hardware detected.';
      else msg = `Camera Error: ${err.message}`;
      setError(msg);
      setCameraStatus('Error');
    }
  };

  const stopScanner = () => {
    isScanningRef.current = false;
    const video = videoRef.current;
    if (video && video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
    setIsScanning(false);
    setCameraStatus('Ready');
  };

  const tick = () => {
    // Use ref — not state — so this always has the latest value inside rAF loop
    if (!isScanningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const jsQR = (window as any).jsQR;
        if (jsQR) {
          // attemptBoth handles normal and inverted QR codes
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (code && code.data) {
            console.log('QR detected:', code.data);
            handleScan(code.data);
            return;
          }
        }
      }
    }
    requestAnimationFrame(tick);
  };

  const handleScan = (qrData: string) => {
    stopScanner();
    let ticketId = qrData;
    try {
      const parsed = JSON.parse(qrData);
      if (parsed.ticketId) ticketId = parsed.ticketId;
      else if (parsed.id) ticketId = parsed.id;
    } catch {
      // plain string ID
    }
    validateTicket(ticketId);
  };

  const validateTicket = (ticketId: string) => {
    const ticket = data.tickets.find(t => t.id === ticketId);
    if (!ticket) { processResult('invalid', undefined, 'Ticket ID not found in database.'); return; }
    if (ticket.status === 'Revoked') { processResult('invalid', ticket, 'This ticket has been revoked.'); return; }
    if (ticket.status === 'Scanned' && !data.settings.allowMultipleScans) {
      processResult('duplicate', ticket, `Already scanned at ${new Date(ticket.lastScannedAt!).toLocaleTimeString()}`);
      return;
    }
    processResult('granted', ticket);
  };

  const processResult = (status: 'granted' | 'duplicate' | 'invalid', ticket?: Ticket, message?: string) => {
    setScanResult({ status, ticket, message });
    const newLog: ScanLog = {
      id: 'LOG-' + Date.now(),
      ticketId: ticket?.id || 'UNKNOWN',
      eventId: ticket?.eventId || 'UNKNOWN',
      attendeeName: ticket?.attendeeName || 'Unknown',
      eventName: ticket?.eventName || 'Unknown',
      scanTime: Date.now(),
      result: status,
      errorMessage: message,
    };
    const updatedTickets = status === 'granted' && ticket
      ? data.tickets.map(t => t.id === ticket.id
          ? { ...t, status: 'Scanned' as any, scanCount: t.scanCount + 1, lastScannedAt: Date.now() }
          : t)
      : data.tickets;
    onUpdateData({ ...data, tickets: updatedTickets, scanLogs: [newLog, ...data.scanLogs] });
  };

  const resetScanner = () => { setScanResult(null); startScanner(); };

  useEffect(() => { return () => stopScanner(); }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">Validator</h1>
        <p className="text-slate-500 mt-2 text-lg font-medium tracking-wide">Secure door entry and ticket authentication.</p>
      </div>

      {/* Video always in DOM so ref is valid when startScanner runs */}
      <div
        style={{ display: isScanning ? 'block' : 'none', position: 'relative' }}
        className="bg-black rounded-3xl overflow-hidden aspect-[4/5] shadow-2xl border-[12px] border-slate-900"
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-72 h-72 border-2 border-indigo-500 rounded relative">
            <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />
            <div className="absolute -top-1 -left-1 w-12 h-12 border-t-8 border-l-8 border-indigo-500" />
            <div className="absolute -top-1 -right-1 w-12 h-12 border-t-8 border-r-8 border-indigo-500" />
            <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-8 border-l-8 border-indigo-500" />
            <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-8 border-r-8 border-indigo-500" />
            <div className="absolute left-0 right-0 h-1.5 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,1)] animate-scan-line" />
          </div>
          <p className="mt-8 text-indigo-400 font-black uppercase tracking-[0.4em] text-xs animate-pulse">
            {libLoaded ? 'Scanning Data...' : 'Loading Scanner...'}
          </p>
        </div>
        <div className="absolute bottom-12 left-0 right-0 px-12 flex justify-center">
          <button onClick={stopScanner} className="bg-white text-slate-900 font-black uppercase tracking-widest px-10 py-4 rounded border-2 border-slate-900 shadow-[4px_4px_0_rgba(0,0,0,0.15)] hover:translate-y-0.5 transition-all">
            Abort Interface
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />

      <AnimatePresence mode="wait">
        {!isScanning && !scanResult && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card p-16 flex flex-col items-center justify-center text-center space-y-8 border-2 border-slate-900 shadow-[10px_10px_0_rgba(0,0,0,0.05)]"
          >
            <div className="w-24 h-24 bg-indigo-600 text-white rounded border-2 border-slate-900 flex items-center justify-center shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
              <Camera size={44} />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter italic">Scanner Online</h2>
              <p className="text-slate-500 mt-2 font-medium">Ready to parse scannable access codes.</p>
            </div>
            <button onClick={startScanner} className="btn-primary px-16 py-5 text-xl">
              Launch Interface
            </button>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${
              cameraStatus === 'Camera active' ? 'text-emerald-500' :
              cameraStatus.includes('Error') ? 'text-rose-500' : 'text-slate-400'
            }`}>{error || cameraStatus}</p>
            <div className="pt-10 border-t border-slate-100 w-full max-w-sm">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-6">Standard Override</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  className="input-field border-2 border-slate-900"
                  placeholder="INPUT TICKET SERIAL..."
                  value={manualId}
                  onChange={e => setManualId(e.target.value.toUpperCase())}
                />
                <button
                  onClick={() => validateTicket(manualId)}
                  className="px-6 py-2 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded hover:bg-indigo-600 transition-colors"
                >Verify</button>
              </div>
            </div>
          </motion.div>
        )}

        {!isScanning && scanResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`card overflow-hidden shadow-2xl border-[6px] ${
              scanResult.status === 'granted' ? 'border-emerald-500' :
              scanResult.status === 'duplicate' ? 'border-amber-500' : 'border-rose-500'
            }`}
          >
            <div className={`p-12 text-center text-white ${
              scanResult.status === 'granted' ? 'bg-emerald-600' :
              scanResult.status === 'duplicate' ? 'bg-amber-600' : 'bg-rose-600'
            }`}>
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                  {scanResult.status === 'granted' ? <CheckCircle2 size={64} /> :
                   scanResult.status === 'duplicate' ? <AlertCircle size={64} /> : <XCircle size={64} />}
                </div>
              </div>
              <h2 className="text-5xl font-black uppercase tracking-tighter italic leading-none">
                {scanResult.status === 'granted' ? 'Access Granted' :
                 scanResult.status === 'duplicate' ? 'Already Scanned' : 'Access Denied'}
              </h2>
              {scanResult.message && (
                <p className="mt-4 text-white font-black uppercase tracking-widest text-xs opacity-75">{scanResult.message}</p>
              )}
            </div>
            <div className="p-12 space-y-10 bg-white">
              {scanResult.ticket ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em] mb-2">Attendee Name</p>
                      <p className="font-black text-slate-900 text-3xl uppercase tracking-tighter italic leading-none">{scanResult.ticket.attendeeName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em] mb-2">Ticket Type</p>
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-indigo-600 rounded text-white"><Tag size={12} /></div>
                        <p className="font-black text-indigo-600 text-sm uppercase tracking-widest">{scanResult.ticket.ticketType}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em] mb-2">Event Origin</p>
                      <p className="font-black text-slate-900 text-xl uppercase tracking-tighter leading-tight bg-slate-50 p-4 border border-slate-100 rounded">{scanResult.ticket.eventName}</p>
                    </div>
                    <div className="flex gap-10">
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em] mb-1 italic">Internal ID</p>
                        <p className="font-bold text-slate-500 text-xs tracking-widest uppercase">{scanResult.ticket.id.split('-').pop()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em] mb-1 italic">Total Validations</p>
                        <p className="font-black text-slate-900 text-sm">{scanResult.ticket.scanCount}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded">
                  <AlertCircle size={40} className="mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-black uppercase tracking-tight italic">Missing Identifier</h3>
                  <p className="text-xs font-bold uppercase tracking-widest mt-2">{scanResult.message || 'The scanned data is not reactive.'}</p>
                </div>
              )}
              <button onClick={resetScanner} className="btn-primary w-full py-6 text-xl flex items-center justify-center gap-4 group">
                <div className="p-2 bg-white/20 rounded group-hover:rotate-180 transition-transform duration-500">
                  <RefreshCw size={24} />
                </div>
                Return to Buffer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes scan-line { 0% { top: 0%; } 100% { top: 100%; } }
        .animate-scan-line { animation: scan-line 2s ease-in-out infinite alternate; }
      `}</style>
    </div>
  );
}
