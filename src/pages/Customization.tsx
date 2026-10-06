import React, { useState } from 'react';
import { SiteConfig, UserData } from '../types';
import {
  Trash2, PlusCircle, ExternalLink, Download, Sparkles,
  Palette, Settings, Loader2, Zap, Github, CheckCircle, AlertCircle, Copy,
  Eye, Monitor, Tablet, Smartphone, X, Image as ImageIcon, Film, Type,
  PencilRuler, Link2, FileText, Info, UploadCloud, FileImage,
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
  localFileName?: string;
  localDataUrl?: string;
}

/**
 * Résout et valide une URL de média pour déterminer comment elle doit être rendue.
 * Problèmes courants corrigés :
 *  - Liens Google Images/DuckDuckGo de redirection (imgres?imgurl=..., /url?url=..., iu=)
 *    qui pointent vers une page HTML et ne s'affichent jamais dans une balise <img>.
 *  - Liens YouTube (youtu.be/xxx, youtube.com/watch?v=xxx) qui ne peuvent pas être
 *    chargés dans une balise <video> (doivent être intégrés via une iframe).
 *
 * @returns { type: 'image' | 'video' | 'youtube' | 'unsupported', url, isDirect }
 */
type MediaResolution =
  | { type: 'image'; url: string; isDirect: boolean }
  | { type: 'video'; url: string; isDirect: boolean }
  | { type: 'youtube'; url: string; videoId: string; isDirect: false }
  | { type: 'unsupported'; url: string; isDirect: false };

function isDirectImageUrl(url: string): boolean {
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp|svg|avif|ico)(\/.*)?$/i.test(clean);
}

function isDirectVideoUrl(url: string): boolean {
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  return /\.(mp4|webm|ogv|ogg|mov)(\/.*)?$/i.test(clean);
}

function isYoutubeUrl(url: string): boolean {
  return /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(url);
}

function getYoutubeId(url: string): string | null {
  const u = new URL(url);
  if (u.hostname.includes('youtu.be')) {
    return u.pathname.slice(1).split('/')[0] || null;
  }
  if (u.pathname === '/watch') {
    return u.searchParams.get('v');
  }
  const m = u.pathname.match(/\/(embed|shorts)\/([\w-]{6,})/);
  return m ? m[2] : null;
}

