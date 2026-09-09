
import React from 'react';
import { SiteConfig } from '../types';
import { 
  ArrowRight, ShieldCheck, Layers, Sparkles
} from 'lucide-react';

interface Props {
  siteConfig: SiteConfig;
  setSiteConfig: React.Dispatch<React.SetStateAction<SiteConfig>>;
  onNavigate: () => void;
}

export const Landing: React.FC<Props> = ({ siteConfig, setSiteConfig, onNavigate }) => {
  return (
    <div className="max-w-6xl mx-auto px-6 py-24 text-center space-y-24">
      <div className="space-y-10 animate-in fade-in zoom-in duration-1000">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-[10px] font-black uppercase tracking-[0.4em] shadow-[0_0_20px_rgba(6,182,212,0.1)]">
          <Sparkles className="w-3.5 h-3.5" /> Technologie de Clonage Avancée
        </div>
        
        <div className="relative inline-block">
          <h1 className="text-6xl md:text-[10rem] font-black tracking-tighter uppercase leading-none italic text-white drop-shadow-[0_0_60px_rgba(255,255,255,0.05)]">
            STAR CODE <span className="text-cyan-500 drop-shadow-[0_0_50px_rgba(6,182,212,0.5)]">STUDIO</span>
          </h1>
          <div className="text-cyan-500/80 text-sm md:text-xl font-black uppercase tracking-[1em] mt-8 italic opacity-90 flex items-center justify-center gap-6">
            <span className="h-[1px] w-16 bg-cyan-500/30"></span>
            Développé par Astarté
            <span className="h-[1px] w-16 bg-cyan-500/30"></span>
          </div>
        </div>

        <p className="text-slate-500 max-w-3xl mx-auto font-semibold text-xl italic tracking-wide leading-relaxed pt-8 opacity-80">
          "Sublimez vos ressources, automatisez votre succès." <br/>
          Le moteur de déploiement le plus esthétique du web éducatif.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 text-left max-w-5xl mx-auto">
        <div className="md:col-span-12 bg-slate-900/30 border border-white/10 rounded-[5rem] p-10 md:p-16 backdrop-blur-3xl space-y-12 shadow-[0_50px_120px_rgba(0,0,0,0.5)] relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-40"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-5">
              <label className="text-[11px] font-black uppercase text-slate-600 ml-8 tracking-[0.4em]">Identifiant Session</label>
              <input 
                value={siteConfig.projectName}
                onChange={e => setSiteConfig({...siteConfig, projectName: e.target.value.toUpperCase().replace(/\s/g, '_')})}
                placeholder="EX: CORE_SESSION_1"
                className="w-full bg-black/60 border border-white/10 rounded-[3rem] px-10 py-8 font-black text-2xl outline-none focus:border-cyan-500 transition-all text-white placeholder:text-slate-800 uppercase italic shadow-inner"
              />
            </div>
            <div className="space-y-5">
              <label className="text-[11px] font-black uppercase text-slate-600 ml-8 tracking-[0.4em]">Nom du Studio</label>
              <input 
                value={siteConfig.title}
                onChange={e => setSiteConfig({...siteConfig, title: e.target.value})}
                placeholder="Mon Studio Personnel"
                className="w-full bg-black/60 border border-white/10 rounded-[3rem] px-10 py-8 font-black text-2xl outline-none focus:border-cyan-500 transition-all text-white placeholder:text-slate-800 italic shadow-inner"
              />
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8 items-center justify-between pt-12 border-t border-white/5">
             <div className="flex gap-6">
                <button 
                  onClick={() => setSiteConfig({...siteConfig, template: 'standard'})}
                  className={`px-8 md:px-12 py-6 rounded-[2rem] border text-sm font-black uppercase tracking-wider transition-all flex items-center gap-3 ${siteConfig.template === 'standard' ? 'bg-white text-black border-white shadow-2xl scale-110' : 'border-white/20 text-slate-400 hover:text-white hover:border-white/40 hover:bg-white/5'}`}
                > <Layers className="w-5 h-5" /> Standard</button>
                <button 
                  onClick={() => setSiteConfig({...siteConfig, template: 'locked'})}
                  className={`px-8 md:px-12 py-6 rounded-[2rem] border text-sm font-black uppercase tracking-wider transition-all flex items-center gap-3 ${siteConfig.template === 'locked' ? 'bg-white text-black border-white shadow-2xl scale-110' : 'border-white/20 text-slate-400 hover:text-white hover:border-white/40 hover:bg-white/5'}`}
                > <ShieldCheck className="w-5 h-5" /> Protégé</button>
             </div>
             
              <button 
               onClick={onNavigate}
               disabled={!siteConfig.projectName || !siteConfig.title}
               className="w-full md:w-auto bg-blue-500 text-white px-12 md:px-20 py-8 rounded-[3rem] font-black text-xl md:text-2xl uppercase tracking-wide hover:scale-110 active:scale-95 transition-all shadow-[0_0_60px_rgba(59,130,246,0.6),0_40px_80px_rgba(59,130,246,0.4)] hover:shadow-[0_0_80px_rgba(59,130,246,0.8),0_50px_100px_rgba(59,130,246,0.6)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none group relative overflow-hidden border-2 border-blue-400"
             >
               <span className="relative z-10 flex items-center justify-center gap-4 font-black">
                 LANCER LE STUDIO <ArrowRight className="w-7 h-7 group-hover:translate-x-3 transition-transform" />
               </span>
               <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             </button>            {(!siteConfig.projectName || !siteConfig.title) && (
              <p className="text-cyan-500/60 text-xs font-bold uppercase tracking-wider text-center md:text-left">
                ⚠ Remplissez les deux champs ci-dessus pour continuer
              </p>
            )}
          </div>
        </div>
      </div>

      <footer className="opacity-40 text-[10px] font-black uppercase tracking-[1em] pt-24 flex flex-col items-center gap-6">
        <div className="w-32 h-[1px] bg-cyan-500/30"></div>
        <div className="flex flex-col gap-2 italic">
          <span>STAR CODE STUDIO</span>
          <span className="text-[8px] text-cyan-500/60 tracking-[0.5em]">Développé par Astarté</span>
        </div>
      </footer>
    </div>
  );
};
