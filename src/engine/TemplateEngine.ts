import JSZip from 'jszip';
import { SiteConfig, UserData } from '../types';
import { PlaceholderResolver, TemplateVariables } from './PlaceholderResolver';
import { ThemeEngine } from './ThemeEngine';
import { validateSiteConfig, validateUserData } from './validators';
import { TEMPLATES, TemplateDefinition } from '../templates/manifest';

interface PageConfig {
  title: string;
  description: string;
  content: string;
  slug: string;
}

export interface GeneratedPage {
  filename: string;
  content: string;
  isMultipage?: boolean;
}

export class TemplateEngine {
  private siteConfig: SiteConfig;
  private user?: UserData;
  private placeholderResolver: PlaceholderResolver;
  private themeEngine: ThemeEngine;
  private templateDefinition: TemplateDefinition;

  constructor(siteConfig: SiteConfig, user?: UserData) {
    if (!validateSiteConfig(siteConfig)) {
      throw new Error('Configuration du site invalide');
    }
    if (user && !validateUserData(user)) {
      throw new Error('Données utilisateur invalides');
    }

    this.siteConfig = siteConfig;
    this.user = user;
    this.themeEngine = new ThemeEngine(siteConfig);
    this.placeholderResolver = new PlaceholderResolver(this.getTemplateVariables());
    this.templateDefinition = this.getTemplateDefinition();
  }

  private getTemplateDefinition(): TemplateDefinition {
    // Par défaut, on utilise le modèle universel
    return TEMPLATES.find(t => t.id === 'universal-three') || TEMPLATES[0];
  }

  private getTemplateVariables(): TemplateVariables {
    return {
      site: {
        name: this.siteConfig.projectName,
        description: this.siteConfig.description,
        logo: this.siteConfig.logoDataUrl || '',
        email: this.user?.email || '',
        phone: this.siteConfig.phone || '',
      },
      page: {
        title: this.siteConfig.title,
        description: this.siteConfig.description,
        content: '',
        slug: 'index',
      },
      theme: {
        primary: this.siteConfig.primaryColor,
        secondary: this.siteConfig.secondaryColor || '#f8fafc',
        accent: this.siteConfig.accentColor || this.siteConfig.primaryColor,
        background: this.siteConfig.bgColor || '#020617',
        text: this.siteConfig.textColor || '#ffffff',
      },
    };
  }

  public generatePages(): Record<string, string> {
    const pages: Record<string, string> = {};
    const baseCss = this.themeEngine.generateThemeCSS();

    // Génération des pages selon le modèle sélectionné
    this.templateDefinition.pages.forEach(pageSlug => {
      pages[`${pageSlug}.html`] = this.generatePage(pageSlug, baseCss);
    });

    return pages;
  }

  private generatePage(pageSlug: string, baseCss: string): string {
    const variables = this.getTemplateVariables();
    variables.page.slug = pageSlug;

    // Récupération du template de base
    let template = this.placeholderResolver.resolve(this.templateMap['base']);

    // Ajout du contenu spécifique à la page
    let bodyContent = '';
    if (pageSlug === 'index') {
      bodyContent = this.placeholderResolver.resolve(this.templateMap['index']);
    } else if (pageSlug === 'contact') {
      bodyContent = this.placeholderResolver.resolve(this.templateMap['contact']);
    } else if (pageSlug === 'inscription') {
      bodyContent = this.placeholderResolver.resolve(this.templateMap['inscription']);
    }

    // Construction de la page complète
    return template
      .replace('{{baseCss}}', baseCss)
      .replace('{{body}}', bodyContent)
      .replace('{{navHTML}}', this.generateNavHTML(pageSlug));
  }

  private generateNavHTML(activePage: string): string {
    return this.templateDefinition.pages.map(pageSlug => {
      const label = pageSlug === 'index' ? 'Accueil' :
                 pageSlug === 'contact' ? 'Contact' :
                 pageSlug === 'inscription' ? 'Inscription' :
                 pageSlug.charAt(0).toUpperCase() + pageSlug.slice(1);
      const isActive = pageSlug === activePage;
      return `<a href="${pageSlug}.html"${isActive ? ' class="active"' : ''}>${label}</a>`;
    }).join('');
  }

  public async generateZIP(): Promise<Blob> {
    const pages = this.generatePages();
    const zip = new JSZip();

    Object.entries(pages).forEach(([filename, content]) => {
      zip.file(filename, content);
    });

    // Ajout des images uploadées si disponibles
    if (this.siteConfig.logoDataUrl) {
      zip.file('assets/logo.png', this.siteConfig.logoDataUrl.split(',')[1], { base64: true });
    }

    return await zip.generateAsync({ type: 'blob' });
  }

  // Méthodes pour charger les templates depuis des fichiers
  // à implémenter plus tard
  private templateMap: Record<string, string> = {
    base: `<!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{site.name}} — {{page.title}}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;900&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
        <style>{{baseCss}}</style>
    </head>
    <body>
        <div class="galaxy"><div class="stars"></div></div>
        <div class="watermark">{{site.name}}</div>
        <div class="container">
            <header class="site-header">
                {{logoHTML}}
                <h1 class="brand">{{site.name}}</h1>
                <nav class="site-nav">
                    {{navHTML}}
                </nav>
                <div class="credit">Développé par Astarté</div>
            </header>
            {{body}}
            {{footerHTML}}
        </div>
        <script>
            var OWNER_EMAIL = '{{site.email}}';
            var ORGANIZATION_NAME = '{{site.name}}';
        </script>
    </body>
    </html>`,

    index: `<div class="hero">
        <h1>{{page.title}}</h1>
        <p>{{site.tagline}}</p>
        {{contentHTML}}
    </div>`,

    contact: `<div class="contact-form">
        <h2>Contactez-nous</h2>
        <form onsubmit="return sendContact(event)">
            <input type="text" id="c-name" placeholder="Nom" required>
            <input type="email" id="c-email" placeholder="Email" required>
            <input type="tel" id="c-phone" placeholder="Téléphone">
            <input type="text" id="c-subject" placeholder="Sujet">
            <textarea id="c-msg" placeholder="Message" required></textarea>
            <button type="submit">Envoyer</button>
            <div id="notice-contact" class="notice"></div>
        </form>
        <div class="contact-info">
            <p>📍 {{site.address}}</p>
            <p>📞 <a href="tel:{{site.phone}}">{{site.phone}}</a></p>
            <p>💬 <a href="https://wa.me/{{whatsappLink}}" target="_blank" rel="noopener">{{site.whatsapp}}</a></p>
            <p>📧 <a href="mailto:{{site.email}}">{{site.email}}</a></p>
        </div>
    </div>`,

    inscription: `<div class="signup-form">
        <h2>Inscription</h2>
        <form onsubmit="return sendSignup(event)">
            <input type="text" id="i-lastname" placeholder="Nom" required>
            <input type="text" id="i-firstname" placeholder="Prénom" required>
            <input type="email" id="i-email" placeholder="Email" required>
            <input type="tel" id="i-phone" placeholder="Téléphone">
            <input type="password" id="i-pass" placeholder="Mot de passe" required>
            <input type="password" id="i-pass2" placeholder="Confirmer le mot de passe" required>
            <button type="submit">S'inscrire</button>
            <div id="notice-inscription" class="notice"></div>
        </form>
    </div>`,
  };
}      
