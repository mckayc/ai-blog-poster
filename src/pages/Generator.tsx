
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('');

    useEffect(() => {
        db.getProducts({ search: searchTerm, category: selectedCategory }).then(setProducts).catch(console.error);
    }, [searchTerm, selectedCategory]);

    useEffect(() => {
        db.getUniqueCategories().then(setCategories).catch(console.error);
    }, []);

    const formatPrice = (price: string) => {
        if (!price) return null;
        const trimmed = price.trim();
        if (trimmed.startsWith('$')) return trimmed;
        if (/^[\d,.-]+$/.test(trimmed)) return `$${trimmed}`;
        return trimmed;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold text-white mb-4">Select a Product from Library</h2>
                <div className="flex gap-4 mb-4">
                    <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search products..." className="flex-grow" />
                    <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-indigo-500">
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="overflow-y-auto space-y-2 flex-grow">
                    {products.map(p => (
                        <div key={p.id} onClick={() => onSelect(p)} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-700 cursor-pointer">
                            <img src={p.imageUrl} alt={p.name} className="w-12 h-12 object-cover rounded-md flex-shrink-0 bg-slate-700" />
                            <div className="flex-grow">
                                <p className="font-semibold">{p.name}</p>
                                <p className="text-sm text-slate-400">{p.brand}</p>
                            </div>
                            {p.price && <p className="font-semibold text-emerald-400 flex-shrink-0">{formatPrice(p.price)}</p>}
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

const toneOptions = ['Friendly', 'Professional', 'Humorous', 'Technical', 'Casual', 'Witty', 'Authoritative', 'Excited', 'Direct', 'Storytelling'];
const introStyleOptions = ['Full', 'Short', 'Basic', 'None'];
const descriptionStyleOptions = ['Detailed Paragraphs', 'Concise Summary', 'Bullet Points'];

const GenerationFeatureControl: React.FC<{
    title: string;
    featureState: { enabled: boolean; placement: Record<string, boolean> };
    onFeatureChange: (newState: { enabled: boolean; placement: Record<string, boolean> }) => void;
}> = ({ title, featureState, onFeatureChange }) => {
    const handlePlacementChange = (position: 'beginning' | 'middle' | 'end') => {
        onFeatureChange({
            ...featureState,
            placement: {
                ...featureState.placement,
                [position]: !featureState.placement[position]
            }
        });
    };

    return (
        <div className="bg-slate-700/50 p-3 rounded-lg">
            <div className="flex items-center space-x-3">
                <input
                    type="checkbox"
                    id={`toggle-${title}`}
                    checked={featureState.enabled}
                    onChange={(e) => onFeatureChange({ ...featureState, enabled: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-500 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-800"
                />
                <label htmlFor={`toggle-${title}`} className="text-slate-200 font-semibold select-none">
                    {title}
                </label>
            </div>
            {featureState.enabled && (
                <div className="mt-3 pl-8 flex items-center space-x-4">
                    <span className="text-sm text-slate-400">Place at:</span>
                    {['beginning', 'middle', 'end'].map(pos => (
                         <div key={pos} className="flex items-center">
                            <input
                                type="checkbox"
                                id={`placement-${title}-${pos}`}
                                checked={!!featureState.placement[pos]}
                                onChange={() => handlePlacementChange(pos as any)}
                                className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor={`placement-${title}-${pos}`} className="ml-2 text-sm text-slate-300 capitalize select-none">{pos}</label>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const Generator: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default');
  const [instructions, setInstructions] = useState('');
  
  // New state for advanced controls
  const [introductionStyle, setIntroductionStyle] = useState('Full');
  const [introductionTone, setIntroductionTone] = useState('Friendly');
  const [descriptionStyle, setDescriptionStyle] = useState('Detailed Paragraphs');
  const [descriptionTone, setDescriptionTone] = useState('Professional');
  
  const [comparisonCards, setComparisonCards] = useState<{ enabled: boolean; placement: Record<string, boolean> }>({ enabled: true, placement: { middle: true } });
  const [photoComparison, setPhotoComparison] = useState<{ enabled: boolean; placement: Record<string, boolean> }>({ enabled: false, placement: { beginning: true } });
  
  const [newProductUrl, setNewProductUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const productIds = params.get('productIds');
    if (productIds) {
      const ids = productIds.split(',');
      Promise.all(ids.map(id => db.getProduct(id)))
        .then(products => setSelectedProducts(products))
        .catch(err => {
          console.error("Failed to load products from URL", err);
          setError("Could not load some products from the library.");
        });
      // Clean up the URL
      navigate('/generator', { replace: true });
    }
  }, [location, navigate]);


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
        asins: selectedProducts.map(p => p.productUrl.match(/dp\/(\w+)/)?.[1]).filter(Boolean).join(','),
      };
      const response = await db.savePost(newPostData);
      
      if (response.id) {
        const params = new URLSearchParams();
        params.set('new', 'true');
        params.set('instructions', instructions);
        if(selectedTemplateId) params.set('templateId', selectedTemplateId);
        
        // Add new advanced options to params
        params.set('introductionStyle', introductionStyle);
        params.set('introductionTone', introductionTone);
        params.set('descriptionStyle', descriptionStyle);
        params.set('descriptionTone', descriptionTone);
        params.set('comparisonCards', JSON.stringify(comparisonCards));
        params.set('photoComparison', JSON.stringify(photoComparison));

        navigate(`/edit/${response.id}?${params.toString()}`);
      } else {
        throw new Error("Failed to create a new post on the server.");
      }

    } catch (e: any) {
      setError(e.message || "An unknown error occurred.");
      setIsLoading(false);
    }
  };
  
  const Dropdown = ({ label, value, onChange, options }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-indigo-500">
            {options.map(opt => {
                if (typeof opt === 'object' && opt !== null) {
                    return <option key={opt.value} value={opt.value}>{opt.name}</option>;
                }
                return <option key={opt} value={opt}>{opt}</option>;
            })}
        </select>
    </div>
  );

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
                <h2 className="text-xl font-semibold mb-4">Introduction</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Dropdown label="Style" value={introductionStyle} onChange={setIntroductionStyle} options={introStyleOptions} />
                    <Dropdown label="Tone" value={introductionTone} onChange={setIntroductionTone} options={toneOptions} />
                </div>
            </Card>
            <Card>
                <h2 className="text-xl font-semibold mb-4">Product Description</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Dropdown label="Style" value={descriptionStyle} onChange={setDescriptionStyle} options={descriptionStyleOptions} />
                    <Dropdown label="Tone" value={descriptionTone} onChange={setDescriptionTone} options={toneOptions} />
                </div>
            </Card>
            <Card>
                <h2 className="text-xl font-semibold mb-4">Instructions & Template</h2>
                <div className="space-y-4">
                    <Textarea
                        label="Specific instructions for this post"
                        value={instructions}
                        onChange={e => setInstructions(e.target.value)}
                        rows={4}
                        placeholder="e.g., 'Focus on battery life and camera quality.' or 'Compare these for a beginner photographer.'"
                    />
                    <Dropdown label="Prompt Template" value={selectedTemplateId} onChange={setSelectedTemplateId} options={[{ value: 'default', name: 'Default Prompt' }, ...templates.map(t => ({ value: t.id, name: t.name }))]} />
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
                    <GenerationFeatureControl title="AI Comparison Cards" featureState={comparisonCards} onFeatureChange={setComparisonCards} />
                    <GenerationFeatureControl title="Photo Comparison" featureState={photoComparison} onFeatureChange={setPhotoComparison} />
                    <p className="text-slate-400 my-4">Once you're ready, click the button below to create your post.</p>
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
