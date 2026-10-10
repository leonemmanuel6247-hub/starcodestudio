import { SiteConfig } from '../types';

export interface ThemeVariables {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export class ThemeEngine {
  private siteConfig: SiteConfig;

  constructor(siteConfig: SiteConfig) {
    this.siteConfig = siteConfig;
  }

  public generateThemeCSS(): string {
    const theme = this.getThemeVariables();

    return `
      :root {
        --color-primary: ${theme.primary};
        --color-secondary: ${theme.secondary};
        --color-accent: ${theme.accent};
        --color-background: ${theme.background};
        --color-text: ${theme.text};
      }
    `;
  }

  private getThemeVariables(): ThemeVariables {
    const defaultTheme = {
      primary: '#0f766e',
      secondary: '#f8fafc',
      accent: '#d4a373',
      background: '#020617',
      text: '#ffffff',
    };

    return {
      primary: this.siteConfig.primaryColor || defaultTheme.primary,
      secondary: this.siteConfig.secondaryColor || defaultTheme.secondary,
      accent: this.siteConfig.accentColor || defaultTheme.accent,
      background: this.siteConfig.bgColor || defaultTheme.background,
      text: this.siteConfig.textColor || defaultTheme.text,
    };
  }
}
