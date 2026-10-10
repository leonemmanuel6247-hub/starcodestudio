import { SiteConfig } from '../types';

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'portfolio' | 'universal';
  pages: string[];
  previewImage: string;
  defaultConfig: Partial<SiteConfig>;
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'business-elegance',
    name: 'Élégance',
    description: 'Site vitrine professionnel avec services et témoignages',
    category: 'business',
    pages: ['index', 'contact', 'inscription'],
    previewImage: '/templates/business-elegance.png',
    defaultConfig: {
      theme: 'neon',
      primaryColor: '#0f766e',
      bgColor: '#020617',
      textColor: '#ffffff',
      template: 'multipage',
    },
  },
  {
    id: 'portfolio-minimal',
    name: 'Minimal',
    description: 'Portfolio épuré avec projets et compétences',
    category: 'portfolio',
    pages: ['index', 'contact'],
    previewImage: '/templates/portfolio-minimal.png',
    defaultConfig: {
      theme: 'white',
      primaryColor: '#334155',
      bgColor: '#ffffff',
      textColor: '#1e293b',
      template: 'multipage',
    },
  },
  {
    id: 'universal-three',
    name: 'Universel 3-pages',
    description: 'Modèle de base avec accueil, contact et inscription',
    category: 'universal',
    pages: ['index', 'contact', 'inscription'],
    previewImage: '/templates/universal-three.png',
    defaultConfig: {
      theme: 'cosmic',
      primaryColor: '#3b82f6',
      bgColor: '#020617',
      textColor: '#ffffff',
      template: 'multipage',
    },
  },
];
