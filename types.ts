
export interface Product {
  id: string;
  productUrl: string;
  title: string;
  price: string;
  imageUrl: string;
  description: string;
  otherInfo: string;
  affiliateLink: string;
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  labels: string;
  metaDescription: string;
  socialMediaSnippets: string;
  products: Product[];
  createdAt: string;
}

export interface AppSettings {
  apiKey: string;
  generalInstructions: string;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}
