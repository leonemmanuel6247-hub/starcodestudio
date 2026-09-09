
import React, { useState, useEffect } from 'react';
import { UserData, SiteConfig } from '../types';
import { ChevronLeft, ShieldCheck, Loader2, UserCircle, Mail, GraduationCap } from 'lucide-react';

interface Props {
  siteConfig: SiteConfig;
  onSuccess: (data: UserData) => void;
  onBack: () => void;
}

export const Signup: React.FC<Props> = ({ siteConfig, onSuccess, onBack }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    grade: '',
    country: 'Togo'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ip, setIp] = useState('');

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIp(data.ip))
      .catch(() => setIp('127.0.0.1'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simulate registration delay
      setTimeout(() => {
        onSuccess({
          firstName: formData.fullName,
          lastName: '',
          grade: formData.grade,
          email: formData.email,
          country: formData.country,
          ip: ip,
          birthDate: { day: 1, month: 1, year: 2000 },
          userAgent: navigator.userAgent
        });
        setIsSubmitting(false);
      }, 2500);
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-20 px-6 animate-in fade-in slide-in-from-bottom-12 duration-1000">
      <button onClick={onBack} className="text-slate-400 hover:text-cyan-400 mb-12 flex items-center gap-2 uppercase font-black text-sm tracking-wider transition-all">
        <ChevronLeft className="w-5 h-5" /> Retour Studio
      </button>

      <div className="bg-slate-900/60 border border-cyan-500/20 rounded-[4rem] p-12 backdrop-blur-3xl shadow-[0_0_80px_rgba(6,182,212,0.1)] relative">
        <header className="mb-14">
          <h2 className="text-5xl font-black text-white tracking-tighter mb-4 uppercase italic">Séquence <span className="text-cyan-500">Initiale</span></h2>
          <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.4em] leading-relaxed">Enregistrement sur le noyau Astarté</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-600 ml-6 tracking-widest flex items-center gap-2">
              <UserCircle className="w-3 h-3" /> Nom Complet
            </label>
            <input 
              required 
              value={formData.fullName} 
              onChange={e => setFormData({...formData, fullName: e.target.value})} 
              placeholder="Ex: Jean-Luc Polaris" 
              className="w-full bg-black/40 border border-white/10 rounded-3xl px-8 py-6 text-white focus:border-cyan-500 outline-none transition-all placeholder:text-slate-800" 
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-600 ml-6 tracking-widest flex items-center gap-2">
              <Mail className="w-3 h-3" /> Email de Gestion
            </label>
            <input 
              required 
              type="email" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              placeholder="votre@base-donnees.com" 
              className="w-full bg-black/40 border border-white/10 rounded-3xl px-8 py-6 text-white focus:border-cyan-500 outline-none transition-all placeholder:text-slate-800" 
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-600 ml-6 tracking-widest flex items-center gap-2">
              <GraduationCap className="w-3 h-3" /> Niveau / Spécialité
            </label>
            <input 
              required 
              value={formData.grade} 
              onChange={e => setFormData({...formData, grade: e.target.value})} 
              placeholder="Ex: Terminale S / Master IT" 
              className="w-full bg-black/40 border border-white/10 rounded-3xl px-8 py-6 text-white focus:border-cyan-500 outline-none transition-all placeholder:text-slate-800" 
            />
          </div>

          <button 
            disabled={isSubmitting}
            className="w-full bg-blue-500 text-white font-black py-8 rounded-[2.5rem] flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_60px_rgba(59,130,246,0.6),0_25px_50px_rgba(59,130,246,0.4)] hover:shadow-[0_0_80px_rgba(59,130,246,0.8),0_35px_70px_rgba(59,130,246,0.6)] border-2 border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none group mt-10"
          >
            {isSubmitting ? <Loader2 className="animate-spin w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
            <span className="tracking-wide uppercase text-xl font-black">ACTIVER LE CLONE</span>
          </button>
        </form>
      </div>
      
      <div className="mt-12 text-center opacity-30 text-[9px] font-black uppercase tracking-[0.5em]">
         Liaison IP: {ip || "Détection..."} • Signé Astarté
      </div>
    </div>
  );
};
