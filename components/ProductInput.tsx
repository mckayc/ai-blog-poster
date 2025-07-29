
import React from 'react';
import { Product } from '../types';
import TrashIcon from './icons/TrashIcon';
import FetchIcon from './icons/FetchIcon';

interface ProductInputProps {
  product: Product;
  index: number;
  updateProduct: (id: string, field: keyof Product, value: string) => void;
  removeProduct: (id:string) => void;
  isOnlyProduct: boolean;
  onFetchDetails: (id: string) => void;
}

const ProductInput: React.FC<ProductInputProps> = ({ product, index, updateProduct, removeProduct, isOnlyProduct, onFetchDetails }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateProduct(product.id, e.target.name as keyof Product, e.target.value);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md relative border border-gray-200">
        <div className="absolute top-4 right-4">
            {!isOnlyProduct && (
                <button
                    onClick={() => removeProduct(product.id)}
                    className="p-2 text-gray-400 hover:text-error hover:bg-red-100 rounded-full transition-colors duration-200"
                    aria-label="Remove Product"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            )}
        </div>
      <h3 className="text-xl font-semibold text-gray-700 mb-4">Product #{index + 1}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label htmlFor={`productUrl-${product.id}`} className="block text-sm font-medium text-gray-600 mb-1">Amazon Product URL</label>
          <div className="flex items-center gap-2">
            <input type="text" name="productUrl" id={`productUrl-${product.id}`} value={product.productUrl} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" placeholder="https://amazon.com/dp/..." />
            <button
              onClick={() => onFetchDetails(product.id)}
              className="p-2 bg-secondary text-white rounded-md hover:bg-opacity-90 disabled:bg-gray-400 transition-colors shrink-0"
              aria-label="Fetch Product Details"
              title="Fetch Product Details"
              disabled={!product.productUrl}
            >
              <FetchIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="md:col-span-2">
          <label htmlFor={`title-${product.id}`} className="block text-sm font-medium text-gray-600 mb-1">Title</label>
          <input type="text" name="title" id={`title-${product.id}`} value={product.title} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" placeholder="e.g., Apple MacBook Pro 16-inch"/>
        </div>
        <div>
          <label htmlFor={`price-${product.id}`} className="block text-sm font-medium text-gray-600 mb-1">Price</label>
          <input type="text" name="price" id={`price-${product.id}`} value={product.price} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" placeholder="e.g., $2399.00"/>
        </div>
        <div>
          <label htmlFor={`imageUrl-${product.id}`} className="block text-sm font-medium text-gray-600 mb-1">Image URL</label>
          <input type="text" name="imageUrl" id={`imageUrl-${product.id}`} value={product.imageUrl} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" placeholder="https://..."/>
        </div>
         <div className="md:col-span-2">
          <label htmlFor={`affiliateLink-${product.id}`} className="block text-sm font-medium text-gray-600 mb-1">Affiliate Link</label>
          <input type="text" name="affiliateLink" id={`affiliateLink-${product.id}`} value={product.affiliateLink} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" placeholder="https://amazon.com/dp/..."/>
        </div>
        <div className="md:col-span-2">
          <label htmlFor={`description-${product.id}`} className="block text-sm font-medium text-gray-600 mb-1">Description</label>
          <textarea name="description" id={`description-${product.id}`} value={product.description} onChange={handleChange} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" placeholder="Paste product description here..."></textarea>
        </div>
        <div className="md:col-span-2">
          <label htmlFor={`otherInfo-${product.id}`} className="block text-sm font-medium text-gray-600 mb-1">Other Information / Key Features</label>
          <textarea name="otherInfo" id={`otherInfo-${product.id}`} value={product.otherInfo} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" placeholder="e.g., M2 Pro chip, 16GB RAM, 1TB SSD"></textarea>
        </div>
      </div>
    </div>
  );
};

export default ProductInput;
