/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, XCircle, AlertCircle, Maximize, User, Calendar, Tag, History } from 'lucide-react';
import { AppData, Ticket, ScanLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ScannerViewProps {
  data: AppData;
  onUpdateData: (newData: AppData) => Promise<void>;
}

export default function ScannerView({ data, onUpdateData }: ScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // Load jsQR library dynamically
  useEffect(() => {
    if (window.hasOwnProperty('jsQR')) {
      setLibLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
    script.async = true;
    script.onload = () => setLibLoaded(true);
    document.body.appendChild(script);
    return () => {
      // We don't remove the script to avoid reloading if component remounts
    };
  }, []);

  const startScanner = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera not supported on this browser. Please use Chrome or Safari.");
      setCameraStatus("Hardware Error");
      return;
    }

    try {
      setError(null);
      setCameraStatus("Waiting for camera...");
      
      let stream: MediaStream;
      try {
        // Try exact environment camera first (rear)
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { exact: 'environment' } } 
        });
      } catch (e) {
        console.warn("Exact environment camera failed, falling back to any video source", e);
        // Fallback as requested
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Exact attributes as requested
        videoRef.current.setAttribute("playsInline", "true"); 
        videoRef.current.muted = true;
        videoRef.current.autoplay = true;
        
        await videoRef.current.play();
        
        setIsScanning(true);
        setCameraStatus("Camera active");
        requestAnimationFrame(tick);
      }
    } catch (err: any) {
      console.error("Camera Access Error:", err);
      let msg = "Unable to access camera.";
      if (err.name === 'NotAllowedError') msg = "Camera permission denied. Please enable in settings.";
      else if (err.name === 'NotFoundError') msg = "No camera hardware detected.";
      else msg = `Camera Error: ${err.message || 'Unknown protocol violation'}`;
      setError(msg);
      setCameraStatus("Error");
    }
  };

  const stopScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setIsScanning(false);
      setCameraStatus("Ready");
    }
  };

  const tick = () => {
    if (!isScanning) return;

    if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA && canvasRef.current && libLoaded) {
      const canvas = canvasRef.current.getContext("2d", { willReadFrequently: true });
      if (canvas) {
        canvasRef.current.height = videoRef.current.videoHeight;
        canvasRef.current.width = videoRef.current.videoWidth;
        canvas.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const imageData = canvas.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // @ts-ignore
        const code = window.jsQR ? window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        }) : null;

        if (code) {
          handleScan(code.data);
          return; 
        }
      }
    }
    requestAnimationFrame(tick);
  };

  const handleScan = (qrData: string) => {
    stopScanner();
    let ticketId = qrData;
    try {
      const parsedData = JSON.parse(qrData);
      if (parsedData.ticketId) ticketId = parsedData.ticketId;
      else if (parsedData.id) ticketId = parsedData.id;
    } catch (e) {
      // Not JSON, assume plain string ID
    }

    validateTicket(ticketId);
  };

  const validateTicket = (ticketId: string) => {
    const ticket = data.tickets.find(t => t.id === ticketId);
    
    if (!ticket) {
      processResult('invalid', undefined, "Ticket ID not found in database.");
      return;
    }

    if (ticket.status === 'Revoked') {
      processResult('invalid', ticket, "This ticket has been revoked and is invalid.");
      return;
    }

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
      errorMessage: message
    };

    let updatedTickets = data.tickets;
    if (status === 'granted' && ticket) {
      updatedTickets = data.tickets.map(t => 
        t.id === ticket.id ? { 
          ...t, 
          status: 'Scanned' as any, 
          scanCount: t.scanCount + 1, 
          lastScannedAt: Date.now() 
        } : t
      );
    }

    onUpdateData({
      ...data,
      tickets: updatedTickets,
      scanLogs: [newLog, ...data.scanLogs]
    });
  };

  const resetScanner = () => {
    setScanResult(null);
    startScanner();
  };

  useEffect(() => {
    return () => stopScanner();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">Validator</h1>
          <p className="text-slate-500 mt-2 text-lg font-medium tracking-wide">Secure door entry and ticket authentication.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isScanning && !scanResult ? (
          <motion.div 
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
              cameraStatus === 'Error' || cameraStatus === 'Hardware Error' ? 'text-rose-500' : 'text-slate-400'
            }`}>
              {error || cameraStatus}
            </p>
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
                 >
                  Verify
                 </button>
               </div>
            </div>
          </motion.div>
        ) : isScanning ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative bg-black rounded-3xl overflow-hidden aspect-[4/5] shadow-2xl border-[12px] border-slate-900"
          >
            <video 
              ref={videoRef} 
              className="w-full h-full object-cover grayscale opacity-80" 
              playsInline 
              muted 
              autoPlay 
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scanning Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-72 h-72 border-2 border-indigo-500 rounded relative">
                <div className="absolute inset-0 bg-indigo-500/5 animate-pulse"></div>
                {/* Corner Accents */}
                <div className="absolute -top-1 -left-1 w-12 h-12 border-t-8 border-l-8 border-indigo-500"></div>
                <div className="absolute -top-1 -right-1 w-12 h-12 border-t-8 border-r-8 border-indigo-500"></div>
                <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-8 border-l-8 border-indigo-500"></div>
                <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-8 border-r-8 border-indigo-500"></div>
                
                {/* Moving Line */}
                <div className="absolute left-0 right-0 h-1.5 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,1)] animate-scan-line"></div>
              </div>
              <p className="mt-8 text-indigo-400 font-black uppercase tracking-[0.4em] text-xs animate-pulse">Scanning Data...</p>
            </div>

            <div className="absolute bottom-12 left-0 right-0 px-12 flex justify-center">
              <button 
                onClick={stopScanner}
                className="bg-white text-slate-900 font-black uppercase tracking-widest px-10 py-4 rounded border-2 border-slate-900 shadow-[4px_4px_0_rgba(0,0,0,0.15)] hover:translate-y-0.5 transition-all"
              >
                Abort Interface
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`card overflow-hidden shadow-2xl border-[6px] ${
              scanResult?.status === 'granted' ? 'border-emerald-500' : 
              scanResult?.status === 'duplicate' ? 'border-amber-500' : 
              'border-rose-500'
            }`}
          >
            <div className={`p-12 text-center text-white ${
              scanResult?.status === 'granted' ? 'bg-emerald-600' : 
              scanResult?.status === 'duplicate' ? 'bg-amber-600' : 
              'bg-rose-600'
            }`}>
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                   {scanResult?.status === 'granted' ? <CheckCircle2 size={64} /> : 
                    scanResult?.status === 'duplicate' ? <AlertCircle size={64} /> : 
                    <XCircle size={64} />}
                </div>
              </div>
              <h2 className="text-5xl font-black uppercase tracking-tighter italic leading-none">
                {scanResult?.status === 'granted' ? 'Access Granted' : 
                 scanResult?.status === 'duplicate' ? 'Already Scanned' : 
                 'Access Denied'}
              </h2>
              {scanResult?.message && <p className="mt-4 text-white font-black uppercase tracking-widest text-xs opacity-75">{scanResult.message}</p>}
            </div>

            <div className="p-12 space-y-10 bg-white">
              {scanResult?.ticket ? (
                <>
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
                </>
              ) : (
                <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded">
                   <AlertCircle size={40} className="mx-auto mb-4 opacity-50" />
                   <h3 className="text-xl font-black uppercase tracking-tight italic">Missing Identifier</h3>
                   <p className="text-xs font-bold uppercase tracking-widest mt-2">{scanResult?.message || 'The scanned data is not reactive.'}</p>
                </div>
              )}

              <button 
                onClick={resetScanner} 
                className="btn-primary w-full py-6 text-xl flex items-center justify-center gap-4 group"
              >
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
        @keyframes scan-line {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  );
}
