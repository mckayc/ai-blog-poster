
import React, { useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import * as db from '../services/dbService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';

const commonCategories = ["Electronics", "Home & Kitchen", "Books", "Clothing", "Health & Beauty", "Sports & Outdoors", "Toys & Games"];

const ProductModal: React.FC<{
  product: Partial<Product> | null;
  onSave: (product: Partial<Product>) => void;
  onClose: () => void;
}> = ({ product, onSave, onClose }) => {
  const [formData, setFormData] = useState<Partial<Product>>(product || { tags: [] });
  const [isOtherCategory, setIsOtherCategory] = useState(false);

  useEffect(() => {
    const initialCategory = product?.category || '';
    if (initialCategory && !commonCategories.includes(initialCategory)) {
      setIsOtherCategory(true);
    }
  }, [product]);

  const handleChange = (field: keyof Omit<Product, 'tags' | 'id'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'other') {
      setIsOtherCategory(true);
      handleChange('category', '');
    } else {
      setIsOtherCategory(false);
      handleChange('category', value);
    }
  };
  
  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const tags = e.target.value.split(',').map(t => t.trim());
      setFormData(prev => ({ ...prev, tags }));
  }

  const handleSave = () => {
    if (formData.name && formData.category) {
      onSave(formData);
    }
  };

  const isEditing = !!product?.id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-6 flex-shrink-0">{isEditing ? 'Edit Product' : 'Create New Product'}</h2>
        <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
          <Input label="Product Name (for internal reference)" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} required />
          <Input label="Product URL" value={formData.productUrl || ''} onChange={e => handleChange('productUrl', e.target.value)} placeholder="https://amazon.com/dp/..." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Brand" value={formData.brand || ''} onChange={e => handleChange('brand', e.target.value)} />
            <Input label="Price" value={formData.price || ''} onChange={e => handleChange('price', e.target.value)} placeholder="$99.99" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
            <div className="flex gap-2">
                <select 
                    value={isOtherCategory ? 'other' : formData.category || ''}
                    onChange={handleCategoryChange}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:ring-indigo-500"
                >
                    <option value="">Select a category...</option>
                    {commonCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="other">Other...</option>
                </select>
                {isOtherCategory && (
                    <Input value={formData.category || ''} onChange={e => handleChange('category', e.target.value)} placeholder="Enter new category" />
                )}
            </div>
          </div>
           <Input label="Tags (comma-separated)" value={formData.tags?.join(', ') || ''} onChange={handleTagChange} placeholder="e.g., wireless, bluetooth, noise-cancelling"/>
          <Input label="Scraped Title" value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} />
          <Input label="Image URL" value={formData.imageUrl || ''} onChange={e => handleChange('imageUrl', e.target.value)} />
          <Input label="Affiliate Link" value={formData.affiliateLink || ''} onChange={e => handleChange('affiliateLink', e.target.value)} />
          <Textarea label="Description" value={formData.description || ''} onChange={e => handleChange('description', e.target.value)} rows={4} />
        </div>
        <div className="mt-6 flex justify-end space-x-3 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!formData.name || !formData.category}>Save Product</Button>
        </div>
      </Card>
    </div>
  );
};

const ManageProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const loadProducts = useCallback(() => {
    db.getProducts({ search: searchTerm, category: selectedCategory })
      .then(setProducts)
      .catch(e => console.error("Failed to load products", e));
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    db.getUniqueCategories().then(setCategories).catch(console.error);
  }, []);

  const handleSave = async (productData: Partial<Product>) => {
    try {
      await db.saveProduct(productData);
      setEditingProduct(null);
      loadProducts();
      // Refresh categories if a new one might have been added
      if (!categories.includes(productData.category || '')) {
          db.getUniqueCategories().then(setCategories);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save product.');
    }
  };

  const handleDelete = async () => {
    if (deletingProduct) {
      try {
        await db.deleteProduct(deletingProduct.id);
        setDeletingProduct(null);
        loadProducts();
      } catch (e) {
        console.error(e);
        alert('Failed to delete product.');
      }
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white">Product Library</h1>
            <p className="text-slate-400 mt-1">Manage your reusable products here.</p>
        </div>
        <Button onClick={() => setEditingProduct({})}>Add New Product</Button>
      </div>

      <Card className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow">
                  <Input placeholder="Search by name, brand, or tag..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex-grow md:flex-grow-0">
                  <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-indigo-500">
                      <option value="">All Categories</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>
          </div>
      </Card>

      {products.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-400">Your product library is empty.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map(product => (
            <Card key={product.id} className="flex flex-col">
                <div className="flex gap-4 items-start flex-grow">
                    <img src={product.imageUrl} alt={product.name} className="w-24 h-24 object-cover rounded-md flex-shrink-0 bg-slate-700 border border-slate-600" />
                    <div className="flex-grow">
                        <h3 className="text-lg font-bold text-white line-clamp-2">{product.name}</h3>
                        <p className="text-sm text-indigo-300 font-medium">{product.category}</p>
                        <p className="text-xs text-slate-400 line-clamp-1">{product.brand}</p>
                    </div>
                </div>
                {product.tags && product.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {product.tags.slice(0, 5).map(tag => tag && (
                            <span key={tag} className="bg-slate-700 text-slate-300 text-xs font-medium px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                    </div>
                )}
                <div className="mt-4 pt-4 border-t border-slate-700 flex space-x-2 justify-end">
                    <Button variant="secondary" onClick={() => setEditingProduct(product)}>Edit</Button>
                    <Button variant="danger" onClick={() => setDeletingProduct(product)}>Delete</Button>
                </div>
            </Card>
          ))}
        </div>
      )}

      {editingProduct && (
        <ProductModal
            product={editingProduct}
            onSave={handleSave}
            onClose={() => setEditingProduct(null)}
        />
      )}

      {deletingProduct && (
         <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <Card>
                <h2 className="text-xl font-bold text-white mb-4">Confirm Deletion</h2>
                <p className="text-slate-300">Are you sure you want to delete the product "{deletingProduct.name}"?</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button variant="secondary" onClick={() => setDeletingProduct(null)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete}>Delete</Button>
                </div>
            </Card>
        </div>
      )}
    </div>
  );
};

export default ManageProducts;