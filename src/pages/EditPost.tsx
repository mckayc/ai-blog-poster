
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ReactQuill, { Quill } from 'react-quill';
import ImageResize from 'quill-image-resize-module-react';
import quillBetterTable from 'quill-better-table';
import { BlogPost, Template, Product } from '../types.ts';
import * as db from '../services/dbService.ts';
import * as gemini from '../services/geminiService.ts';
import Card from '../components/common/Card.tsx';
import Button from '../components/common/Button.tsx';
import Input from '../components/common/Input.tsx';
import Textarea from '../components/common/Textarea.tsx';
import LoadingOverlay from '../components/common/LoadingOverlay.tsx';

// Register Quill modules for image resizing and tables.
Quill.register({
    'modules/imageResize': ImageResize,
    'modules/better-table': quillBetterTable
}, true);

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
    ['link', 'image', 'blockquote', 'code-block'],
    ['table'],
    [{ 'align': [] }],
    ['clean']
  ],
  imageResize: { parchment: Quill.import('parchment'), modules: ['Resize', 'DisplaySize', 'Toolbar'] },
  table: false,
  'better-table': { operationMenu: { items: { unmergeCells: { text: 'Unmerge cells' } } } },
};

const defaultPost: BlogPost = {
    id: '',
    name: 'Loading...',
    title: 'Loading...',
    heroImageUrl: '',
    content: '',
    products: [],
    tags: [],
    createdAt: ''
};

type Status = 'loading' | 'streaming' | 'saving' | 'generating_title' | 'deleting' | 'idle' | 'error';

