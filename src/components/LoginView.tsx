/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { QrCode, LogIn, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-4 mb-12 justify-center">
          <div className="w-16 h-16 bg-indigo-600 rounded flex items-center justify-center border-4 border-slate-900 shadow-[6px_6px_0_rgba(0,0,0,0.1)]">
            <QrCode size={40} className="text-white" />
          </div>
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none text-slate-900">ScanPass</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 mt-2">Authentication Gateway</p>
          </div>
        </div>

        <div className="bg-white border-2 border-slate-900 shadow-[12px_12px_0_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="p-10 border-b-2 border-slate-900 bg-slate-50">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic">Console Access</h2>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-1">Initialize identity secure handshake</p>
          </div>

          <form onSubmit={handleLogin} className="p-10 space-y-8">
            {error && (
              <div className="p-4 bg-rose-50 border-2 border-rose-500 flex items-center gap-3 text-rose-600">
                <ShieldAlert size={20} />
                <p className="text-xs font-black uppercase tracking-widest leading-none">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Operator Identifier</label>
                <input 
                  required
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-900 p-4 font-black text-slate-900 placeholder:text-slate-300 focus:bg-white transition-colors outline-none shadow-[4px_4px_0_rgba(0,0,0,0.05)]"
                  placeholder="EMAIL@OPERATOR.NODE"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Security Token</label>
                <input 
                  required
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-900 p-4 font-black text-slate-900 placeholder:text-slate-300 focus:bg-white transition-colors outline-none shadow-[4px_4px_0_rgba(0,0,0,0.05)]"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button 
              disabled={loading}
              type="submit"
              className="w-full btn-primary py-5 text-xl flex items-center justify-center gap-4 group"
            >
              {loading ? (
                <span className="animate-pulse">Handshaking...</span>
              ) : (
                <>
                  <LogIn size={24} className="group-hover:translate-x-1 transition-transform" />
                  Initialize
                </>
              )}
            </button>
          </form>

          <div className="p-6 bg-slate-900 text-center">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.5em]">SYSTEM VERSION 4.0.0 // ENCRYPTION ENABLED</p>
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center px-4">
           <div className="h-0.5 flex-1 bg-slate-200"></div>
           <span className="mx-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">End of stream</span>
           <div className="h-0.5 flex-1 bg-slate-200"></div>
        </div>
      </motion.div>
    </div>
  );
}
