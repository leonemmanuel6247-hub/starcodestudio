
import React, { useState } from 'react';
import { SiteConfig, UserData } from '../types';
import { 
  Trash2, PlusCircle, ExternalLink, Download, Sparkles, 
  Palette, Settings, Loader2, Zap, Github, CheckCircle, AlertCircle, Copy,
  Eye, Monitor, Tablet, Smartphone, X
} from 'lucide-react';
import JSZip from 'jszip';

interface Props {
  siteConfig: SiteConfig;
  setSiteConfig: React.Dispatch<React.SetStateAction<SiteConfig>>;
  user: UserData | null;
}

interface ResourceItem {
  title: string;
  description: string;
  link?: string;
  meta: string;
  mediaType?: 'image' | 'video' | 'none';
  mediaUrl?: string;
  mediaPosition?: 'top' | 'bottom' | 'left' | 'right';
  fontSize?: string;
}

export const Customization: React.FC<Props> = ({ siteConfig, setSiteConfig, user }) => {
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [newItem, setNewItem] = useState<ResourceItem>({ 
    title: '', 
    description: '',
    link: '', 
    meta: 'PDF',
    mediaType: 'none',
    mediaUrl: '',
    mediaPosition: 'top',
    fontSize: '1.7rem'
  });
  const [isExporting, setIsExporting] = useState(false);
  
  // GitHub Publishing State
  const [githubToken, setGithubToken] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'creating' | 'pushing' | 'pages' | 'success' | 'error'>('idle');
  const [publishedUrl, setPublishedUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // In-app preview modal & non-blocking toast notification
  const [previewModalHtml, setPreviewModalHtml] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(prev => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const loadSampleResource = () => {
    const sample: ResourceItem = {
      title: "Manuel d'Architecture Astarté 2026",
      description: "Ce document de référence rassemble l'ensemble des spécifications technologiques, modules d'optimisation haute performance et modèles de déploiement autonome.",
      link: "https://example.com/guide-astarte",
      meta: "GUIDE PDF",
      mediaType: "none",
      fontSize: "1.7rem"
    };
    setItems(prev => [...prev, sample]);
    showNotification("✨ Ressource d'exemple ajoutée avec succès !", "success");
  };

  const addItem = () => {
    console.log('addItem appelé avec newItem:', newItem);
    console.log('Titre:', newItem.title, 'Description:', newItem.description);
    
    // Validation des champs obligatoires
    if (!newItem.title.trim() || !newItem.description.trim()) {
      console.log('❌ Titre ou description manquant');
      showNotification('⚠️ Le titre et la description sont obligatoires !', 'warning');
      return;
    }
    
    // Validation du média
    if (newItem.mediaType !== 'none' && !newItem.mediaUrl?.trim()) {
      console.log('❌ Type de média sélectionné mais URL vide');
      showNotification('⚠️ Vous avez sélectionné un type de média mais l\'URL est vide. Remplissez l\'URL ou choisissez "Aucun média".', 'warning');
      return;
    }
    
    // Tout est valide, on ajoute l'item
    const newItems = [...items, { ...newItem }];
    console.log('✅ Nouvelle liste d\'items:', newItems);
    setItems(newItems);
    
    // Réinitialiser les champs UNIQUEMENT si tout a réussi
    setNewItem({ 
      title: '', 
      description: '',
      link: '', 
      meta: 'PDF',
      mediaType: 'none',
      mediaUrl: '',
      mediaPosition: 'top',
      fontSize: '1.7rem'
    });
    
    showNotification('✅ Contenu ajouté avec succès !', 'success');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const themes: {id: SiteConfig['theme'], color: string, label: string}[] = [
    { id: 'neon', color: '#06b6d4', label: 'Néon' },
    { id: 'white', color: '#ffffff', label: 'Blanche' },
    { id: 'cendre', color: '#b2beb5', label: 'Cendre' },
    { id: 'grey', color: '#6b7280', label: 'Gris' },
    { id: 'indigo', color: '#6366f1', label: 'Indigo' },
    { id: 'menthe', color: '#10b981', label: 'Menthe' },
    { id: 'golden', color: '#fbbf24', label: 'Or' },
    { id: 'cosmic', color: '#a855f7', label: 'Cosmos' },
    { id: 'red', color: '#ef4444', label: 'Rouge' },
  ];

  const escapeHTML = (str: string | undefined) => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const generateHTML = () => {
    console.log('generateHTML appelé avec items:', items);
    console.log('Nombre d\'items:', items.length);
    
    const isLocked = siteConfig.template === 'locked';
    const accentColor = themes.find(t => t.id === siteConfig.theme)?.color || '#06b6d4';
    const developerName = escapeHTML(user?.firstName || 'Astarté');
    const contactEmail = escapeHTML(user?.email || 'contact');
    
    // Générer le HTML du contenu libre et justifié (pas dans des cartes)
    const contentHTML = items.length > 0 ? items.map(item => {
      console.log('Traitement item:', item);
      const fontSize = item.fontSize || '1.7rem';
      const hasMedia = item.mediaType && item.mediaType !== 'none' && item.mediaUrl;
      const hasLink = item.link && item.link.trim() !== '';
      
      console.log('hasMedia:', hasMedia, 'mediaType:', item.mediaType, 'mediaUrl:', item.mediaUrl);
      
      let mediaHTML = '';
      if (hasMedia && item.mediaUrl) {
        if (item.mediaType === 'image') {
          const position = item.mediaPosition || 'top';
          const style = position === 'left' ? 'float: left; width: 45%; margin-right: 2rem; margin-bottom: 1rem;' :
                       position === 'right' ? 'float: right; width: 45%; margin-left: 2rem; margin-bottom: 1rem;' :
                       'width: 100%; margin: 2rem 0;';
          mediaHTML = `<img src="${item.mediaUrl}" alt="${escapeHTML(item.title)}" style="${style} height: auto; border-radius: 1rem; display: block;" />`;
          console.log('Image HTML générée:', mediaHTML);
        } else if (item.mediaType === 'video') {
          const position = item.mediaPosition || 'top';
          const style = position === 'left' ? 'float: left; width: 45%; margin-right: 2rem; margin-bottom: 1rem;' :
                       position === 'right' ? 'float: right; width: 45%; margin-left: 2rem; margin-bottom: 1rem;' :
                       'width: 100%; margin: 2rem 0;';
          mediaHTML = `<video src="${item.mediaUrl}" style="${style} height: auto; border-radius: 1rem; display: block;" controls></video>`;
          console.log('Video HTML générée:', mediaHTML);
        }
      } else {
        console.log('Pas de média généré - hasMedia:', hasMedia);
      }
      
      const titleHTML = `<h2 style="font-size: ${fontSize}; font-weight: 900; text-transform: uppercase; margin-bottom: 1.5rem; color: var(--text); letter-spacing: -0.02em;">${escapeHTML(item.title)}</h2>`;
      const descriptionHTML = item.description ? `<p style="text-align: justify; line-height: 1.8; font-weight: 400; color: var(--text); margin-bottom: 3rem; font-size: 1.1rem;">${escapeHTML(item.description)}</p>` : '';
      
      const linkHTML = hasLink ? `<a href="${item.link}" target="_blank" style="display: inline-block; margin-top: 1rem; color: var(--accent); text-decoration: underline; font-weight: 600;">Voir plus →</a>` : '';
      
      // Déterminer où placer le média
      const position = item.mediaPosition || 'top';
      const mediaTop = position === 'top' ? mediaHTML : '';
      const mediaBottom = position === 'bottom' ? mediaHTML : '';
      const mediaLeft = position === 'left' ? mediaHTML : '';
      const mediaRight = position === 'right' ? mediaHTML : '';
      
      console.log('Position du média:', position, 'Media HTML:', mediaHTML ? 'Généré' : 'Vide');
      
      return `
        <article style="margin-bottom: 4rem; padding-bottom: 4rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
          ${mediaTop}
          ${titleHTML}
          ${mediaLeft}
          ${descriptionHTML}
          ${mediaRight}
          ${mediaBottom}
          ${linkHTML}
          <div style="clear: both;"></div>
        </article>
      `;
    }).join('') : '<div style="text-align: center; padding: 4rem; opacity: 0.5; font-size: 1.2rem; color: var(--text);">Aucun contenu disponible pour le moment.</div>';
    
    // Debug: afficher le nombre d'items
    console.log('Items à exporter:', items.length, items);

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(siteConfig.title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;900&display=swap" rel="stylesheet">
    <style>
        :root { --accent: ${accentColor}; --bg: #020617; --text: #ffffff; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow-x: hidden; max-width: 100vw; }
        body { background: var(--bg); color: var(--text); font-family: 'Outfit', sans-serif; }
        .galaxy { position: fixed; inset: 0; background: radial-gradient(circle at center, #0f172a 0%, #000 100%); z-index: -1; }
        .stars { position: absolute; inset: -100%; background-image: radial-gradient(2px 2px at 20px 30px, #eee, rgba(0,0,0,0)), radial-gradient(2px 2px at 40px 70px, #fff, rgba(0,0,0,0)); background-size: 250px 250px; animation: rotate 300s linear infinite; opacity: 0.35; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .container { max-width: 1000px; margin: 0 auto; padding: 6rem 2rem; position: relative; z-index: 10; overflow: hidden; box-sizing: border-box; width: 100%; }
        .container * { box-sizing: border-box; }
        header { text-align: center; margin-bottom: 6rem; }
        h1 { font-size: 5.5rem; font-weight: 900; color: var(--accent); text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: -0.07em; text-shadow: 0 0 40px rgba(6,182,212,0.4); }
        .credit { text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5em; opacity: 0.5; margin-bottom: 3rem; font-weight: 900; color: var(--accent); }
        .content-area { max-width: 100%; }
        article { max-width: 100%; margin-bottom: 4rem; padding-bottom: 4rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
        article img { 
          max-width: 100%; 
          height: auto; 
          display: block; 
          border-radius: 1rem; 
          margin: 2rem 0;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        article video { 
          max-width: 100%; 
          height: auto; 
          display: block; 
          border-radius: 1rem; 
          margin: 2rem 0;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        article img[style*="float"] { margin: 0 2rem 1rem 0; }
        article video[style*="float"] { margin: 0 2rem 1rem 0; }
        footer { margin-top: 12rem; text-align: center; opacity: 0.3; font-size: 0.7rem; text-transform: uppercase; font-weight: 900; letter-spacing: 0.7em; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4rem; }
        #gateway { position: fixed; inset: 0; background: #020617; z-index: 1000; display: flex; align-items: center; justify-content: center; text-align: center; backdrop-filter: blur(50px); }
        .hidden { display: none !important; }
        .gate-box { background: rgba(255,255,255,0.02); padding: 5rem; border-radius: 5rem; border: 1px solid rgba(255,255,255,0.1); width: 90%; max-width: 550px; box-shadow: 0 50px 120px rgba(0,0,0,0.6); }
        input { background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1); padding: 1.8rem 2rem; border-radius: 2rem; color: #fff; width: 100%; outline: none; margin-bottom: 2rem; font-family: inherit; font-weight: 900; text-align: center; font-size: 1.3rem; }
        .btn { background: var(--accent); color: #000; padding: 2rem 3rem; border-radius: 2rem; font-weight: 900; border: none; cursor: pointer; text-transform: uppercase; width: 100%; transition: 0.4s; font-size: 1.1rem; letter-spacing: 0.1em; }
        .btn:hover { transform: scale(1.05); filter: brightness(1.2); box-shadow: 0 15px 40px rgba(6,182,212,0.4); }
    </style>
</head>
<body>
    <div class="galaxy"><div class="stars"></div></div>
    <div id="gateway" class="${isLocked ? '' : 'hidden'}">
        <div class="gate-box">
            <h2 style="margin-bottom:3rem; font-weight:900; font-size:3.5rem; text-transform:uppercase; letter-spacing:-0.05em;">Accès Studio</h2>
            <input type="text" id="pass" placeholder="Clé d'activation...">
            <button class="btn" onclick="unlock()">Vérifier Session</button>
        </div>
    </div>
    <div class="container" id="main">
        <header>
            <h1>${escapeHTML(siteConfig.title)}</h1>
            <div class="credit">Développé par ${developerName}</div>
            <p style="opacity:0.6; font-weight:600; font-style:italic; font-size: 1.2rem; letter-spacing: 0.05em;">${escapeHTML(siteConfig.description)}</p>
        </header>
        <div id="content" class="content-area">
            ${contentHTML}
        </div>
        <footer>
            <div style="margin-bottom: 1.5rem;">Pour plus d'informations, contacter le <a href="mailto:${contactEmail}" style="color: var(--accent); text-decoration: underline;">${contactEmail}</a></div>
            <div>Propulsé par ${escapeHTML(siteConfig.title)}</div>
        </footer>
    </div>
    <script>
        const storageKey = 'starcode_auth_${escapeHTML(siteConfig.projectName)}';
        function unlock() {
            const val = document.getElementById('pass').value;
            if(val.length >= 2) {
                document.getElementById('gateway').classList.add('hidden');
                localStorage.setItem(storageKey, val);
            }
        }
        if(!${isLocked} || localStorage.getItem(storageKey)) document.getElementById('gateway').classList.add('hidden');
    </script>
</body>
</html>`;
  };

  const handlePreview = () => {
    console.log('handlePreview appelé, items actuels:', items);
    
    if (items.length === 0) {
      showNotification('⚠️ Vous n\'avez ajouté aucun contenu ! Remplissez le formulaire et cliquez sur "AJOUTER LE CONTENU" avant de prévisualiser.', 'warning');
      return;
    }
    
    const indexHTML = generateHTML();
    console.log('HTML généré pour prévisualisation, longueur:', indexHTML.length);
    setPreviewModalHtml(indexHTML);
    showNotification('👁️ Prévisualisation du clone activée', 'success');
  };

  const handleDownload = async () => {
    console.log('handleDownload appelé, items actuels:', items);
    
    if (items.length === 0) {
      showNotification('⚠️ Vous n\'avez ajouté aucun contenu ! Remplissez le formulaire et cliquez sur "AJOUTER LE CONTENU" avant de télécharger.', 'warning');
      return;
    }
    
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const indexHTML = generateHTML();
      console.log('HTML généré, longueur:', indexHTML.length);
      zip.file("index.html", indexHTML);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `STARCODE_STUDIO_${siteConfig.projectName || 'CLONE'}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      showNotification('✅ Archive ZIP générée et téléchargée avec succès !', 'success');
    } catch (err: any) {
      showNotification('❌ Erreur lors de la génération ZIP: ' + (err?.message || 'Erreur inconnue'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const publishToGitHub = async () => {
    if (!githubToken.trim()) {
      setErrorMessage('Token GitHub requis');
      setPublishStatus('error');
      showNotification('⚠️ Token GitHub requis pour le déploiement', 'warning');
      return;
    }

    if (items.length === 0) {
      showNotification('⚠️ Vous n\'avez ajouté aucun contenu ! Ajoutez du contenu avant de publier.', 'warning');
      return;
    }

    setIsPublishing(true);
    setErrorMessage('');
    
    try {
      // Étape 1: Créer le repository
      setPublishStatus('creating');
      const repoName = siteConfig.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const createRepoRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: repoName,
          description: `Site créé avec Star Code Studio - ${siteConfig.title}`,
          private: false,
          auto_init: false
        })
      });

      if (!createRepoRes.ok) {
        const errorData = await createRepoRes.json();
        throw new Error(errorData.message || 'Impossible de créer le repository');
      }

      const repoData = await createRepoRes.json();
      const owner = repoData.owner.login;

      // Étape 2: Pousser le fichier index.html
      setPublishStatus('pushing');
      const htmlContent = generateHTML();
      const base64Content = btoa(unescape(encodeURIComponent(htmlContent)));

      const pushRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/index.html`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Initial commit - ${siteConfig.title}`,
          content: base64Content,
          branch: 'main'
        })
      });

      if (!pushRes.ok) {
        const errorData = await pushRes.json();
        throw new Error(errorData.message || 'Impossible de pousser le code');
      }

      // Étape 3: Activer GitHub Pages
      setPublishStatus('pages');
      const pagesRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: {
            branch: 'main',
            path: '/'
          }
        })
      });

      if (!pagesRes.ok) {
        // GitHub Pages peut déjà être activé, ce n'est pas une erreur fatale
        console.warn('GitHub Pages activation warning:', await pagesRes.json());
      }

      // Succès
      const siteUrl = `https://${owner}.github.io/${repoName}/`;
      setPublishedUrl(siteUrl);
      setPublishStatus('success');

    } catch (error: any) {
      console.error('GitHub publish error:', error);
      setErrorMessage(error.message || 'Erreur lors de la publication');
      setPublishStatus('error');
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-32">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* DASHBOARD EDITION */}
        <div className="lg:col-span-8 space-y-10">
          <div className="bg-slate-900/40 border border-white/10 rounded-[4.5rem] p-8 md:p-12 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-40"></div>
            
            <header className="flex items-center justify-between mb-12 md:mb-20">
              <div className="flex items-center gap-4 md:gap-8">
                <div className="p-4 md:p-6 bg-cyan-500/10 rounded-3xl border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                  <Zap className="text-cyan-400 w-6 h-6 md:w-8 md:h-8 fill-cyan-400" />
                </div>
                <div>
                  <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white">{siteConfig.projectName || "STAR_CORE"}</h2>
                  <p className="text-cyan-500/60 text-[10px] font-black uppercase tracking-[0.6em] mt-1 italic">Star Code Engine v4.0</p>
                </div>
              </div>
              <div className="hidden md:flex flex-col items-end">
                <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                   IP: {user?.ip || "Liaison..."}
                </div>
                <div className="text-[8px] font-black uppercase text-cyan-500/30 tracking-[0.4em] mt-2">Développé par Astarté</div>
              </div>
            </header>

            <div className="space-y-8">
              {/* Formulaire principal */}
              <div className="p-8 bg-black/60 rounded-[3rem] border border-white/10 shadow-inner space-y-6">
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 mb-4">
                  <p className="text-cyan-400 text-sm font-bold">
                    ⚠️ IMPORTANT : Remplissez les champs ci-dessous, puis cliquez sur "AJOUTER LE CONTENU" pour sauvegarder. Vous pouvez ajouter plusieurs contenus avant de télécharger.
                  </p>
                </div>
                <div className="space-y-5">
                  <input 
                    value={newItem.title} 
                    onChange={e => setNewItem({...newItem, title: e.target.value})} 
                    placeholder="TITRE DU CONTENU..." 
                    className="w-full bg-transparent border border-white/10 rounded-2xl px-6 py-4 outline-none font-black uppercase placeholder:text-slate-700 text-lg focus:border-cyan-500 transition-all" 
                  />
                  <textarea 
                    value={newItem.description} 
                    onChange={e => setNewItem({...newItem, description: e.target.value})} 
                    placeholder="TEXTE / DESCRIPTION..." 
                    rows={3}
                    className="w-full bg-transparent border border-white/10 rounded-2xl px-6 py-4 outline-none placeholder:text-slate-700 font-bold focus:border-cyan-500 transition-all resize-none" 
                  />
                  <input 
                    value={newItem.link} 
                    onChange={e => setNewItem({...newItem, link: e.target.value})} 
                    placeholder="LIEN DE REDIRECTION (OPTIONNEL)..." 
                    className="w-full bg-transparent border border-white/10 rounded-2xl px-6 py-4 outline-none placeholder:text-slate-700 font-bold focus:border-cyan-500 transition-all text-sm" 
                  />
                </div>

                {/* BOUTON AJOUTER - TRÈS VISIBLE */}
                <button 
                  onClick={addItem} 
                  disabled={!newItem.title || !newItem.description}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-6 rounded-2xl font-black uppercase text-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(6,182,212,0.5)] border-2 border-cyan-400 animate-pulse disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:animate-none"
                >
                   <PlusCircle className="w-6 h-6" /> ⚡ AJOUTER LE CONTENU ⚡
                </button>
                
                {/* Message d'aide - seulement si aucun item n'a encore été ajouté */}
                {(!newItem.title || !newItem.description) && items.length === 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-3 text-center">
                    <p className="text-yellow-400 text-sm font-bold">
                      💡 Remplissez le TITRE et la DESCRIPTION, puis cliquez sur le bouton ci-dessus
                    </p>
                  </div>
                )}
                
                {/* Message de succès après ajout */}
                {items.length > 0 && (!newItem.title || !newItem.description) && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-3 text-center">
                    <p className="text-green-400 text-sm font-bold">
                      ✅ {items.length} contenu{items.length > 1 ? 's' : ''} ajouté{items.length > 1 ? 's' : ''} ! Remplissez à nouveau pour en ajouter d'autres.
                    </p>
                  </div>
                )}

                {/* Options multimédia */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">📷 Type de média</label>
                      <select 
                        value={newItem.mediaType} 
                        onChange={e => setNewItem({...newItem, mediaType: e.target.value as any})}
                        className="w-full bg-black/80 border-2 border-cyan-500/30 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 transition-all"
                      >
                        <option value="none">Aucun média</option>
                        <option value="image">🖼️ Image</option>
                        <option value="video">🎥 Vidéo</option>
                      </select>
                    </div>

                    {newItem.mediaType !== 'none' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">🔗 URL du média (obligatoire)</label>
                        <input 
                          value={newItem.mediaUrl} 
                          onChange={e => setNewItem({...newItem, mediaUrl: e.target.value})} 
                          placeholder="https://exemple.com/image.jpg" 
                          className="w-full bg-black/80 border-2 border-cyan-500/30 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 transition-all placeholder:text-slate-600" 
                        />
                      </div>
                    )}
                  </div>

                  {newItem.mediaType !== 'none' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">📍 Position du média</label>
                        <select 
                          value={newItem.mediaPosition} 
                          onChange={e => setNewItem({...newItem, mediaPosition: e.target.value as any})}
                          className="w-full bg-black/80 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 transition-all"
                        >
                          <option value="top">⬆️ Haut (au-dessus du texte)</option>
                          <option value="bottom">⬇️ Bas (en-dessous du texte)</option>
                          <option value="left">⬅️ Gauche (texte à droite)</option>
                          <option value="right">➡️ Droite (texte à gauche)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">📏 Taille du texte</label>
                        <select 
                          value={newItem.fontSize} 
                          onChange={e => setNewItem({...newItem, fontSize: e.target.value})}
                          className="w-full bg-black/80 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 transition-all"
                        >
                          <option value="1.2rem">Petit</option>
                          <option value="1.7rem">Normal</option>
                          <option value="2.2rem">Grand</option>
                          <option value="2.8rem">Très grand</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {newItem.mediaType !== 'none' && !newItem.mediaUrl && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                      <p className="text-yellow-400 text-xs font-bold">
                        ⚠️ Vous avez sélectionné {newItem.mediaType === 'image' ? 'une image' : 'une vidéo'} mais l'URL est vide. L'URL est obligatoire pour afficher le média.
                      </p>
                    </div>
                  )}
                </div>
                {items.length > 0 && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-3 text-center">
                    <p className="text-green-400 text-sm font-bold">
                      ✅ {items.length} contenu{items.length > 1 ? 's' : ''} ajouté{items.length > 1 ? 's' : ''} ! Vous pouvez en ajouter d'autres ou télécharger.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                {items.length > 0 && (
                  <div className="text-center py-4 text-cyan-400 font-black uppercase tracking-wider text-sm">
                    📦 {items.length} contenu{items.length > 1 ? 's' : ''} dans votre site
                  </div>
                )}
                {items.length === 0 ? (
                  <div className="text-center py-20 px-6 border-2 border-dashed border-white/10 rounded-[4rem] group hover:border-cyan-500/30 transition-all space-y-6">
                    <Sparkles className="w-12 h-12 mx-auto text-cyan-400/60 animate-pulse" />
                    <div className="opacity-50 uppercase font-black tracking-[1.2em] text-[10px]">
                      Archive Star Code Vide
                    </div>
                    <button
                      type="button"
                      onClick={loadSampleResource}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-2xl text-cyan-300 text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:scale-105 active:scale-95"
                    >
                      <PlusCircle className="w-4 h-4" /> Charger un exemple de ressource
                    </button>
                  </div>
                ) : (
                  items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/5 p-8 rounded-[3rem] hover:border-cyan-500/40 transition-all group backdrop-blur-md hover:bg-white/10 relative overflow-hidden">
                      <div className="absolute left-0 top-0 w-1 h-full bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex items-center gap-6 flex-1 min-w-0">
                        {/* Aperçu média */}
                        {item.mediaType && item.mediaType !== 'none' && item.mediaUrl && (
                          <div className="flex-shrink-0">
                            {item.mediaType === 'image' ? (
                              <img src={item.mediaUrl} alt="" className="w-20 h-20 rounded-2xl object-cover border border-white/10" />
                            ) : (
                              <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                <span className="text-cyan-500 text-2xl">▶</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-2 opacity-70 italic">
                            {item.meta}
                            {item.mediaType && item.mediaType !== 'none' && (
                              <span className="ml-3 text-slate-500">• {item.mediaType} • {item.mediaPosition === 'top' ? 'Haut' : item.mediaPosition === 'bottom' ? 'Bas' : item.mediaPosition === 'left' ? 'Gauche' : 'Droite'}</span>
                            )}
                          </div>
                          <div className="font-black text-xl md:text-2xl uppercase truncate pr-10 tracking-tighter italic">{item.title}</div>
                          {item.description && (
                            <div className="text-sm text-slate-400 mt-2 truncate">{item.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-4">
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="p-5 bg-white/5 rounded-2xl text-slate-500 hover:text-cyan-400 transition-all border border-transparent hover:border-cyan-500/30"><ExternalLink className="w-6 h-6" /></a>
                        )}
                        <button onClick={() => removeItem(idx)} className="p-5 bg-red-500/5 text-red-500/20 hover:text-red-500 rounded-2xl transition-all border border-transparent hover:border-red-500/30"><Trash2 className="w-6 h-6" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SIDEBAR EXPORT */}
        <div className="lg:col-span-4 space-y-10">
          <section className="bg-slate-900/40 border border-white/10 rounded-[4.5rem] p-8 md:p-12 shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-5 text-cyan-500 group-hover:scale-110 transition-transform"><Palette className="w-32 h-32" /></div>
            <h3 className="text-[12px] font-black uppercase tracking-[0.6em] mb-12 flex items-center gap-4 text-slate-400 italic">
              <Palette className="w-5 h-5 text-cyan-500" /> Profil Visuel
            </h3>
            <div className="grid grid-cols-3 gap-5 mb-10">
              {themes.map(t => (
                <button 
                  key={t.id}
                  onClick={() => setSiteConfig({...siteConfig, theme: t.id, primaryColor: t.color})}
                  className={`flex flex-col items-center gap-4 p-5 rounded-[2rem] border-2 transition-all ${siteConfig.theme === t.id ? 'border-cyan-500 bg-cyan-500/10 scale-110 shadow-[0_0_30px_rgba(6,182,212,0.2)]' : 'border-transparent opacity-40 hover:opacity-100 hover:bg-white/5'}`}
                >
                  <div className="w-12 h-12 rounded-full shadow-2xl border border-white/10" style={{ backgroundColor: t.color }} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* GITHUB PUBLISH SECTION */}
          <section className="bg-slate-900/40 border border-white/10 rounded-[4.5rem] p-8 md:p-12 shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
            <h3 className="text-[12px] font-black uppercase tracking-[0.6em] mb-8 flex items-center gap-4 text-slate-400 italic">
              <Github className="w-5 h-5 text-cyan-500" /> Publier sur GitHub
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest">
                  Token GitHub Personnel
                </label>
                <input 
                  type="password"
                  value={githubToken}
                  onChange={e => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:border-cyan-500 outline-none transition-all placeholder:text-slate-700 font-mono"
                  disabled={isPublishing}
                />
                <p className="text-[9px] text-slate-600 ml-2 leading-relaxed">
                  Créez un token sur <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">github.com/settings/tokens</a> avec les permissions <span className="text-cyan-400">repo</span>
                </p>
              </div>

              <button 
                onClick={publishToGitHub}
                disabled={isPublishing || !githubToken.trim()}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black py-6 rounded-[2rem] flex items-center justify-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(6,182,212,0.3)] group relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="animate-spin w-6 h-6" />
                    <span className="uppercase tracking-wide text-lg font-black">
                      {publishStatus === 'creating' && 'Création du repo...'}
                      {publishStatus === 'pushing' && 'Envoi du code...'}
                      {publishStatus === 'pages' && 'Activation Pages...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Github className="w-6 h-6" />
                    <span className="uppercase tracking-wide text-lg font-black">PUBLIER SUR GITHUB</span>
                  </>
                )}
              </button>

              {/* Status Messages */}
              {publishStatus === 'success' && publishedUrl && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <span className="text-green-400 font-black text-sm uppercase tracking-wide">Publié avec succès !</span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 rounded-xl p-3">
                    <span className="text-cyan-400 text-xs font-mono truncate flex-1">{publishedUrl}</span>
                    <button 
                      onClick={() => copyToClipboard(publishedUrl)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-all"
                    >
                      <Copy className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <a 
                    href={publishedUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full bg-green-500 text-black font-black py-3 rounded-xl text-center uppercase text-sm tracking-wide hover:bg-green-400 transition-all"
                  >
                    Ouvrir le site ↗
                  </a>
                  <p className="text-[9px] text-slate-500 text-center">
                    ⏱ Le site peut prendre 1-2 minutes pour être accessible
                  </p>
                </div>
              )}

              {publishStatus === 'error' && errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                    <span className="text-red-400 font-black text-sm uppercase tracking-wide">Erreur</span>
                  </div>
                  <p className="text-red-300/80 text-xs mt-3 leading-relaxed">{errorMessage}</p>
                </div>
              )}
            </div>
          </section>

          {/* EXPORT SECTION */}
          <section className="bg-slate-900/40 border border-white/10 rounded-[4.5rem] p-8 md:p-12 shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
            <h3 className="text-[12px] font-black uppercase tracking-[0.6em] mb-14 flex items-center gap-4 text-slate-400 italic">
              <Settings className="w-5 h-5 text-cyan-500" /> Exportation Studio
            </h3>
            
            {/* PREVIEW BUTTON */}
            <button 
              onClick={handlePreview}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black py-8 rounded-[2.5rem] flex items-center justify-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(168,85,247,0.4)] border-2 border-purple-400 group relative overflow-hidden mb-6"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="uppercase tracking-wide text-xl font-black">PRÉVISUALISER</span>
            </button>
            
            {/* DOWNLOAD ZIP BUTTON */}
            <button 
              onClick={handleDownload} 
              disabled={isExporting} 
              className="w-full bg-blue-500 text-white font-black py-12 rounded-[3.5rem] flex items-center justify-center gap-6 hover:scale-105 active:scale-95 transition-all shadow-[0_0_60px_rgba(59,130,246,0.6),0_40px_80px_rgba(59,130,246,0.4)] hover:shadow-[0_0_80px_rgba(59,130,246,0.8),0_50px_100px_rgba(59,130,246,0.6)] border-2 border-blue-400 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isExporting ? <Loader2 className="animate-spin w-10 h-10" /> : <Download className="w-10 h-10 group-hover:bounce" />}
              <span className="uppercase tracking-wide text-2xl md:text-3xl font-black">TÉLÉCHARGER ZIP</span>
            </button>
            <div className="mt-12 text-center">
              <div className="text-[8px] font-black uppercase text-cyan-500/40 tracking-[0.6em] mb-2 animate-pulse">Studio de Clonage Certifié</div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Développé par Astarté</div>
            </div>
          </section>
          
          <div className="text-center opacity-10 text-[11px] font-black uppercase tracking-[1em] italic pt-10">
             STAR CODE STUDIO
          </div>
        </div>

      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-6 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-3 text-sm font-bold ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-[0_10px_30px_rgba(16,185,129,0.2)]'
              : notification.type === 'warning'
              ? 'bg-amber-950/90 border-amber-500/40 text-amber-200 shadow-[0_10px_30px_rgba(245,158,11,0.2)]'
              : 'bg-rose-950/90 border-rose-500/40 text-rose-200 shadow-[0_10px_30px_rgba(244,63,94,0.2)]'
          }`}>
            <span>{notification.text}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* In-App Preview Modal */}
      {previewModalHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full h-full max-w-6xl bg-slate-900 border border-cyan-500/30 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-cyan-400" />
                <span className="font-black text-white uppercase text-sm tracking-widest">
                  Aperçu du clone : <span className="text-cyan-400">{siteConfig.projectName || siteConfig.title}</span>
                </span>
              </div>

              {/* Device Viewport Selector */}
              <div className="flex items-center bg-black/50 border border-white/10 rounded-2xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    previewDevice === 'desktop' ? 'bg-cyan-500 text-black shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Écran Ordinateur (100%)"
                >
                  <Monitor className="w-3.5 h-3.5" /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('tablet')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    previewDevice === 'tablet' ? 'bg-cyan-500 text-black shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Tablette (768px)"
                >
                  <Tablet className="w-3.5 h-3.5" /> Tablette
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    previewDevice === 'mobile' ? 'bg-cyan-500 text-black shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mobile (390px)"
                >
                  <Smartphone className="w-3.5 h-3.5" /> Mobile
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([previewModalHtml], { type: 'text/html;charset=utf-8' });
                    const blobUrl = URL.createObjectURL(blob);
                    window.open(blobUrl, '_blank');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all"
                  title="Ouvrir dans un nouvel onglet"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Nouvel Onglet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewModalHtml(null)}
                  className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-full transition-all"
                  title="Fermer la prévisualisation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Iframe Viewport */}
            <div className="flex-1 bg-black/90 overflow-auto flex items-center justify-center p-4">
              <div
                className={`h-full transition-all duration-300 bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 ${
                  previewDevice === 'desktop'
                    ? 'w-full'
                    : previewDevice === 'tablet'
                    ? 'w-[768px] max-w-full'
                    : 'w-[390px] max-w-full'
                }`}
              >
                <iframe
                  title="Prévisualisation Studio"
                  srcDoc={previewModalHtml}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
