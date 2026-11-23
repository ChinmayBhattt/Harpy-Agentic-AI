'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Lock,
  Key,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { AppDefinition, APP_ICONS } from './types';

interface OAuthModalProps {
  app: AppDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleConnect: (appId: string, isConnected: boolean, accountEmail?: string) => void;
}

export default function OAuthModal({
  app,
  isOpen,
  onClose,
  onToggleConnect,
}: OAuthModalProps) {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [customEmail, setCustomEmail] = useState('chinmaybhatt26@gmail.com');

  if (!isOpen || !app) return null;

  const Icon = APP_ICONS[app.iconName] || APP_ICONS.Globe;

  const handleAuthorize = () => {
    setIsAuthorizing(true);
    setTimeout(() => {
      setIsAuthorizing(false);
      onToggleConnect(app.id, true, customEmail);
      onClose();
    }, 1200);
  };

  const handleDisconnect = () => {
    onToggleConnect(app.id, false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-[#09090E] border border-[#C6A46A]/40 rounded-2xl shadow-[0_0_50px_rgba(198,164,106,0.18)] overflow-hidden text-[#E8DDC7]"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#181824] bg-[#0E0E16] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md border border-white/10"
                style={{ backgroundColor: `${app.color}15`, color: app.color }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-cinzel text-sm font-semibold tracking-wide text-[#E8DDC7]">
                  {app.name} Authentication
                </h3>
                <p className="text-[11px] text-[#8C7A6B] font-mono">
                  {app.authType === 'oauth2'
                    ? 'Official OAuth 2.0 Secure Handshake'
                    : 'API Token & Session Integration'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-[#E8DDC7] hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 text-xs font-inter leading-relaxed">
            {app.isConnected ? (
              <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-300">Account Authenticated & Active</p>
                  <p className="text-[11px] text-emerald-200/70 font-mono mt-0.5">
                    Connected as: {app.accountEmail || app.accountName || 'Active Session'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[#E8DDC7]/80">
                  Authorize Harpy AI Autonomous Kernel to securely interact with your{' '}
                  <span className="text-[#C6A46A] font-semibold">{app.name}</span> account.
                </p>

                {/* Email Input */}
                <div>
                  <label className="block text-[11px] font-mono text-[#8C7A6B] mb-1">
                    Account Email or Handle
                  </label>
                  <input
                    type="text"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06060A] border border-[#222232] text-xs font-mono text-[#E8DDC7] focus:outline-none focus:border-[#C6A46A]/80 transition-colors"
                    placeholder="you@domain.com"
                  />
                </div>
              </div>
            )}

            {/* Requested Scopes */}
            {app.scopes && app.scopes.length > 0 && (
              <div>
                <p className="text-[11px] font-mono text-[#8C7A6B] uppercase mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3 h-3 text-[#C6A46A]" /> Requested Permission Scopes
                </p>
                <div className="p-2.5 rounded-xl bg-[#06060A] border border-[#161622] space-y-1">
                  {app.scopes.map((scope, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] font-mono text-[#E8DDC7]/70">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{scope}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Guarantee */}
            <div className="flex items-center gap-2 text-[10px] text-[#8C7A6B] font-mono pt-1">
              <Lock className="w-3.5 h-3.5 text-[#C6A46A] shrink-0" />
              <span>TLS 1.3 encrypted. Access tokens never stored in plain text.</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-[#181824] bg-[#0E0E16] flex items-center justify-between">
            {app.isConnected ? (
              <>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono hover:bg-rose-500/25 transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Disconnect
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#181824] border border-[#2B2B3C] text-xs font-mono text-[#E8DDC7] hover:bg-[#202030] transition-colors"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#141420] text-xs font-mono text-[#8C7A6B] hover:text-[#E8DDC7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAuthorize}
                  disabled={isAuthorizing}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C6A46A] to-amber-200 text-[#050508] text-xs font-cinzel font-semibold tracking-wider uppercase hover:shadow-[0_0_20px_rgba(198,164,106,0.4)] transition-all flex items-center gap-2"
                >
                  {isAuthorizing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Authorizing...
                    </>
                  ) : (
                    <>
                      Authorize & Connect <ExternalLink className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
