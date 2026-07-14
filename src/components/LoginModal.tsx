import React, { useState } from 'react';
import { X, Lock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useIsMobile } from '../hooks/useIsMobile';
import { Member } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: { name: string; username: string; departments: string[]; isAdmin: boolean; isLeader?: boolean }) => void;
}

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const isMobile = useIsMobile();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();

    // Admin login
    if (cleanUsername === 'admin' && password === 'ictus123') {
      setError('');
      onLogin({
        name: 'Administrador',
        username: 'admin',
        departments: [],
        isAdmin: true,
        isLeader: true,
      });
      onClose();
      setUsername('');
      setPassword('');
      return;
    }

    // Member login
    const storedMembersRaw = localStorage.getItem('church_members');
    let members: Member[] = [];
    if (storedMembersRaw) {
      try {
        members = JSON.parse(storedMembersRaw);
      } catch (err) {
        console.error(err);
      }
    }

    // Default seeded members if none exist
    if (members.length === 0) {
      members = [
        { id: 'm1', name: 'João Líder', username: 'joao', password: '123', departments: ['oracao', 'lideres'], isLeader: true },
        { id: 'm2', name: 'Maria de Crianças', username: 'maria', password: '123', departments: ['criancas', 'mulheres'] }
      ];
      try { localStorage.setItem('church_members', JSON.stringify(members)); } catch(e) { console.error(e); }
    }

    const matchedMember = members.find(
      (m) => m.username.toLowerCase() === cleanUsername && m.password === password
    );

    if (matchedMember) {
      setError('');
      onLogin({
        name: matchedMember.name,
        username: matchedMember.username,
        departments: matchedMember.departments || [],
        isAdmin: !!matchedMember.isAdmin,
        isLeader: matchedMember.isLeader || matchedMember.departments.includes('lideres'),
      });
      onClose();
      setUsername('');
      setPassword('');
    } else {
      setError('Usuário ou senha incorretos.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            {...(!isMobile ? {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0 }
            } : {})}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            {...(!isMobile ? {
              initial: { opacity: 0, scale: 0.95, y: 10 },
              animate: { opacity: 1, scale: 1, y: 0 },
              exit: { opacity: 0, scale: 0.95, y: 10 }
            } : {})}
            className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Área de Membros & Admin</h3>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">
                  {error}
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="username">Usuário</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    maxLength={100}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)} 
                    data-testid="username-input"
                    autoCapitalize="none"
                    autoComplete="off"
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">Senha</label>
                <span className="relative block">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    maxLength={100}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                    placeholder="••••••••"
                    data-testid="password-input"
                  />
                </span>
              </div>
              
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Entrar
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
