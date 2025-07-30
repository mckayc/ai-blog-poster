import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Template } from '/src/types';
import * as db from '/src/services/dbService';
import Card from '/src/components/common/Card';
import Input from '/src/components/common/Input';
import Textarea from '/src/components/common/Textarea';
import Button from '/src/components/common/Button';

const commonCategories = ["Electronics", "Home & Kitchen", "Books", "Clothing", "Health & Beauty", "Sports & Outdoors", "Toys & Games"];


// Modal to select products from the library or add a new one
const ProductSelectorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAddProducts: (products: Product[]) => void;
  apiKeyIsSet: boolean;
}> = ({ isOpen, onClose, onAddProducts, apiKeyIsSet }) => {
  const [activeTab, setActiveTab] = useState<'library' | 'new'>('library');
  const [libraryProducts, setLibraryProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  const [newProductUrl, setNewProductUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchLibrary = useCallback(async () => {
    try {
      const prods = await db.getProducts({ search: searchTerm, category: selectedCategory });
      setLibraryProducts(prods);
    } catch (e) {
      console.error(e);
    }
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    if (isOpen && activeTab === 'library') {
      fetchLibrary();
      db.getUniqueCategories().then(setCategories).catch(console.error);
    }
  }, [isOpen, activeTab, fetchLibrary]);

  if (!isOpen) return null;

  const handleSelectProduct = (product: Product) => {
    setSelectedProducts(prev =>
      prev.some(p => p.id === product.id)
        ? prev.filter(p => p.id !== product.id)
        : [...prev, product]
    );
  };

  const handleAddSelected = () => {
    onAddProducts(selectedProducts);
    onClose();
  };

  const handleFetchAndAdd = async () => {
      if (!newProductUrl) {
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
          const newProduct = await db.fetchAndSaveProduct(newProductUrl);
          onAddProducts([newProduct]);
          onClose();
      } catch (e: any) {
          setFetchError(e.message || "An unknown error occurred during fetch.");
      } finally {
          setIsFetching(false);
      }
  };

  const filteredProducts = libraryProducts;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Select Products</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
        </div>
        <div className="border-b border-slate-700 mb-4">
          <nav className="-mb-px flex space-x-6">
            <button onClick={() => setActiveTab('library')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'library' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
              From Library
            </button>
            <button onClick={() => setActiveTab('new')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'new' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
              Add New from URL
            </button>
          </nav>
        </div>

        {activeTab === 'library' && (
          <div className="flex-grow flex flex-col min-h-0">
            <div className="flex gap-4 mb-4">
                <Input placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-grow"/>
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-md">
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div className="flex-grow overflow-y-auto pr-2">
              {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredProducts.map(p => (
                          <div key={p.id} onClick={() => handleSelectProduct(p)} className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedProducts.some(sp => sp.id === p.id) ? 'border-indigo-500 bg-indigo-900/20' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`}>
                              <div className="flex items-center gap-3">
                                <img src={p.imageUrl} alt={p.name} className="w-16 h-16 object-cover rounded-md flex-shrink-0 bg-slate-700"/>
                                <div>
                                    <p className="font-bold text-white line-clamp-2">{p.name}</p>
                                    <p className="text-xs text-slate-400">{p.brand}</p>
                                </div>
                              </div>
                          </div>
                      ))}
                  </div>
              ): (
                  <p className="text-slate-400 text-center py-8">No products found in your library. Try the 'Add New from URL' tab.</p>
              )}
            </div>
            <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-700">
              <span className="text-sm text-slate-400">{selectedProducts.length} product(s) selected</span>
              <Button onClick={handleAddSelected} disabled={selectedProducts.length === 0}>Add to Post</Button>
            </div>
          </div>
        )}

        {activeTab === 'new' && (
          <div>
            <p className="text-slate-400 mb-4">Enter a product URL (e.g., from Amazon). The system will fetch its data and save it to your library.</p>
            <div className="space-y-4">
              <Input label="Product URL" id="new-product-url" value={newProductUrl} onChange={e => setNewProductUrl(e.target.value)} placeholder="https://amazon.com/dp/..."/>
              {fetchError && <p className="text-sm text-red-400">{fetchError}</p>}
              {isFetching && <div className="text-sm text-yellow-400">Fetching data and saving to library...</div>}
              <div className="flex justify-end">
                <Button onClick={handleFetchAndAdd} disabled={isFetching || !newProductUrl || !apiKeyIsSet}>
                  {isFetching ? 'Fetching...' : 'Fetch & Add to Post'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};


const Generator: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKeyIsSet, setApiKeyIsSet] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    db.getTemplates().then(setTemplates).catch(console.error);
    db.getApiKeyStatus().then(status => setApiKeyIsSet(!!status.apiKey)).catch(console.error);
  }, []);
  
  const handleAddProducts = (newProducts: Product[]) => {
    // Avoid adding duplicates
    const productsToAdd = newProducts.filter(np => !products.some(p => p.id === np.id));
    setProducts(prev => [...prev, ...productsToAdd]);
  };

  const removeProduct = (productId: string) => {
    setProducts(products.filter(p => p.id !== productId));
  };

  const handleGenerate = async (instructions: string) => {
    setIsLoading(true);
    setError(null);

    if (!apiKeyIsSet) {
      setError("API Key not found. Please set it in the Dashboard.");
      setIsLoading(false);
      return;
    }
    
    if (products.length === 0) {
        setError("Please add at least one product to generate a post.");
        setIsLoading(false);
        return;
    }

    try {
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
      const newPostData = {
        products: products,
        name: `Post about ${products.map(p => p.name).join(' vs ')}`,
        title: `New Post - ${new Date().toLocaleDateString()}`,
        content: '<p>Generating content...</p>',
        heroImageUrl: '',
        tags: [],
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
      setIsLoading(false);
    }
  };
  
  const [showInstructionModal, setShowInstructionModal] = useState(false);

  return (
    <div>
      {isLoading && (
            <div className="fixed inset-0 bg-slate-900 bg-opacity-80 flex flex-col items-center justify-center z-50 transition-opacity duration-300">
                <svg className="animate-spin h-10 w-10 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h2 className="text-2xl text-white font-bold">Creating your masterpiece...</h2>
                <p className="text-slate-300 mt-2">The AI is working its magic. You'll be redirected to the editor shortly.</p>
            </div>
        )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">Post Generator</h1>
            <p className="text-slate-400">Add products from your library and generate a new post.</p>
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

      <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Products for this Post</h2>
          {products.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-lg">
                <p className="text-slate-400">No products added yet.</p>
                <Button onClick={() => setIsModalOpen(true)} className="mt-4">
                    Add Product(s)
                </Button>
            </div>
          ) : (
            <div className="space-y-3">
                {products.map(p => (
                    <div key={p.id} className="bg-slate-800 p-3 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <img src={p.imageUrl} alt={p.name} className="w-16 h-16 object-cover rounded-md flex-shrink-0 bg-slate-700" />
                            <div>
                                <p className="font-bold text-white">{p.name}</p>
                                <p className="text-sm text-slate-300 line-clamp-1">{p.title}</p>
                            </div>
                        </div>
                        <button onClick={() => removeProduct(p.id)} className="text-slate-500 hover:text-red-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ))}
                <div className="pt-4 text-right">
                    <Button onClick={() => setIsModalOpen(true)} variant="secondary">
                        Add/Remove Products...
                    </Button>
                </div>
            </div>
          )}
      </Card>

      <div className="flex items-center justify-end mt-6">
        <Button onClick={() => setShowInstructionModal(true)} disabled={isLoading || !apiKeyIsSet || products.length === 0}>
          {isLoading ? 'Preparing...' : 'Generate Post'}
        </Button>
      </div>

      {error && (
        <Card className="mt-6 border border-red-500 bg-red-900/30">
            <h3 className="text-lg font-semibold text-red-300 mb-2">Error</h3>
            <p className="text-red-300 text-sm">{error}</p>
        </Card>
      )}
      
      {isModalOpen && <ProductSelectorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAddProducts={handleAddProducts} apiKeyIsSet={apiKeyIsSet} />}
      {showInstructionModal && <InstructionModal onGenerate={handleGenerate} onCancel={() => setShowInstructionModal(false)} />}
    </div>
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

export default Generator;