function resolveMediaUrl(raw: string | undefined): MediaResolution {
  const empty: MediaResolution = { type: 'unsupported', url: '', isDirect: false };
  if (!raw || typeof raw !== 'string') return empty;

  const trimmed = raw.trim();
  if (!trimmed) return empty;
  if (!/^https?:\/\//i.test(trimmed)) return { type: 'unsupported', url: trimmed, isDirect: false };

  try {
    const url = new URL(trimmed);
    const search = url.searchParams;

    // 1) Liens YouTube -> intégration par iframe.
    if (isYoutubeUrl(trimmed)) {
      const videoId = getYoutubeId(trimmed);
      if (videoId) {
        return {
          type: 'youtube',
          url: `https://www.youtube.com/embed/${videoId}`,
          videoId,
          isDirect: false,
        };
      }
    }

    // 2) Redirections de moteurs de recherche pointant vers une ressource.
    //    a) Google Images : imgurl=URL_IMAGE
    let target = search.get('imgurl') || search.get('iu');
    if (target) {
      target = target.startsWith('//') ? 'https:' + target : target;
      const t = decodeURIComponent(target);
      return {
        type: isDirectVideoUrl(t) ? 'video' : 'image',
        url: t,
        isDirect: isDirectImageUrl(t) || isDirectVideoUrl(t),
      };
    }

    //    b) Redirection "url=" de www.google.com/url?url=... (renvoie souvent une page).
    const urlParam = search.get('url');
    if (urlParam && url.hostname.includes('google')) {
      const t = decodeURIComponent(urlParam);
      return {
        type: isDirectVideoUrl(t) ? 'video' : 'image',
        url: t,
        isDirect: isDirectImageUrl(t) || isDirectVideoUrl(t),
      };
    }
  } catch {
    // URL malformée : on renverra une tentative directe.
  }

  // 3) Fichier média direct.
  if (isDirectImageUrl(trimmed)) return { type: 'image', url: trimmed, isDirect: true };
  if (isDirectVideoUrl(trimmed)) return { type: 'video', url: trimmed, isDirect: true };

  // 4) Autre : on ne peut pas garantir l'affichage dans une balise média.
  return { type: 'image', url: trimmed, isDirect: false };
}

/**
 * Lit un fichier sélectionné via upload/drag & drop et retourne son contenu
 * encodé en base64 (Data URL) pour prévisualisation locale dans l'éditeur.
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
    reader.readAsDataURL(file);
  });
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
    fontSize: '1.7rem',
    localFileName: '',
    localDataUrl: '',
  });
  const [isExporting, setIsExporting] = useState(false);

  const [githubToken, setGithubToken] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'creating' | 'pushing' | 'pages' | 'success' | 'error'>('idle');
  const [publishedUrl, setPublishedUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [previewModalHtml, setPreviewModalHtml] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const showNotification = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(prev => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const handleLocalFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification('Seuls les fichiers image (JPG, PNG, WEBP, GIF, SVG) sont acceptés.', 'warning');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showNotification('Image trop volumineuse (8 Mo maximum).', 'warning');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const safeName = `media_${Date.now()}.${ext}`;
      setNewItem(prev => ({
        ...prev,
        mediaType: 'image',
        localDataUrl: dataUrl,
        localFileName: safeName,
        mediaUrl: '',
      }));
      showNotification('Image chargée. Elle sera incluse dans le ZIP.', 'success');
    } catch {
      showNotification("Impossible de lire l'image sélectionnée.", 'error');
    }
  };

  const loadSampleResource = () => {
    const sample: ResourceItem = {
      title: "Manuel d'Architecture Astarté 2026",
      description: "Ce document de référence rassemble l'ensemble des spécifications technologiques, modules d'optimisation haute performance et modèles de déploiement autonome.",
      link: "https://example.com/guide-astarte",
      meta: "GUIDE PDF",
      mediaType: "none",
      fontSize: "1.7rem",
      localFileName: '',
      localDataUrl: '',
    };
    setItems(prev => [...prev, sample]);
    showNotification("Ressource d'exemple ajoutée avec succès !", 'success');
  };

  const addItem = () => {
    if (!newItem.title.trim() || !newItem.description.trim()) {
      showNotification('Le titre et la description sont obligatoires !', 'warning');
      return;
    }
    if (newItem.mediaType !== 'none' && !newItem.mediaUrl?.trim() && !newItem.localDataUrl) {
      showNotification(
        "Type de média sélectionné mais média vide. Choisissez un fichier, collez une URL ou sélectionnez « Aucun média ».",
        'warning',
      );
      return;
    }
    setItems([...items, { ...newItem, localFileName: newItem.localDataUrl ? (newItem.localFileName || `media_${items.length + 1}_${Date.now()}.jpg`) : '' }]);
    setNewItem({
      title: '',
      description: '',
      link: '',
      meta: 'PDF',
      mediaType: 'none',
      mediaUrl: '',
      mediaPosition: 'top',
      fontSize: '1.7rem',
      localFileName: '',
      localDataUrl: '',
    });
    showNotification('Contenu ajouté avec succès !', 'success');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const themes: { id: SiteConfig['theme']; color: string; label: string }[] = [
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

  const generateHTML = (opts: { inlineLocalMedia?: boolean } = {}) => {
    const isLocked = siteConfig.template === 'locked';
    const accentColor = themes.find(t => t.id === siteConfig.theme)?.color || '#06b6d4';
    const developerName = escapeHTML(user?.firstName || 'Astarté');
    const contactEmail = escapeHTML(user?.email || 'contact');

    const contentHTML =
      items.length > 0
        ? items
            .map(item => {
              const fontSize = item.fontSize || '1.7rem';
              const hasMedia = item.mediaType && item.mediaType !== 'none' && (item.mediaUrl || item.localDataUrl);
              const hasLink = item.link && item.link.trim() !== '';

              let mediaHTML = '';
              if (hasMedia) {
                const position = item.mediaPosition || 'top';
                const isFloating = position === 'left' || position === 'right';
                const floatStyle = isFloating
                  ? position === 'left'
                    ? 'float: left; width: 45%; margin-right: 2rem; margin-bottom: 1rem;'
                    : 'float: right; width: 45%; margin-left: 2rem; margin-bottom: 1rem;'
                  : 'width: 100%; margin: 2rem 0;';
                const blockStyle = `${floatStyle} height: auto; border-radius: 1rem; display: block;`;

                // Image locale uploadée : on la référence par son nom dans le ZIP,
                // ou on embarque son contenu base64 pour la prévisualisation/publish.
                const localImage = item.localDataUrl
                  ? opts.inlineLocalMedia
                    ? item.localDataUrl
                    : item.localFileName || 'media.jpg'
                  : '';

                // Un lien YouTube est toujours intégré via une iframe, quel que soit le type choisi.
                const media = item.mediaUrl ? resolveMediaUrl(item.mediaUrl) : null;
                if (media?.type === 'youtube') {
                  mediaHTML = `<div style="position: relative; width: 100%; aspect-ratio: 16 / 9; margin: 2rem 0; ${isFloating ? 'float: ' + position + '; width: 45%; margin-left:' + (position === 'right' ? '2rem;' : '0;') + ' margin-right:' + (position === 'left' ? '2rem;' : '0;') : ''}"><iframe src="${media.url}" title="${escapeHTML(item.title)}" style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0; border-radius: 1rem;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
                } else if (item.mediaType === 'image') {
                  if (localImage) {
                    mediaHTML = `<img src="${localImage}" alt="${escapeHTML(item.title)}" style="${blockStyle}" ${localImage.startsWith('data:') ? '' : 'loading="lazy"'} />`;
                  } else if (media && media.url && media.isDirect) {
                    mediaHTML = `<img src="${escapeHTML(media.url)}" alt="${escapeHTML(item.title)}" style="${blockStyle}" loading="lazy" />`;
                  } else {
                    mediaHTML = `<a href="${escapeHTML(item.mediaUrl)}" target="_blank" rel="noopener" style="display: inline-block; margin: 2rem 0; ${isFloating ? 'float: ' + position + '; width: 45%; margin-left:' + (position === 'right' ? '2rem;' : '0;') + ' margin-right:' + (position === 'left' ? '2rem;' : '0;') : ''} padding: 2rem; border: 1px dashed rgba(255,255,255,0.2); border-radius: 1rem; text-align: center; color: var(--accent); font-weight: 600; text-decoration: none;">Voir l\'image &rarr;</a>`;
                  }
                } else if (item.mediaType === 'video') {
                  if (media && media.type === 'video' && media.isDirect) {
                    mediaHTML = `<video src="${escapeHTML(media.url)}" style="${blockStyle}" controls preload="metadata"></video>`;
                  } else {
                    mediaHTML = `<a href="${escapeHTML(item.mediaUrl)}" target="_blank" rel="noopener" style="display: inline-block; margin: 2rem 0; ${isFloating ? 'float: ' + position + '; width: 45%; margin-left:' + (position === 'right' ? '2rem;' : '0;') + ' margin-right:' + (position === 'left' ? '2rem;' : '0;') : ''} padding: 2rem; border: 1px dashed rgba(255,255,255,0.2); border-radius: 1rem; text-align: center; color: var(--accent); font-weight: 600; text-decoration: none;">Voir la vid\'eo &rarr;</a>`;
                  }
                }
              }

              const titleHTML = `<h2 style="font-size: ${fontSize}; font-weight: 900; text-transform: uppercase; margin-bottom: 1.5rem; color: var(--text); letter-spacing: -0.02em;">${escapeHTML(item.title)}</h2>`;
              const descriptionHTML = item.description
                ? `<p style="text-align: justify; line-height: 1.8; font-weight: 400; color: var(--text); margin-bottom: 3rem; font-size: 1.1rem;">${escapeHTML(item.description)}</p>`
                : '';
              const linkHTML = hasLink
                ? `<a href="${item.link}" target="_blank" style="display: inline-block; margin-top: 1rem; color: var(--accent); text-decoration: underline; font-weight: 600;">Voir plus &rarr;</a>`
                : '';

              const position = item.mediaPosition || 'top';
              const mediaTop = position === 'top' ? mediaHTML : '';
              const mediaBottom = position === 'bottom' ? mediaHTML : '';
              const mediaLeft = position === 'left' ? mediaHTML : '';
              const mediaRight = position === 'right' ? mediaHTML : '';

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
            })
            .join('')
        : '<div style="text-align: center; padding: 4rem; opacity: 0.5; font-size: 1.2rem; color: var(--text);">Aucun contenu disponible pour le moment.</div>';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(siteConfig.title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;900&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
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
        h1 { font-size: clamp(2.5rem, 8vw, 5.5rem); font-weight: 900; color: var(--accent); text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: -0.07em; text-shadow: 0 0 40px rgba(6,182,212,0.4); }
        .credit { text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5em; opacity: 0.5; margin-bottom: 3rem; font-weight: 900; color: var(--accent); }
        .content-area { max-width: 100%; }
        article { max-width: 100%; margin-bottom: 4rem; padding-bottom: 4rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
        article img { max-width: 100%; height: auto; display: block; border-radius: 1rem; margin: 2rem 0; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
        article video { max-width: 100%; height: auto; display: block; border-radius: 1rem; margin: 2rem 0; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
        article img[style*="float"] { margin: 0 2rem 1rem 0; }
        article video[style*="float"] { margin: 0 2rem 1rem 0; }
        footer { margin-top: 12rem; text-align: center; opacity: 0.3; font-size: 0.7rem; text-transform: uppercase; font-weight: 900; letter-spacing: 0.7em; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4rem; }
        #gateway { position: fixed; inset: 0; background: #020617; z-index: 1000; display: flex; align-items: center; justify-content: center; text-align: center; backdrop-filter: blur(50px); }
        .hidden { display: none !important; }
        .gate-box { background: rgba(255,255,255,0.02); padding: 5rem; border-radius: 3rem; border: 1px solid rgba(255,255,255,0.1); width: 90%; max-width: 550px; box-shadow: 0 50px 120px rgba(0,0,0,0.6); }
        input { background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1); padding: 1.8rem 2rem; border-radius: 2rem; color: #fff; width: 100%; outline: none; margin-bottom: 2rem; font-family: inherit; font-weight: 900; text-align: center; font-size: 1.3rem; }
        .btn { background: var(--accent); color: #000; padding: 2rem 3rem; border-radius: 2rem; font-weight: 900; border: none; cursor: pointer; text-transform: uppercase; width: 100%; transition: 0.4s; font-size: 1.1rem; letter-spacing: 0.1em; }
        .btn:hover { transform: scale(1.05); filter: brightness(1.2); box-shadow: 0 15px 40px rgba(6,182,212,0.4); }
        @media (max-width: 640px) { .container { padding: 4rem 1.25rem; } }
    </style>
</head>
<body>
    <div class="galaxy"><div class="stars"></div></div>
    <div id="gateway" class="${isLocked ? '' : 'hidden'}">
        <div class="gate-box">
            <h2 style="margin-bottom:3rem; font-weight:900; font-size:2.5rem; text-transform:uppercase; letter-spacing:-0.05em;">Acc&egrave;s Studio</h2>
            <input type="text" id="pass" placeholder="Clé d'activation..." autocomplete="off">
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

  const handlePreview = async () => {
    if (items.length === 0) {
      showNotification('Aucun contenu ajouté ! Ajoutez du contenu avant de prévisualiser.', 'warning');
      return;
    }
    const html = generateHTML({ inlineLocalMedia: true });
    setPreviewModalHtml(html);
    setPreviewUrl(null);
    showNotification('Prévisualisation du clone activée', 'success');

    // On publie le HTML sur une URL HTTP same-origin pour que les embeds
    // YouTube reçoivent un Referer valide (sinon erreur 153 via blob/srcdoc).
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.url) setPreviewUrl(data.url);
      }
    } catch {
      // Repli silencieux sur srcDoc si le endpoint est indisponible.
    }
  };

  const handleDownload = async () => {
    if (items.length === 0) {
      showNotification('Aucun contenu ajouté ! Ajoutez du contenu avant de télécharger.', 'warning');
      return;
    }
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const html = generateHTML();
      zip.file('index.html', html);

      // Embarquer les images locales uploadées comme fichiers séparés dans le ZIP.
      const usedNames = new Set<string>();
      items.forEach(item => {
        if (item.mediaType === 'image' && item.localDataUrl && item.localFileName) {
          const name = item.localFileName;
          if (usedNames.has(name)) return;
          usedNames.add(name);
          zip.file(name, item.localDataUrl.split(',')[1] || '', { base64: true });
        }
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `STARCODE_STUDIO_${siteConfig.projectName || 'CLONE'}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      showNotification('Archive ZIP générée et téléchargée avec succès !', 'success');
    } catch (err: any) {
      showNotification('Erreur lors de la génération ZIP: ' + (err?.message || 'Erreur inconnue'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const publishToGitHub = async () => {
    if (!githubToken.trim()) {
      setErrorMessage('Token GitHub requis');
      setPublishStatus('error');
      showNotification('Token GitHub requis pour le déploiement', 'warning');
      return;
    }
    if (items.length === 0) {
      showNotification('Aucun contenu ajouté ! Ajoutez du contenu avant de publier.', 'warning');
      return;
    }

    setIsPublishing(true);
    setErrorMessage('');

    try {
      setPublishStatus('creating');
      const repoName = siteConfig.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');

      const createRepoRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoName,
          description: `Site créé avec Star Code Studio - ${siteConfig.title}`,
          private: false,
          auto_init: false,
        }),
      });

      if (!createRepoRes.ok) {
        const errorData = await createRepoRes.json();
        throw new Error(errorData.message || 'Impossible de créer le repository');
      }

      const repoData = await createRepoRes.json();
      const owner = repoData.owner.login;

      setPublishStatus('pushing');
      const htmlContent = generateHTML({ inlineLocalMedia: true });
      const base64Content = btoa(unescape(encodeURIComponent(htmlContent)));

      const pushRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/index.html`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Initial commit - ${siteConfig.title}`,
          content: base64Content,
          branch: 'main',
        }),
      });

      if (!pushRes.ok) {
        const errorData = await pushRes.json();
        throw new Error(errorData.message || 'Impossible de pousser le code');
      }

      setPublishStatus('pages');
      const pagesRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pages`, {
        method: 'POST',
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: { branch: 'main', path: '/' } }),
      });

      if (!pagesRes.ok) {
        console.warn('GitHub Pages activation warning:', await pagesRes.json());
      }

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
    showNotification('URL copiée dans le presse-papier', 'success');
  };

  const publishStatusLabel =
    publishStatus === 'creating'
      ? 'Création du dépôt...'
      : publishStatus === 'pushing'
      ? 'Envoi du code...'
      : publishStatus === 'pages'
      ? 'Activation Pages...'
      : '';

  const renderUrlPreview = (rawUrl: string) => {
    const media = resolveMediaUrl(rawUrl);
    if (media.type === 'youtube') {
      return (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-cyan-500/30 bg-black">
          <iframe
            src={media.url}
            title="Aperçu YouTube"
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }
    if (media.type === 'image' && media.isDirect) {
      return (
        <div className="rounded-2xl overflow-hidden border border-cyan-500/30 bg-white/5">
          <img
            src={media.url}
            alt="Aperçu du média"
            className="w-full max-h-72 object-contain"
            loading="lazy"
          />
        </div>
      );
    }
    if (media.type === 'video' && media.isDirect) {
      return (
        <div className="rounded-2xl overflow-hidden border border-cyan-500/30 bg-black">
          <video src={media.url} controls preload="metadata" className="w-full max-h-72" />
        </div>
      );
    }
    return (
      <div className="flex items-start gap-3 px-4 py-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
        <AlertCircle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <p className="font-bold">Aperçu indisponible pour ce lien.</p>
          <p className="mt-1 text-amber-200/70">
            {media.type === 'unsupported'
              ? "Ce lien pointe vers une page web et non vers un fichier image/vidéo direct. Utilisez l'upload ci-dessus ou un lien se terminant par .jpg, .png, .webp ou .mp4."
              : 'Ce lien ne peut pas être prévisualisé directement (il sera affiché comme lien cliquable sur le site).'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-32">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* ---------- EDITOR ---------- */}
        <div className="lg:col-span-8 space-y-8">
          <div className="glass-panel rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
            <div
              className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"
              aria-hidden="true"
            ></div>

            <header className="flex items-center justify-between mb-10 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-cyan-500/10 rounded-2xl border border-cyan-500/25 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                  <Zap className="text-cyan-400 w-6 h-6 fill-cyan-400" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-4xl font-black uppercase italic tracking-tight text-white">
                    {siteConfig.projectName || 'Star_Core'}
                  </h2>
                  <p className="text-cyan-500/60 text-[10px] font-bold uppercase tracking-[0.5em] mt-1 italic">
                    Star Code Engine v4.0
                  </p>
                </div>
              </div>
              <div className="hidden md:flex flex-col items-end">
                <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  IP: {user?.ip || 'Liaison...'}
                </div>
                <div className="text-[8px] font-bold uppercase text-cyan-500/40 tracking-[0.4em] mt-2">
                  Développé par Astarté
                </div>
              </div>
            </header>

            <div className="space-y-8">
              {/* Content form */}
              <div className="p-6 md:p-8 bg-black/40 rounded-[2rem] border border-white/8 space-y-6">
                <div className="flex items-start gap-3 px-4 py-3.5 bg-cyan-500/10 border border-cyan-500/25 rounded-2xl">
                  <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p className="text-cyan-300/90 text-sm font-medium leading-relaxed">
                    Remplissez les champs ci-dessous, puis cliquez sur « Ajouter le contenu » pour
                    sauvegarder. Vous pouvez ajouter plusieurs contenus avant de télécharger.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="itemTitle" className="sc-label ml-1 mb-2">
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Titre du contenu
                    </label>
                    <input
                      id="itemTitle"
                      value={newItem.title}
                      onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                      placeholder="Titre du contenu..."
                      className="sc-input font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label htmlFor="itemDesc" className="sc-label ml-1 mb-2">
                      <Type className="w-3.5 h-3.5" aria-hidden="true" /> Texte / description
                    </label>
                    <textarea
                      id="itemDesc"
                      value={newItem.description}
                      onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Texte / description..."
                      rows={3}
                      className="sc-input resize-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="itemLink" className="sc-label ml-1 mb-2">
                      <Link2 className="w-3.5 h-3.5" aria-hidden="true" /> Lien de redirection (optionnel)
                    </label>
                    <input
                      id="itemLink"
                      value={newItem.link}
                      onChange={e => setNewItem({ ...newItem, link: e.target.value })}
                      placeholder="https://..."
                      className="sc-input"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  disabled={!newItem.title || !newItem.description}
                  className="sc-btn-primary w-full py-5 text-lg"
                >
                  <PlusCircle className="w-5 h-5" aria-hidden="true" />
                  Ajouter le contenu
                </button>

                {(!newItem.title || !newItem.description) && items.length === 0 && (
                  <p className="flex items-center gap-2 justify-center text-amber-300/90 text-sm font-semibold px-3 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                    Remplissez le titre et la description, puis cliquez sur le bouton ci-dessus.
                  </p>
                )}
                {items.length > 0 && (!newItem.title || !newItem.description) && (
                  <p className="flex items-center gap-2 justify-center text-emerald-300/90 text-sm font-semibold px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <CheckCircle className="w-4 h-4" aria-hidden="true" />
                    {items.length} contenu{items.length > 1 ? 's' : ''} ajouté{items.length > 1 ? 's' : ''} !
                    Remplissez à nouveau pour en ajouter d'autres.
                  </p>
                )}

                {/* Media options */}
                <div className="space-y-4 pt-5 border-t border-white/5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="mediaType" className="sc-label ml-1">
                        <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" /> Type de média
                      </label>
                      <select
                        id="mediaType"
                        value={newItem.mediaType}
                        onChange={e => setNewItem({ ...newItem, mediaType: e.target.value as any })}
                        className="sc-input cursor-pointer"
                      >
                        <option value="none">Aucun média</option>
                        <option value="image">Image</option>
                        <option value="video">Vidéo</option>
                      </select>
                    </div>

                    {newItem.mediaType !== 'none' && (
                      <div className="space-y-2">
                        <label htmlFor="mediaUrl" className="sc-label ml-1">
                          <Link2 className="w-3.5 h-3.5" aria-hidden="true" /> URL du média
                        </label>
                        <input
                          id="mediaUrl"
                          value={newItem.mediaUrl}
                          onChange={e => setNewItem({ ...newItem, mediaUrl: e.target.value, localDataUrl: '', localFileName: '' })}
                          placeholder="https://exemple.com/image.jpg"
                          className="sc-input"
                        />
                      </div>
                    )}
                  </div>

                  {/* Upload / glisser-déposer d'image locale (incluse dans le ZIP) */}
                  {newItem.mediaType === 'image' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="h-px flex-1 bg-white/10" aria-hidden="true"></span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                          ou uploader
                        </span>
                        <span className="h-px flex-1 bg-white/10" aria-hidden="true"></span>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          handleLocalFile(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />

                      {newItem.localDataUrl ? (
                        <div className="relative rounded-2xl overflow-hidden border border-cyan-500/40 group">
                          <img
                            src={newItem.localDataUrl}
                            alt="Aperçu de l'image téléchargée"
                            className="w-full h-44 object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 px-4 py-2.5 bg-black/75 backdrop-blur-sm">
                            <span className="flex items-center gap-2 text-[10px] font-mono text-cyan-300 truncate">
                              <FileImage className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                              {newItem.localFileName}
                            </span>
                            <button
                              type="button"
                              onClick={() => setNewItem(prev => ({ ...prev, localDataUrl: '', localFileName: '' }))}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Retirer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label="Glisser-déposer ou sélectionner une image"
                          onClick={() => fileInputRef.current?.click()}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              fileInputRef.current?.click();
                            }
                          }}
                          onDragOver={e => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={e => {
                            e.preventDefault();
                            setIsDragging(false);
                            handleLocalFile(e.dataTransfer.files?.[0]);
                          }}
                          className={`cursor-pointer border-2 border-dashed rounded-2xl px-6 py-8 text-center transition-all ${
                            isDragging
                              ? 'border-cyan-500 bg-cyan-500/10 scale-[1.01]'
                              : 'border-white/15 hover:border-cyan-500/40 hover:bg-white/5'
                          }`}
                        >
                          <UploadCloud className="w-9 h-9 mx-auto text-cyan-400 mb-3" aria-hidden="true" />
                          <p className="text-sm font-bold text-white">
                            Glissez-déposez votre image ici
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1.5">
                            ou cliquez pour parcourir • JPG, PNG, WEBP, GIF, SVG — 8 Mo max
                          </p>
                          <p className="text-[10px] text-cyan-400/80 mt-2 font-semibold">
                            L'image sera automatiquement incluse dans le fichier ZIP
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Aperçu en direct du lien média collé (image / vidéo / YouTube) */}
                  {newItem.mediaType !== 'none' && newItem.mediaUrl?.trim() && (
                    <div className="space-y-2">
                      <label className="sc-label ml-1">
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" /> Aperçu du média
                      </label>
                      {renderUrlPreview(newItem.mediaUrl.trim())}
                    </div>
                  )}

                  {newItem.mediaType !== 'none' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="mediaPosition" className="sc-label ml-1">
                          <PencilRuler className="w-3.5 h-3.5" aria-hidden="true" /> Position du média
                        </label>
                        <select
                          id="mediaPosition"
                          value={newItem.mediaPosition}
                          onChange={e => setNewItem({ ...newItem, mediaPosition: e.target.value as any })}
                          className="sc-input cursor-pointer"
                        >
                          <option value="top">Haut (au-dessus du texte)</option>
                          <option value="bottom">Bas (au-dessous)</option>
                          <option value="left">Gauche (texte à droite)</option>
                          <option value="right">Droite (texte à gauche)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="fontSize" className="sc-label ml-1">
                          <Type className="w-3.5 h-3.5" aria-hidden="true" /> Taille du texte
                        </label>
                        <select
                          id="fontSize"
                          value={newItem.fontSize}
                          onChange={e => setNewItem({ ...newItem, fontSize: e.target.value })}
                          className="sc-input cursor-pointer"
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
                    <p className="flex items-center gap-2 text-amber-300/90 text-xs font-semibold px-3 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                      <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      {newItem.mediaType === 'image' ? 'Une image' : 'Une vidéo'} est sélectionnée
                      mais l'URL est vide. L'URL est obligatoire.
                    </p>
                  )}
                </div>
              </div>

              {/* Items list */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {items.length > 0 && (
                  <div className="flex items-center justify-center gap-2 py-3 text-cyan-400 font-bold uppercase tracking-wider text-sm">
                    <Zap className="w-4 h-4" aria-hidden="true" />
                    {items.length} contenu{items.length > 1 ? 's' : ''} dans votre site
                  </div>
                )}

                {items.length === 0 ? (
                  <div className="text-center py-16 px-6 border-2 border-dashed border-white/10 rounded-[2.5rem] group hover:border-cyan-500/30 transition-all space-y-6">
                    <Sparkles className="w-10 h-10 mx-auto text-cyan-400/60 animate-pulse" aria-hidden="true" />
                    <div className="opacity-50 uppercase font-bold tracking-[1em] text-[10px]">
                      Archive Star Code vide
                    </div>
                    <button
                      type="button"
                      onClick={loadSampleResource}
                      className="sc-btn-ghost mx-auto inline-flex items-center gap-2 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" aria-hidden="true" /> Charger un exemple
                    </button>
                  </div>
                ) : (
                  items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white/5 border border-white/5 p-6 rounded-[2rem] hover:border-cyan-500/40 transition-all group backdrop-blur-md hover:bg-white/10 relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 w-1 h-full bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true"></div>
                      <div className="flex items-center gap-5 flex-1 min-w-0">
                        {item.mediaType && item.mediaType !== 'none' && (item.mediaUrl || item.localDataUrl) && (
                          <div className="flex-shrink-0">
                            {item.mediaType === 'image' ? (
                              <img
                                src={item.localDataUrl || resolveMediaUrl(item.mediaUrl).url || item.mediaUrl}
                                alt={item.title}
                                className="w-16 h-16 rounded-2xl object-cover border border-white/10"
                              />
                            ) : item.mediaUrl && getYoutubeId(item.mediaUrl) ? (
                              <img
                                src={`https://img.youtube.com/vi/${getYoutubeId(item.mediaUrl)}/mqdefault.jpg`}
                                alt={item.title}
                                className="w-16 h-16 rounded-2xl object-cover border border-white/10"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                <Film className="w-5 h-5 text-cyan-500" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-2 opacity-70">
                            {item.meta}
                            {item.mediaType && item.mediaType !== 'none' && (
                              <span className="ml-3 text-slate-500 font-medium">
                                &bull; {item.mediaType}
                              </span>
                            )}
                          </div>
                          <div className="font-black text-lg md:text-xl uppercase truncate pr-8 tracking-tight italic">
                            {item.title}
                          </div>
                          {item.description && (
                            <div className="text-sm text-slate-400 mt-1 line-clamp-1">{item.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3 flex-shrink-0">
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Ouvrir le lien de ${item.title}`}
                            className="p-3.5 bg-white/5 rounded-xl text-slate-400 hover:text-cyan-400 transition-all border border-transparent hover:border-cyan-500/30 cursor-pointer"
                          >
                            <ExternalLink className="w-5 h-5" aria-hidden="true" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          aria-label={`Supprimer ${item.title}`}
                          className="p-3.5 bg-red-500/5 text-red-500/40 hover:text-red-500 rounded-xl transition-all border border-transparent hover:border-red-500/30 cursor-pointer"
                        >
                          <Trash2 className="w-5 h-5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ---------- SIDEBAR ---------- */}
        <div className="lg:col-span-4 space-y-8">
          {/* Theme picker */}
          <section className="glass-panel rounded-[2.5rem] p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-cyan-500 group-hover:scale-110 transition-transform" aria-hidden="true">
              <Palette className="w-28 h-28" />
            </div>
            <h3 className="text-[12px] font-bold uppercase tracking-[0.5em] mb-10 flex items-center gap-3 text-slate-400 italic">
              <Palette className="w-5 h-5 text-cyan-500" aria-hidden="true" /> Profil visuel
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {themes.map(t => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={siteConfig.theme === t.id}
                  aria-label={`Thème ${t.label}`}
                  onClick={() => setSiteConfig({ ...siteConfig, theme: t.id, primaryColor: t.color })}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    siteConfig.theme === t.id
                      ? 'border-cyan-500 bg-cyan-500/10 scale-[1.06] shadow-[0_0_30px_rgba(6,182,212,0.2)]'
                      : 'border-transparent opacity-45 hover:opacity-100 hover:bg-white/5'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-full shadow-xl border border-white/15"
                    style={{ backgroundColor: t.color }}
                  ></div>
                  <span className="text-[9px] font-bold uppercase tracking-widest">{t.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* GitHub publish */}
          <section className="glass-panel rounded-[2.5rem] p-8 relative overflow-hidden">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.5em] mb-8 flex items-center gap-3 text-slate-400 italic">
              <Github className="w-5 h-5 text-cyan-500" aria-hidden="true" /> Publier sur GitHub
            </h3>
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="githubToken" className="sc-label ml-1">
                  Token GitHub personnel
                </label>
                <input
                  id="githubToken"
                  type="password"
                  value={githubToken}
                  onChange={e => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxx"
                  autoComplete="off"
                  className="sc-input font-mono"
                  disabled={isPublishing}
                />
                <p className="text-[10px] text-slate-500 ml-1 leading-relaxed">
                  Créez un token sur{' '}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-500 hover:underline"
                  >
                    github.com/settings/tokens
                  </a>{' '}
                  avec la permission <span className="text-cyan-400">repo</span>.
                </p>
              </div>

              <button
                type="button"
                onClick={publishToGitHub}
                disabled={isPublishing || !githubToken.trim()}
                className="sc-btn-primary w-full py-5"
              >
                {isPublishing ? (
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                ) : (
                  <Github className="w-5 h-5" aria-hidden="true" />
                )}
                <span className="uppercase tracking-wide text-sm font-black">
                  {isPublishing ? publishStatusLabel : 'Publier sur GitHub'}
                </span>
              </button>

              {publishStatus === 'success' && publishedUrl && (
                <div className="space-y-4 px-5 py-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-300 font-bold text-sm uppercase tracking-wide">
                      Publié avec succès !
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 rounded-xl p-3">
                    <span className="text-cyan-300 text-xs font-mono truncate flex-1">{publishedUrl}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(publishedUrl)}
                      aria-label="Copier l'URL"
                      className="p-2 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    </button>
                  </div>
                  <a
                    href={publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-emerald-500 text-black font-bold py-3 rounded-xl text-center uppercase text-sm tracking-wide hover:bg-emerald-400 transition-all"
                  >
                    Ouvrir le site
                  </a>
                  <p className="text-[9px] text-slate-500 text-center">
                    Le site peut prendre 1-2 minutes pour être accessible.
                  </p>
                </div>
              )}

              {publishStatus === 'error' && errorMessage && (
                <div className="px-5 py-5 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-400" aria-hidden="true" />
                    <span className="text-rose-300 font-bold text-sm uppercase tracking-wide">Erreur</span>
                  </div>
                  <p className="text-rose-300/80 text-xs mt-3 leading-relaxed">{errorMessage}</p>
                </div>
              )}
            </div>
          </section>

          {/* Export */}
          <section className="glass-panel rounded-[2.5rem] p-8 relative overflow-hidden">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.5em] mb-8 flex items-center gap-3 text-slate-400 italic">
              <Settings className="w-5 h-5 text-cyan-500" aria-hidden="true" /> Exportation studio
            </h3>

            <button
              type="button"
              onClick={handlePreview}
              className="sc-btn-primary w-full py-5 mb-4 bg-none"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #db2777)',
                borderColor: 'rgba(168,85,247,0.5)',
                boxShadow: '0 12px 40px rgba(168,85,247,0.3)',
              }}
            >
              <Eye className="w-5 h-5" aria-hidden="true" />
              <span className="uppercase tracking-wide text-base font-black">Prévisualiser</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="sc-btn-primary w-full py-7"
            >
              {isExporting ? (
                <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="w-6 h-6" aria-hidden="true" />
              )}
              <span className="uppercase tracking-wide text-lg font-black">
                {isExporting ? 'Génération...' : 'Télécharger ZIP'}
              </span>
            </button>

            <div className="mt-10 text-center">
              <div className="text-[8px] font-bold uppercase text-cyan-500/50 tracking-[0.5em] mb-2 animate-pulse">
                Studio de clonage certifié
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Développé par Astarté
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            role="status"
            className={`px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-3 text-sm font-semibold ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : notification.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/40 text-amber-200'
                : 'bg-rose-950/90 border-rose-500/40 text-rose-200'
            }`}
          >
            <span>{notification.text}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              aria-label="Fermer la notification"
              className="ml-2 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* In-App Preview Modal */}
      {previewModalHtml && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Prévisualisation du clone"
        >
          <div className="w-full h-full max-w-6xl bg-slate-900 border border-cyan-500/30 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-950/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-cyan-400" aria-hidden="true" />
                <span className="font-black text-white uppercase text-sm tracking-widest">
                  Aperçu du clone :{' '}
                  <span className="text-cyan-400">{siteConfig.projectName || siteConfig.title}</span>
                </span>
              </div>

              <div className="flex items-center bg-black/50 border border-white/10 rounded-2xl p-1 gap-1" role="radiogroup" aria-label="Type d'appareil">
                {[
                  { id: 'desktop' as const, icon: Monitor, label: 'Desktop', title: 'Écran ordinateur (100%)' },
                  { id: 'tablet' as const, icon: Tablet, label: 'Tablette', title: 'Tablette (768px)' },
                  { id: 'mobile' as const, icon: Smartphone, label: 'Mobile', title: 'Mobile (390px)' },
                ].map(dev => (
                  <button
                    key={dev.id}
                    type="button"
                    role="radio"
                    aria-checked={previewDevice === dev.id}
                    title={dev.title}
                    onClick={() => setPreviewDevice(dev.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      previewDevice === dev.id
                        ? 'bg-cyan-500 text-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <dev.icon className="w-3.5 h-3.5" aria-hidden="true" /> {dev.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (previewUrl) {
                      window.open(previewUrl, '_blank', 'noopener');
                      return;
                    }
                    const blob = new Blob([previewModalHtml], { type: 'text/html;charset=utf-8' });
                    const blobUrl = URL.createObjectURL(blob);
                    window.open(blobUrl, '_blank');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer"
                  title="Ouvrir dans un nouvel onglet"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                  <span className="hidden sm:inline">Nouvel onglet</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewModalHtml(null);
                    setPreviewUrl(null);
                  }}
                  aria-label="Fermer la prévisualisation"
                  className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-full transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>

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
                  {...(previewUrl ? { src: previewUrl } : { srcDoc: previewModalHtml })}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};