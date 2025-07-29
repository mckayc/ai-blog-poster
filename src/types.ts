export interface Product {
  id: string;
  productUrl: string;
  imageUrl: string;
  price: string;
  title: string;
  description: string;
  affiliateLink: string;
}

export interface BlogPost {
  id: string;
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
