import React from 'react';
import { SiteConfig } from '../types';
import {
  ArrowRight, ShieldCheck, Layers, Sparkles, Rocket, Zap, Files,
} from 'lucide-react';

interface Props {
  siteConfig: SiteConfig;
  setSiteConfig: React.Dispatch<React.SetStateAction<SiteConfig>>;
  onNavigate: () => void;
}

export const Landing: React.FC<Props> = ({ siteConfig, setSiteConfig, onNavigate }) => {
  const canContinue = Boolean(siteConfig.projectName && siteConfig.title);
  const accent = 'cyan';

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 text-center space-y-20 md:space-y-28">
      {/* HERO */}
      <header className="space-y-10 animate-in fade-in zoom-in duration-1000">
        <div className="inline-flex items-center gap-3 px-5 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-[10px] font-bold uppercase tracking-[0.35em] shadow-[0_0_20px_rgba(6,182,212,0.12)]">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          Technologie de Clonage Avancée
        </div>

        <div className="relative inline-block">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight uppercase leading-none italic text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.06)]">
            Star Code{' '}
            <span className="text-cyan-400 text-glow-cyan bg-gradient-to-r from-cyan-300 via-cyan-400 to-sky-400 bg-clip-text text-transparent">
              Studio
            </span>
          </h1>
          <div className="mt-6 text-cyan-500/80 text-xs sm:text-sm md:text-base font-bold uppercase tracking-[0.6em] italic opacity-90 flex items-center justify-center gap-6">
            <span className="h-px w-16 bg-cyan-500/30" aria-hidden="true"></span>
            Développé par Astarté
            <span className="h-px w-16 bg-cyan-500/30" aria-hidden="true"></span>
          </div>
        </div>

        <p className="text-slate-400 max-w-3xl mx-auto font-medium text-base md:text-lg tracking-wide leading-relaxed pt-2">
          Sublimez vos ressources, automatisez votre succès. Le moteur de
          déploiement le plus esthétique du web éducatif.
        </p>
      </header>

      {/* CONFIGURATION PANEL */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-10 text-left max-w-5xl mx-auto">
        <div className="md:col-span-12 glass-panel rounded-[3rem] p-8 md:p-14 space-y-12 relative overflow-hidden group">
          <div
            className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"
            aria-hidden="true"
          ></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4">
              <label htmlFor="projectName" className="sc-label ml-2">
                Identifiant Session
              </label>
              <input
                id="projectName"
                value={siteConfig.projectName}
                onChange={e =>
                  setSiteConfig({
                    ...siteConfig,
                    projectName: e.target.value.toUpperCase().replace(/\s/g, '_'),
                  })
                }
                placeholder="EX: CORE_SESSION_1"
                autoComplete="off"
                className="sc-input italic py-5 font-bold tracking-wide uppercase"
              />
            </div>
            <div className="space-y-4">
              <label htmlFor="studioTitle" className="sc-label ml-2">
                Nom du Studio
              </label>
              <input
                id="studioTitle"
                value={siteConfig.title}
                onChange={e => setSiteConfig({ ...siteConfig, title: e.target.value })}
                placeholder="Mon Studio Personnel"
                className="sc-input italic py-5 font-bold"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center justify-between pt-10 border-t border-white/5">
            <div className="flex gap-4 flex-wrap justify-center" role="radiogroup" aria-label="Type de modèle">
              <button
                type="button"
                role="radio"
                aria-checked={siteConfig.template === 'standard'}
                onClick={() => setSiteConfig({ ...siteConfig, template: 'standard' })}
                className={`px-6 md:px-10 py-4 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-3 cursor-pointer ${
                  siteConfig.template === 'standard'
                    ? 'bg-white text-black border-white shadow-xl scale-[1.03]'
                    : 'border-white/20 text-slate-400 hover:text-white hover:border-white/40 hover:bg-white/5'
                }`}
              >
                <Layers className="w-4 h-4" aria-hidden="true" /> Standard
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={siteConfig.template === 'locked'}
                onClick={() => setSiteConfig({ ...siteConfig, template: 'locked' })}
                className={`px-6 md:px-10 py-4 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-3 cursor-pointer ${
                  siteConfig.template === 'locked'
                    ? 'bg-white text-black border-white shadow-xl scale-[1.03]'
                    : 'border-white/20 text-slate-400 hover:text-white hover:border-white/40 hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Protégé
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={siteConfig.template === 'multipage'}
                onClick={() => setSiteConfig({ ...siteConfig, template: 'multipage' })}
                className={`px-6 md:px-10 py-4 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-3 cursor-pointer ${
                  siteConfig.template === 'multipage'
                    ? 'bg-white text-black border-white shadow-xl scale-[1.03]'
                    : 'border-white/20 text-slate-400 hover:text-white hover:border-white/40 hover:bg-white/5'
                }`}
              >
                <Files className="w-4 h-4" aria-hidden="true" /> Site 3 Pages
              </button>
            </div>

            <div className="text-left md:text-right">
              <button
                type="button"
                onClick={onNavigate}
                disabled={!canContinue}
                className="sc-btn-primary px-10 md:px-16 py-5 text-lg group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-3 font-black">
                  Lancer le studio
                  <ArrowRight
                    className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1.5"
                    aria-hidden="true"
                  />
                </span>
              </button>
              {!canContinue && (
                <p className="mt-3 text-cyan-500/70 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center md:justify-end gap-2">
                  <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                  Remplissez les deux champs ci-dessus pour continuer
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-5xl mx-auto text-left">
        {[
          { icon: Rocket, title: 'Portails sur mesure', desc: 'Générez des ressources éducatives haute performance avec une identité visuelle propre.' },
          { icon: ShieldCheck, title: 'Déploiement protégé', desc: 'Sécurisez l\'accès à vos contenus avec un modèle de vérification par session.' },
          { icon: Zap, title: 'Exportation instantanée', desc: 'Prévisualisez, téléchargez en ZIP ou publiez directement sur GitHub en un geste.' },
        ].map(f => (
          <div
            key={f.title}
            className="glass-panel rounded-3xl p-7 space-y-4 transition-transform duration-200 hover:-translate-y-1"
          >
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
              <f.icon className="w-5 h-5 text-cyan-400" aria-hidden="true" />
            </div>
            <h3 className="font-bold uppercase tracking-wide text-sm text-white">{f.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className={`opacity-50 text-[10px] font-bold uppercase tracking-[0.8em] pt-10 flex flex-col items-center gap-4 ${accent}`}>
        <div className="w-32 h-px bg-cyan-500/40" aria-hidden="true"></div>
        <div className="flex flex-col gap-2 items-center">
          <span>Star Code Studio</span>
          <span className="text-[8px] text-cyan-500/60 font-bold tracking-[0.5em]">
            Développé par Astarté
          </span>
        </div>
      </footer>
    </div>
  );
};