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

/**
 * Feuille de style commune aux sites generes (mono et multi-pages).
 * L'accent provient du theme choisi par l'utilisateur.
 */
function buildBaseCss(accentColor: string, textColor: string, bgColor: string): string {
  return `
        :root { --accent: ${accentColor}; --bg: ${bgColor}; --text: ${textColor}; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow-x: hidden; max-width: 100vw; }
        body { background: var(--bg); color: var(--text); font-family: 'Outfit', sans-serif; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 0; font-size: 18vw; line-height: 1; font-weight: 900; letter-spacing: 0.05em; white-space: nowrap; text-transform: uppercase; pointer-events: none; opacity: 0.04; user-select: none; color: var(--accent); }
        .galaxy { position: fixed; inset: 0; background: radial-gradient(circle at center, ${bgColor}, #000 100%); z-index: -1; }
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
  `;
}

/** Styles additionnels reserves au site multi-pages (navigation, CTA, formulaires). */
const MULTIPAGE_CSS = `
        .site-header { margin-bottom: 3.5rem; }
        .brand { font-size: clamp(1.8rem, 6vw, 3.2rem); font-weight: 900; color: var(--accent); text-transform: uppercase; letter-spacing: -0.05em; margin-bottom: 0.6rem; text-shadow: 0 0 40px rgba(6,182,212,0.4); }
        .site-nav { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; margin-top: 2.5rem; }
        .site-nav a { color: var(--text); text-decoration: none; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; font-size: 0.75rem; padding: 0.8rem 1.4rem; border: 1px solid rgba(255,255,255,0.15); border-radius: 2rem; transition: 0.3s; }
        .site-nav a:hover, .site-nav a.active { color: #000; background: var(--accent); border-color: var(--accent); }
        .hero { text-align: center; margin-bottom: 4rem; }
        .page-title { font-size: clamp(2rem, 6vw, 3.5rem); font-weight: 900; text-transform: uppercase; letter-spacing: -0.04em; margin-bottom: 1.5rem; color: var(--text); }
        .hero-desc { opacity: 0.65; font-weight: 600; font-style: italic; font-size: 1.15rem; letter-spacing: 0.03em; max-width: 720px; margin: 0 auto; }
        .cta-row { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin: 3.5rem 0; }
        .cta { display: inline-block; padding: 1.1rem 2.4rem; border-radius: 2rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.85rem; text-decoration: none; transition: 0.3s; }
        .cta-primary { background: var(--accent); color: #000; }
        .cta-primary:hover { transform: scale(1.05); filter: brightness(1.15); }
        .cta-ghost { border: 1px solid var(--accent); color: var(--accent); }
        .cta-ghost:hover { background: var(--accent); color: #000; }
        .form-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 2rem; padding: 2.5rem; max-width: 560px; margin: 0 auto; }
        .form-card label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 900; opacity: 0.55; margin-bottom: 0.7rem; text-align: left; }
        .form-card input { margin-bottom: 1.6rem; text-align: left; font-size: 1rem; padding: 1.2rem 1.4rem; }
        .notice { display: none; margin-top: 1.5rem; padding: 1.1rem; border-radius: 1rem; font-weight: 700; text-align: center; }
        .notice.ok { display: block; color: var(--accent); border: 1px solid var(--accent); background: rgba(255,255,255,0.04); }
        /* ---- Sections génériques ---- */
        .section { margin-bottom: 6rem; }
        .section-title { font-size: clamp(1.6rem, 4vw, 2.6rem); font-weight: 900; text-transform: uppercase; letter-spacing: -0.03em; text-align: center; margin-bottom: 3rem; color: var(--text); }
        .section-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 2rem; margin-bottom: 2rem; }
        .panel-info { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; padding: 2rem; }
        .panel-info p { opacity: 0.75; line-height: 1.7; font-weight: 400; }
        .info-title { font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.8rem; color: var(--accent); margin-bottom: 1rem; }
        .values-wrap { margin-top: 2.5rem; text-align: center; }
        .values-title { text-transform: uppercase; font-weight: 900; letter-spacing: 0.2em; font-size: 0.75rem; opacity: 0.6; }
        .values-list { display: flex; flex-wrap: wrap; gap: 0.8rem; justify-content: center; margin-top: 1rem; }
        .pill { background: rgba(255,255,255,0.04); border: 1px solid var(--accent); color: var(--text); padding: 0.6rem 1.2rem; border-radius: 2rem; font-size: 0.85rem; font-weight: 700; }
        /* ---- Cartes (services, témoignages) ---- */
        .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 2rem; }
        .cards-grid.service-grid { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
        .service-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; padding: 2rem; display: flex; flex-direction: column; align-items: flex-start; transition: 0.3s; }
        .service-card:hover { border-color: var(--accent); background: rgba(255,255,255,0.05); }
        .service-card h3 { font-size: 1.4rem; font-weight: 900; text-transform: uppercase; margin-bottom: 1rem; color: var(--accent); }
        .service-card p { opacity: 0.7; line-height: 1.7; flex: 1; }
        .service-price { margin-top: 1rem; font-weight: 900; font-size: 1.1rem; color: var(--accent); }
        .comment-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; padding: 2rem; }
        .ta-text { opacity: 0.8; line-height: 1.7; font-style: italic; }
        .ta-author { margin-top: 1rem; font-weight: 900; color: var(--accent); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.1em; }
        .stars { color: #fbbf24; letter-spacing: 0.2em; margin-bottom: 1rem; }
        /* ---- Pourquoi nous choisir / chiffres ---- */
        .why-list { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1.2rem; }
        .why-list li { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.25rem; padding: 1.5rem 1.8rem; font-weight: 600; display: flex; align-items: center; gap: 1rem; }
        .why-list li::before { content: '✓'; color: var(--accent); font-weight: 900; }
        .stats-section { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 2rem; padding: 3rem 2rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 2rem; text-align: center; }
        .stat-value { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 900; color: var(--accent); }
        .stat-label { text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.75rem; opacity: 0.6; margin-top: 0.5rem; }
        /* ---- CTA bannière ---- */
        .cta-banner { text-align: center; padding: 4rem 2rem; background: rgba(255,255,255,0.03); border: 1px solid var(--accent); border-radius: 2rem; }
        /* ---- Contact ---- */
        .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start; }
        @media (max-width: 760px) { .contact-grid { grid-template-columns: 1fr; } }
        .contact-list { list-style: none; margin-bottom: 2rem; }
        .contact-list li { padding: 0.9rem 0; border-bottom: 1px solid rgba(255,255,255,0.07); font-weight: 600; font-size: 1.05rem; }
        .contact-list a { color: var(--accent); text-decoration: none; }
        .contact-socials, .footer-socials { display: flex; gap: 0.8rem; flex-wrap: wrap; }
        .social-btn { width: 3rem; height: 3rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: var(--text); font-size: 1.2rem; transition: 0.3s; text-decoration: none; }
        .social-btn:hover { background: var(--accent); color: #000; border-color: var(--accent); }
        textarea { background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1); padding: 1.2rem 1.4rem; border-radius: 1.5rem; color: #fff; width: 100%; outline: none; margin-bottom: 1.6rem; font-family: inherit; font-weight: 400; font-size: 1rem; resize: vertical; text-align: left; }
        /* ---- Inscription ---- */
        .signup-card { max-width: 520px; }
        .pass-wrap { position: relative; }
        .pass-wrap input { padding-right: 3.5rem; }
        .pass-toggle { position: absolute; right: 1rem; top: 1.1rem; background: none; border: none; cursor: pointer; font-size: 1.1rem; opacity: 0.6; }
        .pass-toggle:hover { opacity: 1; }
        .check-line { display: flex; align-items: center; gap: 0.8rem; font-size: 0.85rem; opacity: 0.75; font-weight: 600; margin-bottom: 0.9rem; }
        .check-line input { width: auto; margin: 0; }
        .form-alt { text-align: center; margin-top: 1.8rem; opacity: 0.7; font-weight: 600; }
        .form-alt a { color: var(--accent); text-decoration: underline; }
        /* ---- Footer ---- */
        .site-footer { margin-top: 8rem; text-align: left; opacity: 1; font-size: 0.8rem; text-transform: none; letter-spacing: 0; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 3.5rem; }
        .footer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2.5rem; }
        .footer-brand { font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; font-size: 1.1rem; color: var(--accent); margin-bottom: 0.8rem; }
        .footer-title { font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; font-size: 0.7rem; color: var(--text); opacity: 0.6; margin-bottom: 1rem; }
        .footer-col p, .footer-col a { display: block; margin-bottom: 0.5rem; color: var(--text); opacity: 0.75; text-decoration: none; line-height: 1.6; }
        .footer-col a:hover { opacity: 1; color: var(--accent); }
        .footer-legal { display: flex; flex-wrap: wrap; gap: 1.5rem; justify-content: space-between; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.06); opacity: 0.5; text-transform: uppercase; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.1em; }
`;

