export interface Product {
  id: string;
  brand: string;
  productUrl: string;
  imageUrl: string;
  price: string;
  title: string;
  description: string;
  affiliateLink: string;
}

export interface BlogPost {
  id:string;
  name: string;
  title: string;
  content: string; // HTML content
  products: Product[];
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  prompt: string;
}

export interface AppSettings {
  generalInstructions: string;
  tone: 'friendly' | 'professional' | 'humorous' | 'technical' | 'casual' | 'witty' | 'authoritative' | '';
  ctaText: string;
  footerText: string;
}