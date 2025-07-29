
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Product, BlogPost } from '../types';
import { useApp } from '../contexts/AppContext';
import { generateBlogPost } from '../services/geminiService';
import { fetchProductDetails } from '../services/productScraperService';
import useLocalStorage from '../hooks/useLocalStorage';
import ProductInput from '../components/ProductInput';
import PlusIcon from '../components/icons/PlusIcon';
import CopyIcon from '../components/icons/CopyIcon';
import Modal from '../components/Modal';
import SeoIcon from '../components/icons/SeoIcon';

const createNewProduct = (): Product => ({
  id: uuidv4(),
  productUrl: '',
  title: '',
  price: '',
  imageUrl: '',
  description: '',
  otherInfo: '',
  affiliateLink: '',
});

interface GeneratedPost {
  title: string;
  post: string;
  labels: string;
  metaDescription: string;
  socialMediaSnippets: string;
}

const Generator: React.FC = () => {
  const { settings, addToast } = useApp();
  const [products, setProducts] = useState<Product[]>([createNewProduct()]);
  const [blogPosts, setBlogPosts] = useLocalStorage<BlogPost[]>('blog-posts', []);
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [specificInstructions, setSpecificInstructions] = useState('');
  const [localGeneralInstructions, setLocalGeneralInstructions] = useState(settings.generalInstructions);
  const [seoKeywords, setSeoKeywords] = useState({ primary: '', secondary: '' });
  const [isSeoVisible, setIsSeoVisible] = useState(false);

  useEffect(() => {
    setLocalGeneralInstructions(settings.generalInstructions);
  }, [settings.generalInstructions]);

  const addProduct = () => {
    setProducts([...products, createNewProduct()]);
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const updateProduct = (id: string, field: keyof Product, value: string) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  
  const handleFetchDetails = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || !product.productUrl) {
      addToast('Please enter a product URL first.', 'error');
      return;
    }

    addToast('Fetching product details...', 'info');
    try {
      const details = await fetchProductDetails(product.productUrl);
      // This part will only work if the placeholder service is replaced with a real implementation
      setProducts(products.map(p => p.id === productId ? { ...p, ...details } : p));
      addToast('Product details fetched!', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not fetch product details.';
      addToast(message, 'error');
    }
  };

  const handleGenerateClick = () => {
    if (products.some(p => !p.title || !p.description)) {
      addToast('Please fill in at least the title and description for all products.', 'error');
      return;
    }
    if (!settings.apiKey) {
      addToast('Please set your Gemini API key in the Dashboard.', 'error');
      return;
    }
    setIsModalOpen(true);
  };
  
  const handleConfirmGenerate = async () => {
    setIsModalOpen(false);
    setIsLoading(true);
    setGeneratedPost(null);
    try {
      const content = await generateBlogPost(settings.apiKey, products, localGeneralInstructions, specificInstructions, seoKeywords);
      setGeneratedPost(content);
      
      const newPost: BlogPost = {
        id: uuidv4(),
        title: content.title,
        content: content.post,
        labels: content.labels,
        metaDescription: content.metaDescription,
        socialMediaSnippets: content.socialMediaSnippets,
        products: products,
        createdAt: new Date().toISOString(),
      };
      setBlogPosts([newPost, ...blogPosts]);
      addToast('Blog post generated and saved!', 'success');
      
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
      setSpecificInstructions('');
    }
  };
  
  const handleCopyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${fieldName} copied to clipboard!`, 'success');
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left side - Inputs */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-800">Blog Post Generator</h2>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <label htmlFor="localGeneralInstructions" className="block text-lg font-semibold text-gray-700 mb-2">
            General Instructions
          </label>
           <p className="text-sm text-gray-500 mb-3">
            These are the general AI instructions from your dashboard. You can edit them here for this session only.
          </p>
          <textarea
            id="localGeneralInstructions"
            value={localGeneralInstructions}
            onChange={(e) => setLocalGeneralInstructions(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
          />
        </div>
        
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <button onClick={() => setIsSeoVisible(!isSeoVisible)} className="w-full flex justify-between items-center text-left p-6">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-3">
              <SeoIcon className="w-6 h-6 text-secondary" />
              SEO Toolkit
            </h3>
            <span className="text-2xl text-gray-400 transform transition-transform">{isSeoVisible ? '−' : '+'}</span>
          </button>
          {isSeoVisible && (
            <div className="px-6 pb-6 space-y-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 pt-4">Provide keywords to help the AI optimize the post for search engines.</p>
              <div>
                <label htmlFor="primaryKeyword" className="block text-sm font-medium text-gray-600 mb-1">Primary Keyword</label>
                <input type="text" id="primaryKeyword" value={seoKeywords.primary} onChange={e => setSeoKeywords({...seoKeywords, primary: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" placeholder="e.g., best budget gaming laptop"/>
              </div>
              <div>
                <label htmlFor="secondaryKeywords" className="block text-sm font-medium text-gray-600 mb-1">Secondary Keywords (comma-separated)</label>
                <input type="text" id="secondaryKeywords" value={seoKeywords.secondary} onChange={e => setSeoKeywords({...seoKeywords, secondary: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" placeholder="e.g., affordable laptop, high refresh rate screen"/>
              </div>
            </div>
          )}
        </div>


        {products.map((product, index) => (
          <ProductInput
            key={product.id}
            product={product}
            index={index}
            updateProduct={updateProduct}
            removeProduct={removeProduct}
            isOnlyProduct={products.length === 1}
            onFetchDetails={handleFetchDetails}
          />
        ))}
        <div className="flex justify-between items-center gap-4">
          <button
            onClick={addProduct}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 font-semibold rounded-md hover:bg-indigo-200 transition-colors"
          >
            <PlusIcon className="w-5 h-5"/>
            Add Another Product
          </button>
          <button
            onClick={handleGenerateClick}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-md shadow-lg hover:bg-opacity-90 disabled:bg-gray-400 transition-transform transform hover:scale-105"
          >
            {isLoading ? 'Generating...' : 'Generate Blog Post'}
          </button>
        </div>
      </div>

      {/* Right side - Output */}
      <div className="lg:sticky top-24 self-start">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Generated Post</h2>
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 min-h-[70vh] relative">
          {isLoading && (
             <div className="absolute inset-0 bg-white bg-opacity-75 flex flex-col justify-center items-center z-10 rounded-lg">
                <div className="w-16 h-16 border-4 border-t-primary border-gray-200 rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600 font-semibold">AI is thinking...</p>
            </div>
          )}
          {!generatedPost && !isLoading && (
              <div className="flex justify-center items-center h-full">
                <p className="text-gray-400 text-center">Your generated blog post will appear here...</p>
              </div>
          )}
          {generatedPost && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Title</label>
                <div className="relative">
                  <input type="text" value={generatedPost.title} readOnly className="w-full pr-10 px-3 py-2 border bg-gray-50 border-gray-300 rounded-md shadow-sm" />
                  <button onClick={() => handleCopyToClipboard(generatedPost.title, 'Title')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-primary"><CopyIcon className="w-5 h-5"/></button>
                </div>
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Labels</label>
                <div className="relative">
                  <input type="text" value={generatedPost.labels} readOnly className="w-full pr-10 px-3 py-2 border bg-gray-50 border-gray-300 rounded-md shadow-sm" />
                  <button onClick={() => handleCopyToClipboard(generatedPost.labels, 'Labels')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-primary"><CopyIcon className="w-5 h-5"/></button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Meta Description</label>
                <div className="relative">
                   <textarea value={generatedPost.metaDescription} readOnly rows={2} className="w-full pr-10 p-2 border bg-gray-50 border-gray-300 rounded-md shadow-sm" />
                  <button onClick={() => handleCopyToClipboard(generatedPost.metaDescription, 'Meta Description')} className="absolute top-2 right-2 flex items-center pr-1 text-gray-400 hover:text-primary"><CopyIcon className="w-5 h-5"/></button>
                </div>
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Social Media Snippets</label>
                <div className="relative">
                   <textarea value={generatedPost.socialMediaSnippets} readOnly rows={3} className="w-full pr-10 p-2 border bg-gray-50 border-gray-300 rounded-md shadow-sm whitespace-pre-wrap" />
                   <button onClick={() => handleCopyToClipboard(generatedPost.socialMediaSnippets, 'Social Snippets')} className="absolute top-2 right-2 flex items-center pr-1 text-gray-400 hover:text-primary"><CopyIcon className="w-5 h-5"/></button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Post HTML</label>
                <div className="relative">
                   <button onClick={() => handleCopyToClipboard(generatedPost.post, 'Post HTML')} className="absolute top-2 right-2 p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full z-20" aria-label="Copy Post HTML"><CopyIcon className="w-5 h-5" /></button>
                   <div className="prose max-w-none h-[40vh] overflow-y-auto p-3 border border-gray-200 rounded-md bg-gray-50" dangerouslySetInnerHTML={{ __html: generatedPost.post }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Final Touches">
          <div className="space-y-4">
              <div>
                  <label htmlFor="specificInstructions" className="block text-sm font-medium text-gray-700 mb-1">
                      Specific Instructions (Optional)
                  </label>
                  <textarea
                      id="specificInstructions"
                      value={specificInstructions}
                      onChange={(e) => setSpecificInstructions(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                      placeholder="e.g., Focus on the battery life comparison. Mention that Product A is better for travelers."
                  />
              </div>
              <div className="flex justify-end gap-2">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                      Cancel
                  </button>
                  <button onClick={handleConfirmGenerate} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90">
                      Confirm & Generate
                  </button>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default Generator;
