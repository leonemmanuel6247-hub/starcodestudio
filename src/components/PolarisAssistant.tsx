
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { X, Send, Loader2, Zap } from 'lucide-react';

export const PolarisAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    { role: 'assistant', text: "Salutations. Je suis l'intelligence de STAR CODE STUDIO. Je suis là pour magnifier votre projet. Comment puis-je vous assister dans le déploiement de votre clone ?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      // Prioritize server-side API
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiText = data.reply || "Erreur de transmission Star Code.";
        setMessages(prev => [...prev, { role: 'assistant', text: aiText }]);
        return;
      }

      // Fallback to client-side if available
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: userMsg,
          config: {
            systemInstruction: "Tu es Star Code Brain, l'intelligence derrière STAR CODE STUDIO. Ton but est d'aider les créateurs à magnifier leurs portails de ressources. Ton style est Prestigieux, Technologique, poli et extrêmement efficace. Tu mets en avant la sublimité et la performance de STAR CODE STUDIO, développé par Astarté. Réponds toujours en français.",
            temperature: 0.8,
          }
        });
        const aiText = response.text || "Erreur de transmission Star Code.";
        setMessages(prev => [...prev, { role: 'assistant', text: aiText }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: "Lien Star Code interrompu. Veuillez vérifier que votre clé API Gemini est configurée dans les paramètres de l'application." }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', text: "Lien Star Code interrompu. Veuillez configurer votre clé API Gemini pour activer l'assistant IA." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="w-80 sm:w-96 h-[550px] bg-slate-900/90 backdrop-blur-3xl border border-cyan-500/30 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="p-6 bg-gradient-to-r from-cyan-600 to-indigo-700 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-cyan-200 fill-cyan-200" />
              <div className="flex flex-col">
                <span className="font-black text-white uppercase tracking-tighter text-lg leading-none">Star Code Brain</span>
                <span className="text-[8px] font-black text-cyan-200/60 uppercase tracking-widest mt-1">Noyau Astarté</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="bg-black/20 p-2 rounded-full text-white/80 hover:text-white hover:bg-black/40 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-cyan-600 text-black font-bold rounded-tr-none' 
                    : 'bg-slate-800/80 text-slate-200 border border-slate-700 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800/80 p-5 rounded-[2rem] rounded-tl-none border border-slate-700">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-800 flex gap-3 bg-black/20">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Question pour Star Code..."
              className="flex-1 bg-slate-950/80 border border-slate-700 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-700 italic"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading}
              className="bg-cyan-500 hover:bg-cyan-400 text-black p-4 rounded-2xl transition-all shadow-lg disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-cyan-500 p-5 rounded-full shadow-[0_20px_50px_rgba(6,182,212,0.4)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center text-black group"
        >
          <Zap className="w-7 h-7 fill-black group-hover:animate-pulse" />
        </button>
      )}
    </div>
  );
};
