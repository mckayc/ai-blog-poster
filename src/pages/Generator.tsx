import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Template } from '../types';
import * as db from '../services/dbService';
import { fetchProductData } from '../services/geminiService';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Button from '../components/common/Button';
import { generateUUID } from '../utils/uuid';

const ProductForm: React.FC<{ 
    product: Product; 
    onUpdate: (updatedProduct: Product) => void; 
    onRemove: () => void; 
    canRemove: boolean;
    apiKeyIsSet: boolean;
}> = ({ product, onUpdate, onRemove, canRemove, apiKeyIsSet }) => {
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleChange = (field: keyof Omit<Product, 'id'>, value: string) => {
    onUpdate({ ...product, [field]: value });
  };
  
  const handleFetchData = async () => {
    if (!product.productUrl) {
        setFetchError("Please provide a product URL.");
        return;
    }
    if (!apiKeyIsSet) {
        setFetchError("API key is not set. Please configure it in the Dashboard.");
        return;
    }
    setIsFetching(true);
    setFetchError(null);
    try {
        const data = await fetchProductData(product.productUrl);
        onUpdate({ ...product, ...data, brand: product.brand }); // Preserve manually entered brand
    } catch (e: any) {
        setFetchError(e.message || "An unknown error occurred during fetch.");
    } finally {
        setIsFetching(false);
    }
  };

  return (
    <Card className="relative mb-6">
      {canRemove && (
        <button onClick={onRemove} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
      <div className="space-y-4">
        <div className="flex items-end gap-x-2">
            <div className="flex-grow">
                <Input label="Product URL" id={`productUrl-${product.id}`} value={product.productUrl} onChange={(e) => handleChange('productUrl', e.target.value)} placeholder="https://amazon.com/dp/..."/>
            </div>
            <Button onClick={handleFetchData} disabled={isFetching || !product.productUrl || !apiKeyIsSet}>
                {isFetching ? 'Fetching...' : 'Fetch Product Data'}
            </Button>
        </div>
        {fetchError && <p className="text-sm text-red-400">{fetchError}</p>}
        {isFetching && <div className="text-sm text-yellow-400">Fetching data from URL, please wait...</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Input label="Product Title" id={`title-${product.id}`} value={product.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="e.g., Wireless Noise Cancelling Headphones" className="md:col-span-2"/>
        <Input label="Product Brand Name" id={`brand-${product.id}`} value={product.brand} onChange={(e) => handleChange('brand', e.target.value)} placeholder="e.g., Sony" />
        <Input label="Price" id={`price-${product.id}`} value={product.price} onChange={(e) => handleChange('price', e.target.value)} placeholder="e.g., $99.99" />
        <Input label="Image URL" id={`imageUrl-${product.id}`} value={product.imageUrl} onChange={(e) => handleChange('imageUrl', e.target.value)} placeholder="https://..." className="md:col-span-2"/>
        <div className="md:col-span-3">
            <Input label="Affiliate Link" id={`affiliateLink-${product.id}`} value={product.affiliateLink} onChange={(e) => handleChange('affiliateLink', e.target.value)} placeholder="https://amzn.to/..."/>
        </div>
        <div className="md:col-span-3">
          <Textarea label="Description / Key Features" id={`description-${product.id}`} value={product.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Paste key features or description here..." rows={4}/>
        </div>
      </div>
    </Card>
  );
};

const InstructionModal: React.FC<{ onGenerate: (instructions: string) => void; onCancel: () => void; }> = ({ onGenerate, onCancel }) => {
  const [instructions, setInstructions] = useState('');
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg">
        <h2 className="text-xl font-bold text-white mb-4">Specific Instructions</h2>
        <p className="text-slate-400 mb-4">Any specific instructions for this post? (e.g., 'focus on battery life', 'compare camera quality in detail'). Leave blank if none.</p>
        <Textarea label="Instructions" id="specific-instructions" value={instructions} onChange={e => setInstructions(e.target.value)} rows={4} />
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onGenerate(instructions)}>Generate Post & Edit</Button>
        </div>
      </Card>
    </div>
  );
};

const Generator: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([{ id: generateUUID(), productUrl: '', title: '', price: '', imageUrl: '', description: '', affiliateLink: '', brand: '' }]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [apiKeyIsSet, setApiKeyIsSet] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    db.getTemplates().then(setTemplates).catch(console.error);
    db.getApiKeyStatus().then(status => setApiKeyIsSet(!!status.apiKey)).catch(console.error);
  }, []);

  const addProduct = () => {
    setProducts([...products, { id: generateUUID(), productUrl: '', title: '', price: '', imageUrl: '', description: '', affiliateLink: '', brand: '' }]);
  };
  
  const updateProduct = (index: number, updatedProduct: Product) => {
    const newProducts = [...products];
    newProducts[index] = updatedProduct;
    setProducts(newProducts);
  };
  
  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleGenerate = async (instructions: string) => {
    setShowInstructionModal(false);
    setIsLoading(true);
    setError(null);

    if (!apiKeyIsSet) {
      setError("API Key not found. Please set it in the Dashboard.");
      setIsLoading(false);
      return;
    }
    
    // Validate products have at least a title
    if(products.some(p => !p.title.trim())) {
        setError("All products must have a title. Please fetch data or enter titles manually.");
        setIsLoading(false);
        return;
    }

    try {
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
      const newPostData = {
        products: products,
        name: `Post about ${products.map(p => p.title || 'product').join(' and ')}`, // Set internal name
        title: `New Post - ${new Date().toLocaleDateString()}`,
        content: '', // Start with empty content
      };
      
      const response = await db.savePost(newPostData);

      if (response.id) {
          const params = new URLSearchParams();
          params.set('new', 'true');
          params.set('instructions', instructions);
          if (selectedTemplate) {
            params.set('templateId', selectedTemplate.id);
          }
          navigate(`/edit/${response.id}?${params.toString()}`);
      } else {
          throw new Error("Failed to create a new post on the server.");
      }

    } catch (e: any) {
      setError(e.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">Post Generator</h1>
            <p className="text-slate-400">Add products, select a template, and generate your post.</p>
        </div>
         <div className="mt-4 sm:mt-0">
            <label htmlFor="template-select" className="block text-sm font-medium text-slate-300 mb-1">
                Select a Template
            </label>
            <select
                id="template-select"
                className="bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 pl-3 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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


      {products.map((p, i) => (
        <ProductForm key={p.id} product={p} onUpdate={(up) => updateProduct(i, up)} onRemove={() => removeProduct(i)} canRemove={products.length > 1} apiKeyIsSet={apiKeyIsSet} />
      ))}

      <div className="flex items-center justify-between mt-6">
        <Button variant="secondary" onClick={addProduct}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Another Product
        </Button>
        <Button onClick={() => setShowInstructionModal(true)} disabled={isLoading || !apiKeyIsSet}>
          {isLoading ? 'Preparing...' : 'Generate Post'}
        </Button>
      </div>

      {error && (
        <Card className="mt-6 border border-red-500 bg-red-900/30">
            <div className="flex items-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-red-300">Error</h3>
            </div>
            <pre className="text-red-300 text-sm whitespace-pre-wrap break-words font-mono bg-slate-900 p-4 rounded-md">
              {error}
            </pre>
        </Card>
      )}
      
      {showInstructionModal && <InstructionModal onGenerate={handleGenerate} onCancel={() => setShowInstructionModal(false)} />}

    </div>
  );
};

export default Generator;