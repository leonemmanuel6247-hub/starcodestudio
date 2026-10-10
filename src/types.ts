
export interface SiteConfig {
  projectName: string;
  title: string;
  description: string;
  testimonials: { author: string; text: string; rating?: number }[];
  theme: 'neon' | 'golden' | 'cosmic' | 'forest' | 'indigo' | 'white' | 'grey' | 'cendre' | 'menthe' | 'cherry' | 'red';
  primaryColor: string;
  fontFamily: 'Outfit' | 'Space Grotesk' | 'Inter' | 'Fira Code' | 'Playfair Display';
  textColor: string;
  animationSpeed: number;
  particleDensity: number;
  backgroundStyle: 'constellation' | 'stars_only' | 'static';
  template: 'standard' | 'locked' | 'multipage'; 
  deploymentType: 'free' | 'premium';
  registrationUrl: string; 
  resourcesUrl: string;    
  premiumSheetId?: string;
  projectToken?: string;
  // Données professionnelles (site multi-pages : accueil / inscription / contact)
  tagline?: string;
  mission?: string;
  vision?: string;
  values?: string[];
  whyChooseUs?: string[];
  stats?: { value: string; label: string }[];
  services?: { name: string; description: string; price?: string }[];
  phone?: string;
  whatsapp?: string;
  address?: string;
  schedule?: string;
  social?: { facebook?: string; instagram?: string; tiktok?: string; linkedin?: string };
  // Logo + apparence
  logoDataUrl?: string;
  bgColor?: string;
  watermark?: string;

}

export interface UserData {
  lastName: string;
  firstName: string;
  grade?: string;
  email: string;
  country: string;
  ip: string;
  userAgent: string;
  birthDate: {
    day: number;
    month: number;
    year: number;
  };
}

export type Page = 'landing' | 'signup' | 'customization';
