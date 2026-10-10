import { SiteConfig, UserData } from '../types';

export interface TemplateVariables {
  site: {
    name: string;
    description: string;
    logo: string;
    email: string;
    phone: string;
  };
  page: {
    title: string;
    description: string;
    content: string;
    slug: string;
  };
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
}

export class PlaceholderResolver {
  private variables: TemplateVariables;

  constructor(variables: TemplateVariables) {
    this.variables = variables;
  }

  public resolve(template: string): string {
    let result = template;

    // Remplacement des variables de site
    Object.entries(this.variables.site).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{site.${key}}}`, 'g'), this.escapeHTML(value));
    });

    // Remplacement des variables de page
    Object.entries(this.variables.page).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{page.${key}}}`, 'g'), this.escapeHTML(value));
    });

    // Remplacement des variables de thème
    Object.entries(this.variables.theme).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{theme.${key}}}`, 'g'), this.escapeHTML(value));
    });

    return result;
  }

  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\'/g, '&#039;')
      .replace(/\"/g, '&quot;');
  }
}
