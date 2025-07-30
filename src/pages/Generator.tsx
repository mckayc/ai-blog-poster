
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Template } from '../types';
import * as db from '../services/dbService';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Button from '../components/common/Button';

const ProductSelectionModal: React.FC<{
    onSelect: (product: Product) => void;
    onClose: () => void;
}> = ({ onSelect, onClose }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        db.getProducts({ search: searchTerm }).then(setProducts).catch(console.error);
    }, [searchTerm]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold text-white mb-4">Select a Product from Library</h2>
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search products..." className="mb-4" />
                <div className="overflow-y-auto space-y-2 flex-grow">
                    {products.map(p => (
                        <div key={p.id} onClick={() => onSelect(p)} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-700 cursor-pointer">
                            <img src={p.imageUrl} alt={p.name} className="w-12 h-12 object-cover rounded-md flex-shrink-0 bg-slate-700" />
                            <div>
                                <p className="font-semibold">{p.name}</p>
                                <p className="text-sm text-slate-400">{p.brand}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 text-right">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </Card>
        </div>
    );
};


const Generator: React.FC = () => {
  const navigate = useNavigate();
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default');
  const [instructions, setInstructions] = useState('');
  const [includeComparisonCards, setIncludeComparisonCards] = useState(true);
  
  const [newProductUrl, setNewProductUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showProductModal, setShowProductModal] = useState(false);


  useEffect(() => {
    db.getTemplates().then(setTemplates).catch(console.error);
  }, []);

  const addProductFromLibrary = (product: Product) => {
    if (!selectedProducts.find(p => p.id === product.id)) {
        setSelectedProducts([...selectedProducts, product]);
    }
    setShowProductModal(false);
  };
  
  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  const handleFetchProduct = async () => {
    if (!newProductUrl) return;
    setIsFetching(true);
    setError(null);
    try {
        const product = await db.fetchAndSaveProduct(newProductUrl);
        if (!selectedProducts.find(p => p.id === product.id)) {
            setSelectedProducts(prev => [...prev, product]);
        }
        setNewProductUrl('');
    } catch(e: any) {
        setError(e.message || "Failed to fetch product.");
    } finally {
        setIsFetching(false);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    if (selectedProducts.length === 0) {
        setError("Please add at least one product to compare.");
        setIsLoading(false);
        return;
    }

    try {
      const productNames = selectedProducts.map(p => p.name).slice(0, 2).join(' vs ');
      const newPostData = {
        name: `Generated: ${productNames}`,
        title: 'Generating post...',
        content: '<p>The AI is warming up...</p>',
        products: selectedProducts,
        tags: [],
      };
      const response = await db.savePost(newPostData);
      
      if (response.id) {
        const params = new URLSearchParams();
        params.set('new', 'true');
        params.set('instructions', instructions);
        if(selectedTemplateId) params.set('templateId', selectedTemplateId);
        params.set('includeComparisonCards', includeComparisonCards.toString());

        navigate(`/edit/${response.id}?${params.toString()}`);
      } else {
        throw new Error("Failed to create a new post on the server.");
      }

    } catch (e: any) {
      setError(e.message || "An unknown error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div>
        {showProductModal && <ProductSelectionModal onSelect={addProductFromLibrary} onClose={() => setShowProductModal(false)} />}
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Create with AI</h1>
                <p className="text-slate-400">Add products, provide instructions, and let the AI build your post.</p>
            </div>
        </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <h2 className="text-xl font-semibold mb-4">Products to Compare</h2>
                {selectedProducts.length === 0 ? (
                    <p className="text-slate-400">Add products using the options on the right.</p>
                ) : (
                    <div className="space-y-3">
                        {selectedProducts.map(p => (
                            <div key={p.id} className="bg-slate-700 p-3 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <img src={p.imageUrl} alt={p.name} className="w-16 h-16 object-cover rounded-md flex-shrink-0 bg-slate-800"/>
                                    <div>
                                        <p className="font-semibold text-white">{p.name}</p>
                                        <p className="text-sm text-slate-300">{p.brand}</p>
                                    </div>
                                </div>
                                <Button variant="danger" onClick={() => removeProduct(p.id)}>Remove</Button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
             <Card>
                <h2 className="text-xl font-semibold mb-4">Instructions</h2>
                <div className="space-y-4">
                    <Textarea
                        label="Specific instructions for this post"
                        value={instructions}
                        onChange={e => setInstructions(e.target.value)}
                        rows={4}
                        placeholder="e.g., 'Focus on battery life and camera quality.' or 'Compare these for a beginner photographer.'"
                    />
                    <div>
                        <label htmlFor="template-select" className="block text-sm font-medium text-slate-300 mb-1">
                            Select a Template
                        </label>
                        <select
                            id="template-select"
                            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-indigo-500"
                            value={selectedTemplateId}
                            onChange={e => setSelectedTemplateId(e.target.value)}
                        >
                            <option value="default">Default Prompt</option>
                            {templates.map(template => (
                                <option key={template.id} value={template.id}>{template.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <h2 className="text-xl font-semibold mb-4">Add Products</h2>
                 <div className="space-y-4">
                    <Button onClick={() => setShowProductModal(true)} className="w-full">
                        Add from Product Library
                    </Button>
                    <div className="text-center text-slate-400">or</div>
                    <div>
                        <Input 
                            label="Add new product from URL"
                            value={newProductUrl}
                            onChange={e => setNewProductUrl(e.target.value)}
                            placeholder="https://amazon.com/dp/..."
                        />
                         <Button onClick={handleFetchProduct} disabled={isFetching || !newProductUrl} className="w-full mt-2">
                            {isFetching ? 'Fetching...' : 'Fetch & Add Product'}
                        </Button>
                    </div>
                </div>
            </Card>
            <Card>
                <h2 className="text-xl font-semibold mb-4">Generate</h2>
                <div className="space-y-3">
                     <div className="flex items-center space-x-3 bg-slate-700/50 p-3 rounded-lg">
                        <input
                            type="checkbox"
                            id="comparison-cards-toggle"
                            checked={includeComparisonCards}
                            onChange={(e) => setIncludeComparisonCards(e.target.checked)}
                            className="h-5 w-5 rounded border-slate-500 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-800"
                        />
                        <label htmlFor="comparison-cards-toggle" className="text-slate-300 select-none">
                           Include AI Comparison Cards
                        </label>
                    </div>
                    <p className="text-slate-400 mb-4">Once you're ready, click the button below to create your post.</p>
                    <Button onClick={handleGenerate} disabled={isLoading || selectedProducts.length === 0} className="w-full">
                        {isLoading ? 'Creating Post...' : 'Generate Blog Post'}
                    </Button>
                </div>
                 {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            </Card>
        </div>
      </div>
    </div>
  );
};

export default Generator;
