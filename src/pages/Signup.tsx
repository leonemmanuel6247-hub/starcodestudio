import React, { useState, useEffect } from 'react';
import { UserData, SiteConfig } from '../types';
import {
  ChevronLeft, ShieldCheck, Loader2, UserCircle, Mail, GraduationCap, Globe,
} from 'lucide-react';

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
    country: 'Togo',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ip, setIp] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIp(data.ip))
      .catch(() => setIp('127.0.0.1'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Veuillez saisir une adresse email valide.');
      return;
    }

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    onSuccess({
      firstName: formData.fullName,
      lastName: '',
      grade: formData.grade,
      email: formData.email,
      country: formData.country,
      ip: ip,
      birthDate: { day: 1, month: 1, year: 2000 },
      userAgent: navigator.userAgent,
    });
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-lg mx-auto py-16 px-6 animate-in fade-in slide-in-from-bottom-12 duration-700">
      <button
        type="button"
        onClick={onBack}
        className="sc-btn-ghost mb-10 uppercase font-bold text-sm tracking-wider cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Retour Studio
      </button>

      <div className="glass-panel rounded-[2.5rem] p-8 md:p-12 relative">
        <header className="mb-10">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3 uppercase italic">
            Séquence{' '}
            <span className="text-cyan-400 text-glow-cyan bg-gradient-to-r from-cyan-300 to-sky-400 bg-clip-text text-transparent">
              Initiale
            </span>
          </h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.35em] leading-relaxed">
            Enregistrement sur le noyau Astarté
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 px-5 py-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-sm font-semibold"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-7" noValidate>
          <div className="space-y-3">
            <label htmlFor="fullName" className="sc-label ml-2">
              <UserCircle className="w-3.5 h-3.5" aria-hidden="true" /> Nom complet
            </label>
            <input
              id="fullName"
              required
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Ex: Jean-Luc Polaris"
              autoComplete="name"
              className="sc-input"
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="email" className="sc-label ml-2">
              <Mail className="w-3.5 h-3.5" aria-hidden="true" /> Email de gestion
            </label>
            <input
              id="email"
              required
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="votre@base-donnees.com"
              autoComplete="email"
              className="sc-input"
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="grade" className="sc-label ml-2">
              <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" /> Niveau / Spécialité
            </label>
            <input
              id="grade"
              required
              value={formData.grade}
              onChange={e => setFormData({ ...formData, grade: e.target.value })}
              placeholder="Ex: Terminale S / Master IT"
              className="sc-input"
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="country" className="sc-label ml-2">
              <Globe className="w-3.5 h-3.5" aria-hidden="true" /> Pays
            </label>
            <input
              id="country"
              value={formData.country}
              onChange={e => setFormData({ ...formData, country: e.target.value })}
              placeholder="Togo"
              className="sc-input"
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="sc-btn-primary w-full py-6 mt-4">
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            )}
            <span className="tracking-wide uppercase text-base font-black">
              {isSubmitting ? 'Activation en cours...' : 'Activer le clone'}
            </span>
          </button>
        </form>
      </div>

      <div className="mt-10 text-center opacity-40 text-[9px] font-bold uppercase tracking-[0.5em] flex items-center justify-center gap-3">
        <span>Liaison IP: {ip || 'Détection...'}</span>
        <span className="w-1 h-1 rounded-full bg-cyan-500" aria-hidden="true"></span>
        <span>Signé Astarté</span>
      </div>
    </div>
  );
};