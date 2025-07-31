
export interface Product {
  id: string;
  name: string; // User-editable internal name
  title: string; // Scraped title from a product page
  brand: string;
  productUrl: string;
  imageUrl: string;
  price: string;
  description: string;
  affiliateLink: string;
  category: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogPost {
  id:string;
  name: string;
  title: string;
  heroImageUrl: string;
  content: string; // HTML content
  products: Product[]; // This is a snapshot of the products at the time of creation
  tags: string[];
  asins: string;
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