const TitleSuggestionsModal: React.FC<{
    suggestions: string[];
    onSelect: (title: string) => void;
    onClose: () => void;
}> = ({ suggestions, onSelect, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-lg">
            <h2 className="text-xl font-bold text-white mb-4">Title Suggestions</h2>
            <div className="space-y-2">
                {suggestions.map((title, index) => (
                    <button key={index} onClick={() => onSelect(title)} className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors">
                        {title}
                    </button>
                ))}
            </div>
            <div className="mt-6 text-right">
                <Button variant="secondary" onClick={onClose}>Close</Button>
            </div>
        </Card>
    </div>
);


const EditPost: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [post, setPost] = useState<BlogPost>(defaultPost);
    const [editorMode, setEditorMode] = useState<'wysiwyg' | 'html'>('wysiwyg');
    const [status, setStatus] = useState<Status>('loading');
    const [streamError, setStreamError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
    const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
    
    const isInitialGeneration = searchParams.get('new') === 'true';

    const handleFieldChange = useCallback(<K extends keyof BlogPost>(field: K, value: BlogPost[K]) => {
        setPost(p => ({ ...p, [field]: value }));
    }, []);

    const performInitialStream = useCallback(async (currentPost: BlogPost) => {
        setStatus('streaming');
        setStreamError(null);
        handleFieldChange('content', ''); // Clear content before streaming

        try {
            const instructions = searchParams.get('instructions') || '';
            const templateId = searchParams.get('templateId');
            
            const response = await gemini.generatePostStream(currentPost.products, instructions, templateId);

            if (!response.body) throw new Error("Response body is missing.");
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedJson = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                if (chunk.startsWith('STREAM_ERROR:')) {
                    throw new Error(chunk.replace('STREAM_ERROR:', '').trim());
                }
                accumulatedJson += chunk;
                
                try {
                    const partialData = JSON.parse(accumulatedJson);
                    setPost(prev => ({
                        ...prev,
                        title: partialData.title || prev.title,
                        heroImageUrl: partialData.heroImageUrl || prev.heroImageUrl,
                        content: partialData.content || prev.content,
                        tags: Array.isArray(partialData.tags) ? partialData.tags : prev.tags,
                    }));
                } catch (e) {
                    // This is expected for partial JSON chunks, so we just continue
                }
            }
            
            const finalData = JSON.parse(accumulatedJson);
            const updatedPost: BlogPost = { 
                ...currentPost, 
                title: finalData.title || 'Generation Failed: Untitled',
                heroImageUrl: finalData.heroImageUrl || '',
                content: finalData.content || '<p>Error: AI failed to generate content.</p>',
                tags: Array.isArray(finalData.tags) ? finalData.tags : [],
            };
            
            await db.updatePost(updatedPost);
            setPost(updatedPost);
            
        } catch (error: any) {
            setStreamError(error.message || "An unknown error occurred during streaming.");
            setPost(currentPost); // Restore original post data on error
        } finally {
            setStatus('idle');
            setSearchParams({}, { replace: true });
        }
    }, [handleFieldChange, searchParams, setSearchParams]);

    useEffect(() => {
        if (!postId) {
            navigate('/manage');
            return;
        }

        const loadPost = async () => {
            setStatus('loading');
            try {
                const foundPost = await db.getPost(postId);
                if (!foundPost) throw new Error(`Post with ID ${postId} not found.`);
                
                const sanitizedPost = {
                    ...defaultPost,
                    ...foundPost,
                    tags: Array.isArray(foundPost.tags) ? foundPost.tags : [],
                    products: Array.isArray(foundPost.products) ? foundPost.products : [],
                };
                
                setPost(sanitizedPost);
                
                if (isInitialGeneration) {
                    await performInitialStream(sanitizedPost);
                } else {
                    setStatus('idle');
                }
            } catch (err) {
                alert(`Failed to load post: ${err instanceof Error ? err.message : 'Unknown error'}`);
                navigate('/manage');
            }
        };

        loadPost();
    }, [postId, navigate, isInitialGeneration, performInitialStream]);

    const handleSave = async () => {
        setStatus('saving');
        setSaveSuccess(false);
        try {
            await db.updatePost(post);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            alert('Failed to save post.');
        } finally {
            setStatus('idle');
        }
    };
    
    const handleDelete = async () => {
        setStatus('deleting');
        try {
            await db.deletePost(post.id);
            navigate('/manage');
        } catch (error) {
            alert('Failed to delete post.');
            setStatus('idle');
        }
    };
    
    const handleSuggestTitles = async () => {
        setStatus('generating_title');
        try {
            const suggestions = await gemini.generateTitleIdea(post.products);
            setTitleSuggestions(suggestions);
            setShowSuggestionsModal(true);
        } catch (error) {
            alert('Failed to generate titles.');
        } finally {
            setStatus('idle');
        }
    };
    
    const handleSelectTitle = (title: string) => {
        handleFieldChange('title', title);
        setShowSuggestionsModal(false);
    };

    if (status === 'loading') return <LoadingOverlay message="Loading Post Data..." />;
    if (status === 'streaming' && isInitialGeneration) return <LoadingOverlay message="Generating Your Masterpiece..." details="The AI is working its magic. The editor will become available once the initial draft is complete." />
    
    const isBusy = status !== 'idle';
    
    return (
     <>
        {showSuggestionsModal && <TitleSuggestionsModal suggestions={titleSuggestions} onSelect={handleSelectTitle} onClose={() => setShowSuggestionsModal(false)} />}
        
        {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                <Card>
                    <h2 className="text-xl font-bold text-white mb-4">Confirm Deletion</h2>
                    <p className="text-slate-300">Are you sure you want to delete this post?</p>
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                        <Button variant="danger" onClick={handleDelete} disabled={status === 'deleting'}>{status === 'deleting' ? 'Deleting...' : 'Delete'}</Button>
                    </div>
                </Card>
            </div>
        )}

        <style>{`
            .ql-editor { min-height: 500px; font-size: 1rem; line-height: 1.6; background-color: #0f172a; color: #cbd5e1; }
            .ql-toolbar { background-color: #1e293b; border-top-left-radius: 0.75rem; border-top-right-radius: 0.75rem; border: 1px solid #334155 !important; }
            .ql-container { border-bottom-left-radius: 0.75rem; border-bottom-right-radius: 0.75rem; border: 1px solid #334155 !important; }
            .ql-snow .ql-stroke, .ql-snow .ql-fill { stroke: #d1d5db; fill: #d1d5db; }
            .ql-snow .ql-picker-label { color: #d1d5db; }
            .ql-snow .ql-picker.ql-expanded .ql-picker-label { border-color: transparent !important; }
            .ql-snow .ql-picker.ql-expanded .ql-picker-options { background-color: #334155; border-color: #475569 !important; }
            .ql-snow .ql-picker-options .ql-picker-item:hover { background-color: #475569; }
            .ql-snow .ql-editor h1, .ql-snow .ql-editor h2, .ql-snow .ql-editor h3 { border-bottom: 1px solid #334155; padding-bottom: 0.3em; margin-top: 1.5em; margin-bottom: 1em; }
            .ql-snow .ql-editor h1 { font-size: 2em; } .ql-snow .ql-editor h2 { font-size: 1.5em; } .ql-snow .ql-editor h3 { font-size: 1.25em; }
            .ql-snow .ql-editor a { color: #818cf8; text-decoration: none; }
            .ql-snow .ql-editor a:hover { text-decoration: underline; }
            .ql-snow .ql-editor blockquote { border-left: 4px solid #4f46e5; padding-left: 1rem; color: #9ca3af; font-style: italic; }
            .ql-snow .ql-editor pre.ql-syntax { background-color: #1e293b; color: #e2e8f0; padding: 1em; border-radius: 0.5rem; }
            .ql-editor img { max-width: 100%; height: auto; margin-top: 0.5rem; margin-bottom: 0.5rem; display: block; border-radius: 0.5rem; }
            .ql-editor .ql-align-center { text-align: center; } .ql-editor .ql-align-right { text-align: right; } .ql-editor .ql-align-left { text-align: left; }
            .ql-editor p.ql-align-center img { margin-left: auto; margin-right: auto; }
            .ql-snow .ql-tooltip.ql-editing a.ql-action::after { color: white; }
        `}</style>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                 {streamError && (
                    <Card className="border border-red-500 bg-red-900/30">
                        <h3 className="text-lg font-semibold text-red-300 mb-2">Streaming Error</h3>
                        <pre className="text-red-300 text-sm whitespace-pre-wrap break-words font-mono bg-slate-900 p-4 rounded-md">{streamError}</pre>
                    </Card>
                )}
                <Card>
                   <Input label="Internal Post Name" id="post-name" value={post.name} onChange={(e) => handleFieldChange('name', e.target.value)} disabled={isBusy} />
                </Card>
                
                <Card className="!p-0 !bg-slate-800 rounded-xl">
                    <div className="p-4 border-b border-slate-700">
                      <div className="flex items-end gap-2">
                        <div className="flex-grow">
                          <Input label="Blog Post Title" id="post-title" value={post.title} onChange={(e) => handleFieldChange('title', e.target.value)} className="!text-xl !py-3 font-bold" disabled={isBusy} />
                        </div>
                        <Button variant="secondary" onClick={handleSuggestTitles} disabled={isBusy || post.products.length === 0}>
                            {status === 'generating_title' ? 'Suggesting...' : 'Suggest Titles'}
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-end items-center p-2 border-b border-slate-700">
                        <div className="inline-flex rounded-md shadow-sm" role="group">
                           <button type="button" onClick={() => setEditorMode('wysiwyg')} className={`px-4 py-2 text-sm font-medium rounded-l-lg ${editorMode === 'wysiwyg' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-slate-600'} border`}>Visual</button>
                           <button type="button" onClick={() => setEditorMode('html')} className={`px-4 py-2 text-sm font-medium rounded-r-lg ${editorMode === 'html' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-slate-600'} border`}>HTML</button>
                        </div>
                    </div>

                    {editorMode === 'wysiwyg' ? (
                        <ReactQuill theme="snow" value={post.content} onChange={(value) => handleFieldChange('content', value)} modules={quillModules} readOnly={isBusy} />
                    ) : (
                        <Textarea value={post.content} onChange={(e) => handleFieldChange('content', e.target.value)} className="w-full h-[540px] font-mono bg-slate-900 text-slate-300 border-none rounded-b-xl focus:ring-0" readOnly={isBusy} />
                    )}
                </Card>
            </div>

            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
                    <div className="space-y-2">
                        <Button onClick={handleSave} disabled={isBusy} className="w-full">
                           {status === 'saving' ? 'Saving...' : (saveSuccess ? 'Saved!' : 'Save Changes')}
                        </Button>
                        <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} disabled={isBusy} className="w-full">
                           Delete Post
                        </Button>
                    </div>
                </Card>
                 <Card>
                    <h2 className="text-lg font-semibold text-white mb-4">Post Settings</h2>
                    <div className="space-y-4">
                        <Input label="Hero Image URL" id="hero-image-url" value={post.heroImageUrl} onChange={e => handleFieldChange('heroImageUrl', e.target.value)} disabled={isBusy} placeholder="https://.../image.jpg" />
                        <Input label="SEO Tags (comma-separated)" id="tags" value={post.tags.join(', ')} onChange={e => handleFieldChange('tags', e.target.value.split(',').map(t => t.trim().toLowerCase()))} disabled={isBusy} placeholder="e.g., tech, review, comparison" />
                    </div>
                </Card>
                <Card>
                    <h2 className="text-lg font-semibold text-white mb-4">Associated Products</h2>
                    <div className="space-y-3">
                        {post.products.map(p => ( <div key={p.id} className="flex items-center gap-3"><img src={p.imageUrl} alt={p.title} className="w-16 h-16 object-cover rounded-md flex-shrink-0 bg-slate-700 border border-slate-600"/><div><p className="text-sm font-medium text-white line-clamp-2">{p.title}</p><p className="text-xs text-slate-400">{p.price}</p></div></div> ))}
                    </div>
                </Card>
            </div>
        </div>
      </>
    );
};

export default EditPost;