/**
 * Rend un texte Markdown simplifié en HTML sûr.
 * Gère : paragraphes (lignes vides), **gras**, *italique*, listes (- / * / 1.),
 * titres (# ## ###) et retours à la ligne. Les balises HTML sont échappées.
 */
function renderMarkdown(src: string, inlineStyle = ''): string {
  if (!src || typeof src !== 'string') return '';
  let html = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');

  const paraStyle = `text-align: justify; line-height: 1.9; font-weight: 400; color: var(--text); font-size: 1.1rem; ${inlineStyle}`;
  const blockStyle = `${inlineStyle}`;

  const blocks = html.split(/\n\s*\n+/);
  const out: string[] = [];
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    let para: string[] = [];
    let listOpen = false;
    const flushPara = () => {
      if (para.length) {
        out.push(`<p style="${paraStyle} margin-bottom: 1.5rem;">${para.join('<br>')}</p>`);
        para = [];
      }
    };
    const closeList = () => {
      if (listOpen) { out.push('</ul>'); listOpen = false; }
    };
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) { flushPara(); continue; }
      const h = line.match(/^(#{1,3})\s+(.*)/);
      if (h) {
        flushPara(); closeList();
        const tag = h[1].length === 1 ? 'h2' : h[1].length === 2 ? 'h3' : 'h4';
        out.push(`<${tag} style="margin: 1.5rem 0 0.8rem; font-weight: 900; color: var(--accent); letter-spacing: -0.02em;">${h[2]}</${tag}>`);
        continue;
      }
      const li = line.match(/^([-*]|\d+\.)\s+(.*)/);
      if (li) {
        flushPara();
        if (!listOpen) { out.push(`<ul style="margin: 1rem 0 1.5rem 1.5rem; ${blockStyle}">`); listOpen = true; }
        out.push(`<li style="margin-bottom: 0.5rem; line-height: 1.8;">${li[2]}</li>`);
        continue;
      }
      closeList();
      para.push(line);
    }
    flushPara(); closeList();
  }
  return out.join('');
}

