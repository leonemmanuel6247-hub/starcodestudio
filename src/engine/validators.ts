import { SiteConfig, UserData } from '../types';

export function validateSiteConfig(config: SiteConfig): boolean {
  // Vérification des champs obligatoires
  if (!config.projectName || !config.title || !config.description) {
    return false;
  }

  // Vérification des couleurs
  if (!isValidColor(config.primaryColor) || !isValidColor(config.textColor) || !isValidColor(config.bgColor)) {
    return false;
  }

  // Vérification des données professionnelles
  if (config.template === 'multipage' && (!config.tagline || !config.mission)) {
    return false;
  }

  return true;
}

export function validateUserData(user: UserData): boolean {
  // Vérification des champs obligatoires
  if (!user.lastName || !user.firstName || !user.email || !user.country) {
    return false;
  }

  // Vérification de l'email
  if (!isValidEmail(user.email)) {
    return false;
  }

  return true;
}

export function isValidColor(color: string | undefined): boolean {
  if (!color) return false;
  return /^#[0-9A-F]{6}$/i.test(color);
}

export function isValidEmail(email: string): boolean {
  const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return re.test(String(email).toLowerCase());
}