/* ------------------------------------------------------------------ */
/* Petits éditeurs de listes pour le contenu professionnel (3 pages)    */
/* ------------------------------------------------------------------ */
function ListEditor({ title, values, onChange, placeholder }: {
  title: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="sc-label ml-1">{title}</label>
      {values.map((val, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={val}
            onChange={e => {
              const next = [...values];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="sc-input"
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => onChange(values.filter((_, idx) => idx !== i))}
            className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-xl cursor-pointer"
            aria-label={`Retirer ${title}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ''])}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold cursor-pointer"
      >
        <PlusCircle className="w-4 h-4 text-cyan-500" aria-hidden="true" /> Ajouter
      </button>
    </div>
  );
}

function StatListEditor({ stats, onChange }: {
  stats: { value: string; label: string }[];
  onChange: (s: { value: string; label: string }[]) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="sc-label ml-1">Chiffres clés</label>
      {stats.map((s, i) => (
        <div key={i} className="flex gap-2">
          <input value={s.value} onChange={e => onChange(stats.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} className="sc-input" placeholder="500+" />
          <input value={s.label} onChange={e => onChange(stats.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} className="sc-input" placeholder="Clients" />
          <button type="button" onClick={() => onChange(stats.filter((_, idx) => idx !== i))} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-xl cursor-pointer" aria-label="Retirer"><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...stats, { value: '', label: '' }])} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold cursor-pointer">
        <PlusCircle className="w-4 h-4 text-cyan-500" aria-hidden="true" /> Ajouter un chiffre clé
      </button>
    </div>
  );
}

function ServiceListEditor({ services, onChange }: {
  services: { name: string; description: string; price?: string }[];
  onChange: (s: { name: string; description: string; price?: string }[]) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="sc-label ml-1">Services / produits</label>
      {services.map((s, i) => (
        <div key={i} className="space-y-2 rounded-2xl border border-white/10 p-4 bg-white/[0.02]">
          <div className="flex gap-2">
            <input value={s.name} onChange={e => onChange(services.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} className="sc-input" placeholder="Nom du service" />
            <button type="button" onClick={() => onChange(services.filter((_, idx) => idx !== i))} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-xl cursor-pointer" aria-label="Retirer"><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
          </div>
          <input value={s.description} onChange={e => onChange(services.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} className="sc-input" placeholder="Description courte" />
          <input value={s.price || ''} onChange={e => onChange(services.map((x, idx) => idx === i ? { ...x, price: e.target.value } : x))} className="sc-input" placeholder="Prix (optionnel)" />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...services, { name: '', description: '' }])} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold cursor-pointer">
        <PlusCircle className="w-4 h-4 text-cyan-500" aria-hidden="true" /> Ajouter un service
      </button>
    </div>
  );
}

function TestimonialListEditor({ testimonials, onChange }: {
  testimonials: { author: string; text: string; rating?: number }[];
  onChange: (t: { author: string; text: string; rating?: number }[]) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="sc-label ml-1">Témoignages clients</label>
      {testimonials.map((t, i) => (
        <div key={i} className="space-y-2 rounded-2xl border border-white/10 p-4 bg-white/[0.02]">
          <div className="flex gap-2">
            <input value={t.author} onChange={e => onChange(testimonials.map((x, idx) => idx === i ? { ...x, author: e.target.value } : x))} className="sc-input" placeholder="Nom du client" />
            <select value={String(t.rating || 5)} onChange={e => onChange(testimonials.map((x, idx) => idx === i ? { ...x, rating: Number(e.target.value) } : x))} className="sc-input cursor-pointer w-24">
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
            </select>
            <button type="button" onClick={() => onChange(testimonials.filter((_, idx) => idx !== i))} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-xl cursor-pointer" aria-label="Retirer"><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
          </div>
          <textarea value={t.text} onChange={e => onChange(testimonials.map((x, idx) => idx === i ? { ...x, text: e.target.value } : x))} className="sc-input resize-none" rows={2} placeholder="Commentaire" />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...testimonials, { author: '', text: '', rating: 5 }])} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold cursor-pointer">
        <PlusCircle className="w-4 h-4 text-cyan-500" aria-hidden="true" /> Ajouter un témoignage
      </button>
    </div>
  );
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

  const generatePages = (opts: { inlineLocalMedia?: boolean } = {}): Record<string, string> => {
    const isLocked = siteConfig.template === 'locked';
    const isMultipage = siteConfig.template === 'multipage';
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

              const titleHTML = `<h2 style="font-size: ${fontSize}; font-weight: 900; text-transform: uppercase; margin-bottom: 1.5rem; color: var(--text); letter-spacing: -0.02em;">${renderMarkdown(item.title)}</h2>`;
              const descriptionHTML = item.description
                ? renderMarkdown(item.description, 'margin-bottom: 3rem;')
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

    if (isMultipage) {
      const textColor = siteConfig.textColor || '#ffffff';
      const bgColor = siteConfig.bgColor || '#020617';
      const baseCss = buildBaseCss(accentColor, textColor, bgColor) + MULTIPAGE_CSS;
      const watermark = escapeHTML(siteConfig.watermark || siteConfig.title);
      const logoHTML = siteConfig.logoDataUrl
        ? `<img src="${siteConfig.logoDataUrl}" alt="Logo ${escapeHTML(siteConfig.title)}" style="width: 120px; height: 120px; object-fit: contain; border-radius: 1rem; margin: 0 auto 1.5rem; display: block; box-shadow: 0 10px 40px rgba(0,0,0,0.5);"/>`
        : '';

      const phone = escapeHTML(siteConfig.phone || '');
      const whatsapp = escapeHTML(siteConfig.whatsapp || '');
      const address = escapeHTML(siteConfig.address || '');
      const schedule = escapeHTML(siteConfig.schedule || '');
      const tagline = escapeHTML(siteConfig.tagline || siteConfig.description);
      const whatsappLink = whatsapp.replace(/[^+\d]/g, '');

      const socialItem = (name: string, url?: string) =>
        url
          ? `<a class="social-btn" href="${escapeHTML(url)}" target="_blank" rel="noopener" aria-label="${escapeHTML(name)}"><i class="fa-brands fa-${name}"></i></a>`
          : '';

      const socialHTML = () => `
            <div>
                ${socialItem('facebook', siteConfig.social?.facebook)}
                ${socialItem('instagram', siteConfig.social?.instagram)}
                ${socialItem('tiktok', siteConfig.social?.tiktok)}
                ${socialItem('linkedin', siteConfig.social?.linkedin)}
                ${whatsapp ? `<a class="social-btn" href="https://wa.me/${whatsappLink}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
            </div>`;

      const navHTML = (active: 'index' | 'contact' | 'inscription') => `
            <nav class="site-nav">
                <a href="index.html"${active === 'index' ? ' class="active"' : ''}>Accueil</a>
                <a href="contact.html"${active === 'contact' ? ' class="active"' : ''}>Contact</a>
                <a href="inscription.html"${active === 'inscription' ? ' class="active"' : ''}>Inscription</a>
            </nav>`;

      const footerHTML = `
        <footer class="site-footer">
            <div class="footer-grid">
                <div class="footer-col">
                    ${siteConfig.logoDataUrl ? `<img src="${siteConfig.logoDataUrl}" alt="Logo ${escapeHTML(siteConfig.title)}" style="height: 48px; width: auto; object-fit: contain; margin-bottom: 1rem;"/>` : ''}
                    <div class="footer-brand">${escapeHTML(siteConfig.title)}</div>
                    <p style="opacity:0.6; font-style:italic;">${escapeHTML(tagline)}</p>
                </div>
                <div class="footer-col">
                    <div class="footer-title">Contact</div>
                    ${phone ? `<p>📍 ${address ? 'Adresse : ' + address : 'Contact'}</p>` : ''}
                    ${phone ? `<p>📞 <a href="tel:${phone}">${phone}</a></p>` : ''}
                    ${whatsapp ? `<p>💬 <a href="https://wa.me/${whatsappLink}" target="_blank" rel="noopener">${whatsapp}</a></p>` : ''}
                    <p>📧 <a href="mailto:${contactEmail}">${contactEmail}</a></p>
                </div>
                <div class="footer-col">
                    <div class="footer-title">Liens rapides</div>
                    <a href="index.html">Accueil</a>
                    <a href="contact.html">Contact</a>
                    <a href="inscription.html">Inscription</a>
                </div>
                <div class="footer-col">
                    <div class="footer-title">Suivez-nous</div>
                    ${socialHTML()}
                </div>
            </div>
            <div class="footer-legal">
                <span>© ${new Date().getFullYear()} ${escapeHTML(siteConfig.title)}</span>
                <span>Conditions générales</span>
                <span>Politique de confidentialité</span>
            </div>
        </footer>`;

      const buildPage = (pageLabel: string, active: 'index' | 'contact' | 'inscription', body: string) => `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(pageLabel)} — ${escapeHTML(siteConfig.title)}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;900&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
    <style>${baseCss}</style>
</head>
<body>
    <div class="galaxy"><div class="stars"></div></div>
    <div class="watermark">${watermark}</div>
    <div class="container">
        <header class="site-header">
            ${logoHTML}
            <h1 class="brand">${escapeHTML(siteConfig.title)}</h1>
            <div class="credit">Développé par ${developerName}</div>
            ${navHTML(active)}
        </header>
        ${body}
        ${footerHTML}
    </div>
    <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
    <script>
        var OWNER_EMAIL = '${contactEmail}';
        var ORGANIZATION_NAME = '${escapeHTML(siteConfig.title)}';

        /* ── Comptes EmailJS (rotation automatique si quota épuisé) ── */
        var EMAILJS_ACCOUNTS = [
            {
                publicKey:       'RaUqCCnM61LP6x2JM',
                serviceId:       'service_iz1wrt9',
                templateContact: 'template_6vx7x4p',
                templateSignup:  'template_6vx7x4p'
            },
            {
                publicKey:       'SPkyfCgZyBOvqm5ON',
                serviceId:       'service_714d8z9',
                templateContact: 'template_a8gmz8s',
                templateSignup:  'template_a8gmz8s'
            }
            ,{
                publicKey:       'quKfbbsW3NLDrVxwH',
                serviceId:       'service_zhdgw7q',
                templateContact: null,
                templateSignup:  'template_v8sllt7'
            }
        ];
        var _ejsIndex = 0;

        function sendWithFallback(templateKey, params, onSuccess, onError) {
            if (_ejsIndex >= EMAILJS_ACCOUNTS.length) { onError('Tous les comptes ont échoué'); return; }
            var acc = EMAILJS_ACCOUNTS[_ejsIndex];
            if (!acc[templateKey]) { _ejsIndex++; sendWithFallback(templateKey, params, onSuccess, onError); return; }
            emailjs.init({ publicKey: acc.publicKey });
            emailjs.send(acc.serviceId, acc[templateKey], params)
                .then(function(r) { onSuccess(r); })
                .catch(function(err) {
                    console.warn('EmailJS compte ' + _ejsIndex + ' échoué', err);
                    _ejsIndex++;
                    sendWithFallback(templateKey, params, onSuccess, onError);
                });
        }

        function isValidEmail(v) {
            return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(v).toLowerCase());
        }

        var COOLDOWN_MS = 259200000; // 72 heures
        function checkCooldown(key) {
            var last = localStorage.getItem('starcode_ejs_' + key);
            if (last) {
                var diff = Date.now() - parseInt(last, 10);
                if (diff < COOLDOWN_MS) {
                    return Math.ceil((COOLDOWN_MS - diff) / 3600000); // heures restantes
                }
            }
            return 0;
        }
        function setCooldown(key) {
            localStorage.setItem('starcode_ejs_' + key, Date.now().toString());
        }
        function togglePass(id) {
            var f = document.getElementById(id);
            f.type = f.type === 'password' ? 'text' : 'password';
        }

        function sendContact(e) {
            e.preventDefault();
            var name    = (document.getElementById('c-name').value    || '').trim();
            var email   = (document.getElementById('c-email').value   || '').trim();
            var phone   = (document.getElementById('c-phone').value   || '').trim();
            var subject = (document.getElementById('c-subject').value || '').trim();
            var msg     = (document.getElementById('c-msg').value     || '').trim();

            var notice  = document.getElementById('notice-contact');
            
            var waitContact = checkCooldown('contact');
            if (waitContact > 0) {
                if (notice) { notice.textContent = '❌ Vous devez attendre ' + waitContact + 'h avant votre prochain message.'; notice.className = 'notice err'; }
                return false;
            }
            if (!isValidEmail(email)) {
                if (notice) { notice.textContent = 'Adresse email invalide.'; notice.className = 'notice err'; }
                return false;
            }
            var dateStr = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
            var params = {
                from_name: name, from_email: email, phone: phone,
                subject: subject || 'Demande via le site',
                message: msg, to_email: OWNER_EMAIL,
                organization: ORGANIZATION_NAME, sent_at: dateStr
            };
            if (notice) { notice.textContent = 'Envoi en cours…'; notice.className = 'notice'; }
            _ejsIndex = 0;
            sendWithFallback('templateContact', params,
                function() { setCooldown('contact'); if (notice) { notice.textContent = '✅ Message envoyé !'; notice.className = 'notice ok'; } e.target.reset(); },
                function(err) { if (notice) { notice.textContent = '❌ Erreur — réessayez.'; notice.className = 'notice err'; } console.error(err); }
            );
            return false;
        }

        function sendSignup(e) {
            e.preventDefault();
            var ln    = (document.getElementById('i-lastname').value  || '').trim();
            var fn    = (document.getElementById('i-firstname').value || '').trim();
            var email = (document.getElementById('i-email').value     || '').trim();
            var phone = (document.getElementById('i-phone').value     || '').trim();
            var p1    = document.getElementById('i-pass').value;
            var p2    = document.getElementById('i-pass2').value;

            var notice = document.getElementById('notice-inscription');

            var waitSignup = checkCooldown('signup');
            if (waitSignup > 0) {
                if (notice) { notice.textContent = '❌ Vous devez attendre ' + waitSignup + 'h avant une nouvelle inscription.'; notice.className = 'notice err'; }
                return false;
            }
            if (p2 !== p1) { alert('Les mots de passe ne correspondent pas.'); return false; }
            if (!isValidEmail(email)) {
                if (notice) { notice.textContent = 'Adresse email invalide.'; notice.className = 'notice err'; }
                return false;
            }
            var dateStr = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
            var params = {
                from_name: fn + ' ' + ln, from_email: email, phone: phone,
                subject: 'Nouvelle inscription - ' + ORGANIZATION_NAME,
                message: 'Inscription le ' + dateStr,
                to_email: OWNER_EMAIL, organization: ORGANIZATION_NAME, sent_at: dateStr
            };
            if (notice) { notice.textContent = 'Envoi en cours…'; notice.className = 'notice'; }
            // Params visiteur → comptes 1 & 2
            _ejsIndex = 0;
            sendWithFallback('templateSignup', params,
                function() { setCooldown('signup'); if (notice) { notice.textContent = '✅ Inscription envoyée !'; notice.className = 'notice ok'; } e.target.reset(); },
                function(err) { if (notice) { notice.textContent = '❌ Erreur — réessayez.'; notice.className = 'notice err'; } console.error(err); }
            );
            // Notif admin → compte 3 (template_v8sllt7) toujours envoyée en parallèle
            var adminAcc = EMAILJS_ACCOUNTS[2];
            if (adminAcc && adminAcc.templateSignup) {
                var adminParams = {
                    from_nom:       ln,
                    from_prenom:    fn,
                    from_email:     email,
                    from_telephone: phone,
                    from_date:      dateStr,
                    to_email:       OWNER_EMAIL
                };
                emailjs.init({ publicKey: adminAcc.publicKey });
                emailjs.send(adminAcc.serviceId, adminAcc.templateSignup, adminParams)
                    .then(function() { console.log('Notif admin envoyée'); })
                    .catch(function(err) { console.warn('Notif admin échouée', err); });
            }
            return false;
        }
    </script>
</body>
</html>`;

      // --- Vitrines réutilisables ---
      const valuesRows = (siteConfig.values || []).map((v: string) =>
        `<span class="pill">${escapeHTML(v)}</span>`
      ).join('');

      const whyRows = (siteConfig.whyChooseUs || []).map((w: string) =>
        `<li>${escapeHTML(w)}</li>`
      ).join('');

      const statsCards = (siteConfig.stats || []).map((s) =>
        `<div class="stat-card"><div class="stat-value">${escapeHTML(s.value)}</div><div class="stat-label">${escapeHTML(s.label)}</div></div>`
      ).join('');

      const servicesCards = (siteConfig.services || []).map((s) =>
        `<article class="service-card">
            <h3>${escapeHTML(s.name)}</h3>
            <p>${escapeHTML(s.description)}</p>
            ${s.price ? `<div class="service-price">${escapeHTML(s.price)}</div>` : ''}
            <a class="cta cta-ghost" href="contact.html" style="margin-top:1rem; font-size:0.8rem; padding:0.8rem 1.6rem;">En savoir plus</a>
         </article>`
      ).join('');

      const testimonialsCards = (siteConfig.testimonials || []).map((t) =>
        `<article class="comment-card">
            <div class="stars">${'★'.repeat(t.rating || 5)}</div>
            <p class="ta-text">${escapeHTML(t.text)}</p>
            <div class="ta-author">— ${escapeHTML(t.author)}</div>
         </article>`
      ).join('');

      const contentSection = contentHTML;

      // --- Page Accueil ---
      const accueilBody = `
        <section class="hero hero-landing">
            <h2 class="page-title">${escapeHTML(tagline)}</h2>
            <p class="hero-desc">${escapeHTML(siteConfig.description)}</p>
            <div class="cta-row">
                <a class="cta cta-primary" href="inscription.html">Rejoindre</a>
                <a class="cta cta-ghost" href="contact.html">Nous contacter</a>
            </div>
        </section>

        <section class="section">
            <h2 class="section-title">Qui sommes-nous ?</h2>
            <div class="section-grid">
                <div class="panel-info">
                    <h3 class="info-title">Notre mission</h3>
                    <p>${escapeHTML(siteConfig.mission || '')}</p>
                </div>
                <div class="panel-info">
                    <h3 class="info-title">Notre vision</h3>
                    <p>${escapeHTML(siteConfig.vision || '')}</p>
                </div>
            </div>
            ${valuesRows ? `<div class="values-wrap"><strong class="values-title">Nos valeurs</strong><div class="values-list">${valuesRows}</div></div>` : ''}
        </section>

        ${servicesCards ? `
        <section class="section">
            <h2 class="section-title">Nos services / produits</h2>
            <div class="cards-grid">${servicesCards}</div>
        </section>` : ''}

        ${contentSection ? `<section class="section"><h2 class="section-title">Nos ressources</h2>${contentSection}</section>` : ''}

        ${whyRows ? `
        <section class="section">
            <h2 class="section-title">Pourquoi nous choisir ?</h2>
            <ul class="why-list">${whyRows}</ul>
        </section>` : ''}

        ${testimonialsCards ? `
        <section class="section">
            <h2 class="section-title">Ils nous font confiance</h2>
            <div class="cards-grid testimonials">${testimonialsCards}</div>
        </section>` : ''}

        ${statsCards ? `
        <section class="section stats-section">
            <div class="stats-grid">${statsCards}</div>
        </section>` : ''}

        <section class="section cta-banner">
            <h2 class="page-title">Vous avez un projet ? Parlons-en !</h2>
            <a class="cta cta-primary" href="contact.html">Nous contacter</a>
        </section>`;

      // --- Page Contact ---
      const socialContact = `
            <div class="contact-socials">
                ${socialItem('facebook', siteConfig.social?.facebook)}
                ${socialItem('instagram', siteConfig.social?.instagram)}
                ${socialItem('tiktok', siteConfig.social?.tiktok)}
                ${socialItem('linkedin', siteConfig.social?.linkedin)}
                ${whatsapp ? `<a class="social-btn" href="https://wa.me/${whatsappLink}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
            </div>`;

      const contactBody = `
        <section class="hero">
            <h2 class="page-title">Contactez-nous</h2>
            <p class="hero-desc">Une question, une demande ou un projet ? Notre équipe est à votre disposition.</p>
        </section>

        <section class="section contact-grid">
            <div>
                <h2 class="section-title" style="text-align:left;">Coordonnées</h2>
                <ul class="contact-list">
                    ${address ? `<li>📍 ${escapeHTML(address)}</li>` : ''}
                    ${phone ? `<li>📞 <a href="tel:${phone}">${phone}</a></li>` : ''}
                    ${whatsapp ? `<li>💬 <a href="https://wa.me/${whatsappLink}" target="_blank" rel="noopener">${whatsapp}</a></li>` : ''}
                    <li>📧 <a href="mailto:${contactEmail}">${contactEmail}</a></li>
                    ${schedule ? `<li>🕐 ${escapeHTML(schedule)}</li>` : ''}
                </ul>
                ${socialContact}
            </div>

            <div>
                <h2 class="section-title" style="text-align:left;">Envoyez-nous un message</h2>
                <form class="form-card" onsubmit="return sendContact(event)">
                    <label for="c-name">Nom complet</label>
                    <input id="c-name" type="text" placeholder="Votre nom" required>
                    <label for="c-email">Email</label>
                    <input id="c-email" type="email" placeholder="vous@exemple.com" required>
                    <label for="c-phone">Téléphone</label>
                    <input id="c-phone" type="tel" placeholder="+228 00 00 00 00">
                    <label for="c-subject">Sujet</label>
                    <input id="c-subject" type="text" placeholder="Objet de votre message">
                    <label for="c-msg">Message</label>
                    <textarea id="c-msg" rows="4" placeholder="Votre message" required></textarea>
                    <button class="btn" type="submit">Envoyer le message</button>
                    <div class="notice" id="notice-contact">✔ Votre message a bien été envoyé. Nous vous répondrons dans les meilleurs délais.</div>
                </form>
            </div>
        </section>`;

      // --- Page Inscription ---
      const inscriptionBody = `
        <section class="hero">
            <h2 class="page-title">Créez votre compte</h2>
            <p class="hero-desc">Rejoignez-nous en quelques secondes.</p>
        </section>
        <form class="form-card signup-card" onsubmit="return sendSignup(event)">
            <label for="i-lastname">Nom</label>
            <input id="i-lastname" type="text" placeholder="Votre nom" required>
            <label for="i-firstname">Prénom</label>
            <input id="i-firstname" type="text" placeholder="Votre prénom" required>
            <label for="i-email">Adresse e-mail</label>
            <input id="i-email" type="email" placeholder="vous@exemple.com" required>
            <label for="i-phone">Numéro de téléphone</label>
            <input id="i-phone" type="tel" placeholder="+228 00 00 00 00">
            <label for="i-pass">Mot de passe</label>
            <div class="pass-wrap">
                <input id="i-pass" type="password" placeholder="••••••••" required>
                <button type="button" class="pass-toggle" onclick="togglePass('i-pass')" aria-label="Afficher/masquer le mot de passe">👁</button>
            </div>
            <label for="i-pass2">Confirmation du mot de passe</label>
            <div class="pass-wrap">
                <input id="i-pass2" type="password" placeholder="••••••••" required>
                <button type="button" class="pass-toggle" onclick="togglePass('i-pass2')" aria-label="Afficher/masquer le mot de passe">👁</button>
            </div>
            <label class="check-line"><input type="checkbox" required> J'accepte les conditions générales d'utilisation</label>
            <label class="check-line"><input type="checkbox" required> J'accepte la politique de confidentialité</label>
            <button class="btn" type="submit">Créer mon compte</button>
            <div class="notice" id="notice-inscription">Bienvenue ! Votre inscription a été enregistrée.</div>
            <p class="form-alt">Vous avez déjà un compte ? <a href="contact.html">Se connecter</a></p>
        </form>`;

      return {
        'index.html': buildPage('Accueil', 'index', accueilBody),
        'contact.html': buildPage('Contact', 'contact', contactBody),
        'inscription.html': buildPage('Inscription', 'inscription', inscriptionBody),
      };
    }

    return {
      'index.html': `<!DOCTYPE html>
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
</html>`,
    };
  };

  const generateHTML = (opts: { inlineLocalMedia?: boolean } = {}) => generatePages(opts)['index.html'];

  const handlePreview = async () => {
    if (items.length === 0) {
      showNotification('Aucun contenu ajouté ! Ajoutez du contenu avant de prévisualiser.', 'warning');
      return;
    }
    const pages = generatePages({ inlineLocalMedia: true });
    setPreviewModalHtml(pages['index.html']);
    setPreviewUrl(null);
    showNotification('Prévisualisation du clone activée', 'success');

    // On publie le(s) HTML sur une URL HTTP same-origin pour que les embeds
    // YouTube reçoivent un Referer valide (sinon erreur 153 via blob/srcdoc).
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: pages }),
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
      const pages = generatePages();
      Object.entries(pages).forEach(([fileName, content]) => zip.file(fileName, content));

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
      const pages = generatePages({ inlineLocalMedia: true });

      for (const [fileName, content] of Object.entries(pages)) {
        const base64Content = btoa(unescape(encodeURIComponent(content)));

        const pushRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${fileName}`, {
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

            <div className="space-y-5 border-t border-white/5 pt-6 mt-2">
              <div className="space-y-2">
                <label className="sc-label ml-1">Logo (glisser-déposer ou cliquer)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="logo-input"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f && f.type.startsWith('image/')) {
                      readFileAsDataUrl(f).then(url => setSiteConfig({ ...siteConfig, logoDataUrl: url })).catch(() => showNotification('Impossible de lire le logo.', 'error'));
                    }
                    e.target.value = '';
                  }}
                />
                <label
                  htmlFor="logo-input"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f && f.type.startsWith('image/')) {
                      readFileAsDataUrl(f).then(url => setSiteConfig({ ...siteConfig, logoDataUrl: url })).catch(() => showNotification('Impossible de lire le logo.', 'error'));
                    }
                  }}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 py-6 hover:border-cyan-500/50 hover:bg-white/5 transition-all"
                >
                  {siteConfig.logoDataUrl ? (
                    <img src={siteConfig.logoDataUrl} alt="Logo" className="h-20 object-contain rounded-xl" />
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 text-cyan-400" aria-hidden="true" />
                      <span className="text-xs text-slate-400 font-semibold">Déposez votre logo ici</span>
                    </>
                  )}
                </label>
                {siteConfig.logoDataUrl && (
                  <button type="button" onClick={() => setSiteConfig({ ...siteConfig, logoDataUrl: '' })} className="text-[10px] text-red-400 underline mt-1 cursor-pointer">
                    Retirer le logo
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="wm" className="sc-label ml-1">Texte en arrière-plan (filigrane)</label>
                <input id="wm" value={siteConfig.watermark || ''} onChange={e => setSiteConfig({ ...siteConfig, watermark: e.target.value })} className="sc-input" placeholder="Texte géant en arrière-plan" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="sc-label ml-1">Couleur des polices</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={siteConfig.textColor} onChange={e => setSiteConfig({ ...siteConfig, textColor: e.target.value })} className="h-10 w-12 rounded-xl border border-white/10 bg-transparent cursor-pointer" />
                    <span className="text-xs font-mono text-slate-400">{siteConfig.textColor}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="sc-label ml-1">Couleur du fond</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={siteConfig.bgColor || '#020617'} onChange={e => setSiteConfig({ ...siteConfig, bgColor: e.target.value })} className="h-10 w-12 rounded-xl border border-white/10 bg-transparent cursor-pointer" />
                    <span className="text-xs font-mono text-slate-400">{siteConfig.bgColor || '#020617'}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Données professionnelles (Site 3 pages) */}
          {siteConfig.template === 'multipage' && (
            <section className="glass-panel rounded-[2.5rem] p-8 relative overflow-hidden">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.5em] mb-8 flex items-center gap-3 text-slate-400 italic">
                <Info className="w-5 h-5 text-cyan-500" aria-hidden="true" /> Contenu professionnel
              </h3>
              <div className="space-y-6">

                <div className="space-y-2">
                  <label htmlFor="pg-tagline" className="sc-label ml-1">Accroche (hero)</label>
                  <input id="pg-tagline" value={siteConfig.tagline || ''} onChange={e => setSiteConfig({ ...siteConfig, tagline: e.target.value })} className="sc-input" placeholder="Votre satisfaction, notre priorité" />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="pg-phone" className="sc-label ml-1">Téléphone</label>
                    <input id="pg-phone" value={siteConfig.phone || ''} onChange={e => setSiteConfig({ ...siteConfig, phone: e.target.value })} className="sc-input" placeholder="+228 00 00 00 00" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="pg-whatsapp" className="sc-label ml-1">WhatsApp</label>
                    <input id="pg-whatsapp" value={siteConfig.whatsapp || ''} onChange={e => setSiteConfig({ ...siteConfig, whatsapp: e.target.value })} className="sc-input" placeholder="+228 00 00 00 00" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="pg-address" className="sc-label ml-1">Adresse</label>
                  <input id="pg-address" value={siteConfig.address || ''} onChange={e => setSiteConfig({ ...siteConfig, address: e.target.value })} className="sc-input" placeholder="Lomé, Togo" />
                </div>

                <div className="space-y-2">
                  <label htmlFor="pg-schedule" className="sc-label ml-1">Horaires</label>
                  <input id="pg-schedule" value={siteConfig.schedule || ''} onChange={e => setSiteConfig({ ...siteConfig, schedule: e.target.value })} className="sc-input" placeholder="Lun–Ven : 08h–18h" />
                </div>

                <div className="space-y-2">
                  <label className="sc-label ml-1">Mission</label>
                  <textarea value={siteConfig.mission || ''} onChange={e => setSiteConfig({ ...siteConfig, mission: e.target.value })} className="sc-input resize-none" rows={2} />
                </div>

                <div className="space-y-2">
                  <label className="sc-label ml-1">Vision</label>
                  <textarea value={siteConfig.vision || ''} onChange={e => setSiteConfig({ ...siteConfig, vision: e.target.value })} className="sc-input resize-none" rows={2} />
                </div>

                <ListEditor
                  title="Nos valeurs"
                  values={siteConfig.values || []}
                  onChange={(v) => setSiteConfig({ ...siteConfig, values: v })}
                  placeholder="Qualité, Sérieux, Innovation..."
                />

                <ListEditor
                  title="Pourquoi nous choisir ?"
                  values={siteConfig.whyChooseUs || []}
                  onChange={(v) => setSiteConfig({ ...siteConfig, whyChooseUs: v })}
                  placeholder="Qualité garantie"
                />

                <div className="space-y-2">
                  <label className="sc-label ml-1">Réseaux sociaux (URLs)</label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input value={siteConfig.social?.facebook || ''} onChange={e => setSiteConfig({ ...siteConfig, social: { ...siteConfig.social, facebook: e.target.value } })} className="sc-input" placeholder="Facebook" />
                    <input value={siteConfig.social?.instagram || ''} onChange={e => setSiteConfig({ ...siteConfig, social: { ...siteConfig.social, instagram: e.target.value } })} className="sc-input" placeholder="Instagram" />
                    <input value={siteConfig.social?.tiktok || ''} onChange={e => setSiteConfig({ ...siteConfig, social: { ...siteConfig.social, tiktok: e.target.value } })} className="sc-input" placeholder="TikTok" />
                    <input value={siteConfig.social?.linkedin || ''} onChange={e => setSiteConfig({ ...siteConfig, social: { ...siteConfig.social, linkedin: e.target.value } })} className="sc-input" placeholder="LinkedIn" />
                  </div>
                </div>

                <StatListEditor stats={siteConfig.stats || []} onChange={(s) => setSiteConfig({ ...siteConfig, stats: s })} />

                <ServiceListEditor services={siteConfig.services || []} onChange={(s) => setSiteConfig({ ...siteConfig, services: s })} />

                <TestimonialListEditor testimonials={siteConfig.testimonials} onChange={(t) => setSiteConfig({ ...siteConfig, testimonials: t })} />
              </div>
            </section>
          )}

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