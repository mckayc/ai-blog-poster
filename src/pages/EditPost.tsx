
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ReactQuill, { Quill } from 'react-quill';
import ImageResize from 'quill-image-resize-module-react';
import quillBetterTable from 'quill-better-table';
import { BlogPost, Template } from '../types';
import * as db from '../services/dbService';
import * as gemini from '../services/geminiService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import LoadingOverlay from '../components/common/LoadingOverlay';

// Register Quill modules for image resizing and tables.
Quill.register({
    'modules/imageResize': ImageResize,
    'modules/better-table': quillBetterTable
}, true);

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
    ['link', 'image', 'blockquote', 'code-block'],
    ['table'], // Add table button from quill-better-table
    [{ 'align': [] }],
    ['clean']
  ],
  imageResize: {
    parchment: Quill.import('parchment'),
    modules: ['Resize', 'DisplaySize', 'Toolbar'],
    toolbarStyles: {
      backgroundColor: 'rgba(30, 41, 59, 0.8)',
      border: '1px solid #475569',
      color: '#cbd5e1',
    },
  },
  table: false, // disable default table module
  'better-table': {
    operationMenu: {
      items: {
        unmergeCells: { text: 'Unmerge cells' }
      },
       color: {
        colors: ['#444444', '#555555', '#666666', '#777777', '#888888', '#999999', '#bbbbbb', '#dddddd'],
        text: 'Background Colors'
      }
    }
  },
};

type EditorMode = 'wysiwyg' | 'html';

const EditPost: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [post, setPost] = useState<BlogPost | null>(null);
    const [regenerationPrompt, setRegenerationPrompt] = useState('');
    const [editorMode, setEditorMode] = useState<EditorMode>('wysiwyg');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
    const [streamError, setStreamError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const isInitialGeneration = searchParams.get('new') === 'true';

    useEffect(() => {
        if (!postId) {
            console.error("[EditPost] No postId found in URL, navigating away.");
            navigate('/manage');
            return;
        }

        const performInitialStream = async (newPost: BlogPost) => {
            setIsStreaming(true);
            setStreamError(null);
            setPost(prev => prev ? { ...prev, content: '' } : null);

            try {
                const instructions = searchParams.get('instructions') || '';
                const templateId = searchParams.get('templateId');
                let templatePrompt: string | null = null;
                if(templateId) {
                    const templates: Template[] = await db.getTemplates();
                    templatePrompt = templates.find(t => t.id === templateId)?.prompt || null;
                }

                const response = await fetch('/api/gemini/generate-post-stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        products: newPost.products, 
                        instructions,
                        templatePrompt
                    })
                });

                if (!response.body) throw new Error("Response body is missing.");
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulatedJson = '';

                while (true) {
                    const { done, value } = await reader.read();
                    const chunk = decoder.decode(value, { stream: true });
                     if (chunk.startsWith('STREAM_ERROR:')) {
                        throw new Error(chunk.replace('STREAM_ERROR:', '').trim());
                    }
                    accumulatedJson += chunk;
                    if (done) break;
                }
                
                const finalData = JSON.parse(accumulatedJson);
                
                const updatedPost: BlogPost = { 
                    ...newPost, 
                    title: finalData.title || 'Generation Failed: Untitled',
                    heroImageUrl: finalData.heroImageUrl || '',
                    content: finalData.content || '<p>Error: AI failed to generate content.</p>',
                    tags: Array.isArray(finalData.tags) ? finalData.tags : [],
                };
                
                await db.updatePost(updatedPost);
                setPost(updatedPost);
                
            } catch (error: any) {
                console.error("[EditPost] Initial stream failed:", error);
                setStreamError(error.message || "An unknown error occurred during streaming.");
                setPost(newPost); // Restore original post data on error
            } finally {
                setIsStreaming(false);
                setSearchParams({}, { replace: true });
            }
        };

        const loadPost = async () => {
            setIsLoading(true);
            try {
                const foundPost = await db.getPost(postId);
                if (!foundPost) throw new Error(`Post with ID ${postId} not found.`);
                
                const sanitizedPost = {
                    ...foundPost,
                    tags: Array.isArray(foundPost.tags) ? foundPost.tags : [],
                    products: Array.isArray(foundPost.products) ? foundPost.products : [],
                };
                
                setPost(sanitizedPost);
                
                if (isInitialGeneration) {
                    await performInitialStream(sanitizedPost);
                }
            } catch (err) {
                console.error('[EditPost] Error loading post:', err);
                alert(`Failed to load post: ${err instanceof Error ? err.message : 'Unknown error'}`);
                navigate('/manage');
            } finally {
                setIsLoading(false);
            }
        };

        loadPost();
    }, [postId, navigate, searchParams, setSearchParams, isInitialGeneration]);

    const handleFieldChange = <K extends keyof BlogPost>(field: K, value: BlogPost[K]) => {
        setPost(p => p ? { ...p, [field]: value } : null);
    };

    const handleSave = async () => {
        if (!post) return;
        setIsSaving(true);
        try {
            await db.updatePost(post);
        } catch (error) {
            alert('Failed to save post.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleGenerateTitle = async () => {
        if (!post || post.products.length === 0) return;
        setIsGeneratingTitle(true);
        try {
            const titles = await gemini.generateTitleIdea(post.products);
            if (titles && titles.length > 0) {
                handleFieldChange('title', titles[0]);
            }
        } catch (error: any) {
            setStreamError(error.message || 'Failed to generate title.');
        } finally {
            setIsGeneratingTitle(false);
        }
    };

    const handleDelete = async () => {
        if (!post) return;
        try {
            await db.deletePost(post.id);
            navigate('/manage');
        } catch (error) {
            alert('Failed to delete post.');
        }
    };
    
    const handleDuplicate = async () => {
        if (!post) return;
        const postToDuplicate = { ...post, id: '', name: `${post.name} (Copy)` };
        try {
            const response = await db.savePost(postToDuplicate);
            if (response.id) {
                navigate(`/edit/${response.id}`);
            }
        } catch (error) {
            alert('Failed to duplicate post.');
            console.error(error);
        }
    };

    const handleRegenerate = async () => {
        if (!regenerationPrompt.trim() || !post) return;
        setIsStreaming(true);
        setStreamError(null);
        
        const originalContent = post.content;
        const originalTitle = post.title;
        handleFieldChange('content', '<p>AI is rewriting the content based on your instructions...</p>'); 

        try {
            const response = await fetch('/api/gemini/regenerate-post-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    existingPost: { ...post, content: originalContent, title: originalTitle },
                    newInstructions: regenerationPrompt,
                })
            });

            if (!response.body) throw new Error("Response body is missing.");
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedJson = '';

            while (true) {
                const { done, value } = await reader.read();
                const chunk = decoder.decode(value, { stream: true });
                if (chunk.startsWith('STREAM_ERROR:')) {
                    throw new Error(chunk.replace('STREAM_ERROR:', '').trim());
                }
                accumulatedJson += chunk;
                // Live update for better UX
                try {
                    const parsed = JSON.parse(accumulatedJson);
                    if(parsed.title) handleFieldChange('title', parsed.title);
                    if(parsed.content) handleFieldChange('content', parsed.content);
                } catch(e) { /* Incomplete JSON, continue */ }
                if (done) break;
            }

            const finalData = JSON.parse(accumulatedJson);
            const updatedPost = { ...post, title: finalData.title, content: finalData.content };
            await db.updatePost(updatedPost);
            setPost(updatedPost);

        } catch (error: any) {
            setStreamError(error.message || "An unknown regeneration error occurred.");
            setPost(p => p ? { ...p, content: originalContent, title: originalTitle } : null);
        } finally {
            setIsStreaming(false);
            setRegenerationPrompt('');
        }
    };
    
    if (isLoading) return <LoadingOverlay message="Loading Post Data..." />;
    if (isStreaming && isInitialGeneration) return <LoadingOverlay message="Generating Your Masterpiece..." details="The AI is working its magic. The editor will become available once the initial draft is complete." />
    if (!post) return <div className="text-center text-red-400 p-8">Post not found. It may have been deleted.</div>;
    
    return (
     <>
        <style>{`
            .ql-editor { min-height: 500px; font-size: 1rem; line-height: 1.6; background-color: #0f172a; color: #cbd5e1; }
            .ql-toolbar { background-color: #1e293b; border-top-left-radius: 0.75rem; border-top-right-radius: 0.75rem; border: 1px solid #334155 !important; }
            .ql-container { border-bottom-left-radius: 0.75rem; border-bottom-right-radius: 0.75rem; border: 1px solid #334155 !important; }
            .ql-snow .ql-stroke, .ql-snow .ql-fill { stroke: #d1d5db; fill: #d1d5db; }
            .ql-snow .ql-picker-label { color: #d1d5db; }
            .ql-snow .ql-picker.ql-expanded .ql-picker-label { border-color: transparent !important; }
            .ql-snow .ql-picker.ql-expanded .ql-picker-options { background-color: #334155; border-color: #475569 !important; }
            .ql-snow .ql-picker-options .ql-picker-item:hover { background-color: #475569; }
            .ql-snow .ql-editor h1, .ql-snow .ql-editor h2 { border-bottom: 1px solid #334155; padding-bottom: 0.3em; margin-top: 1.5em; margin-bottom: 1em; }
            .ql-snow .ql-editor h1 { font-size: 2em; } .ql-snow .ql-editor h2 { font-size: 1.5em; }
            .ql-snow .ql-editor a { color: #818cf8; text-decoration: none; }
            .ql-snow .ql-editor a:hover { text-decoration: underline; }
            .ql-snow .ql-editor blockquote { border-left: 4px solid #4f46e5; padding-left: 1rem; color: #9ca3af; font-style: italic; }
            .ql-snow .ql-editor pre.ql-syntax { background-color: #1e293b; color: #e2e8f0; padding: 1em; border-radius: 0.5rem; }
            .ql-editor img { max-width: 100%; height: auto; margin-top: 0.5rem; margin-bottom: 0.5rem; display: block; border-radius: 0.5rem; }
            .ql-editor .ql-align-center { text-align: center; } .ql-editor .ql-align-right { text-align: right; } .ql-editor .ql-align-left { text-align: left; }
            .ql-editor p.ql-align-center img { margin-left: auto; margin-right: auto; }
            .ql-snow .ql-tooltip.ql-editing a.ql-action::after { color: white; }
            .ql-snow .ql-tooltip[data-mode="table"] { background-color: #1e293b; border: 1px solid #334155; color: white; }
            .ql-snow .ql-tooltip[data-mode="table"] .ql-tooltip-arrow { background-color: #1e293b; border-top-color: #334155; border-left-color: #334155; }
            .ql-snow .ql-tooltip[data-mode="table"] input[type=text] { background-color: #334155; color: white; border: 1px solid #475569; }
            .ql-snow .ql-tooltip[data-mode=table] .ql-preview { color: white; }
            #ql-better-table-op-menu { background-color: #1e293b; border: 1px solid #334155; color: #cbd5e1; }
            #ql-better-table-op-menu .menu-item:hover { background-color: #334155; }
            #ql-better-table-op-menu .ql-table-menu-item-panel { background-color: #334155; }
        `}</style>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                 {streamError && (
                    <Card className="border border-red-500 bg-red-900/30">
                        <h3 className="text-lg font-semibold text-red-300 mb-2">Error</h3>
                        <pre className="text-red-300 text-sm whitespace-pre-wrap break-words font-mono bg-slate-900 p-4 rounded-md">{streamError}</pre>
                    </Card>
                )}
                <Card>
                    <div className="space-y-4">
                        <Input label="Internal Post Name (for your reference)" id="post-name" value={post.name} onChange={(e) => handleFieldChange('name', e.target.value)} disabled={isStreaming} />
                        <div>
                             <label htmlFor="post-title" className="block text-sm font-medium text-slate-300 mb-1">Blog Post Title</label>
                            <div className="flex items-center gap-2">
                                <input id="post-title" value={post.title} onChange={(e) => handleFieldChange('title', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition !text-xl !py-3 font-bold flex-grow" disabled={isStreaming || isGeneratingTitle} />
                                <Button onClick={handleGenerateTitle} disabled={isStreaming || isGeneratingTitle} variant="secondary" aria-label="Generate new title idea">
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isGeneratingTitle ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
                
                <Card className="!p-0 !bg-slate-800 rounded-xl">
                    <div className="flex justify-between items-center p-2 border-b border-slate-700">
                         {isStreaming && !isInitialGeneration && ( <div className="p-2 text-yellow-300 flex items-center"><svg className="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>AI is writing...</div> )}
                        <div className="ml-auto inline-flex rounded-md shadow-sm" role="group">
                           <button type="button" onClick={() => setEditorMode('wysiwyg')} className={`px-4 py-2 text-sm font-medium rounded-l-lg ${editorMode === 'wysiwyg' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-slate-600'} border`}>Visual Editor</button>
                           <button type="button" onClick={() => setEditorMode('html')} className={`px-4 py-2 text-sm font-medium rounded-r-lg ${editorMode === 'html' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-slate-600'} border`}>HTML Code</button>
                        </div>
                    </div>

                    {editorMode === 'wysiwyg' ? (
                        <ReactQuill theme="snow" value={post.content} onChange={(value) => handleFieldChange('content', value)} modules={quillModules} readOnly={isStreaming} />
                    ) : (
                        <Textarea value={post.content} onChange={(e) => handleFieldChange('content', e.target.value)} className="w-full h-[540px] font-mono bg-slate-900 text-slate-300 border-none rounded-b-xl focus:ring-0" readOnly={isStreaming} />
                    )}
                </Card>
            </div>

            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
                    <div className="space-y-2">
                        <Button onClick={handleSave} disabled={isSaving || isStreaming} className="w-full">{isSaving ? 'Saving...' : 'Save Changes'}</Button>
                        <Button onClick={handleDuplicate} disabled={isSaving || isStreaming} className="w-full" variant="secondary">Duplicate Post</Button>
                        <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} className="w-full" disabled={isStreaming}>Delete Post</Button>
                    </div>
                </Card>
                <Card>
                    <h2 className="text-lg font-semibold text-white mb-4">Post Settings</h2>
                    <div className="space-y-4">
                        <Input label="Hero Image URL" id="hero-image-url" value={post.heroImageUrl} onChange={e => handleFieldChange('heroImageUrl', e.target.value)} disabled={isStreaming} placeholder="https://.../image.jpg" />
                        <Input label="SEO Tags (comma-separated)" id="tags" value={(post.tags || []).join(', ')} onChange={e => handleFieldChange('tags', e.target.value.split(',').map(t => t.trim()))} disabled={isStreaming} placeholder="e.g., tech, review, comparison" />
                    </div>
                </Card>
                <Card>
                    <h2 className="text-lg font-semibold text-white mb-4">Regenerate Content</h2>
                    <div className="space-y-2">
                        <Textarea label="Instructions for AI" id="regeneration-prompt" value={regenerationPrompt} onChange={e => setRegenerationPrompt(e.target.value)} rows={5} placeholder="e.g., 'Make the tone more humorous', or 'Add a section about cleaning and maintenance.'" disabled={isStreaming} />
                        <Button onClick={handleRegenerate} disabled={isStreaming || !regenerationPrompt.trim()} className="w-full">{isStreaming ? 'Processing...' : 'Regenerate'}</Button>
                    </div>
                </Card>
                <Card>
                    <h2 className="text-lg font-semibold text-white mb-4">Associated Products</h2>
                    <div className="space-y-3">
                        {post.products.map(p => ( <div key={p.id} className="flex items-center gap-3"><img src={p.imageUrl} alt={p.title} className="w-16 h-16 object-cover rounded-md flex-shrink-0 bg-slate-700 border border-slate-600"/><div><p className="text-sm font-medium text-white line-clamp-2">{p.title}</p><p className="text-xs text-slate-400">{p.price}</p></div></div> ))}
                    </div>
                </Card>
            </div>
            
            {showDeleteConfirm && ( <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"><Card><h2 className="text-xl font-bold text-white mb-4">Confirm Deletion</h2><p className="text-slate-300">Are you sure you want to delete this post?</p><div className="mt-6 flex justify-end space-x-3"><Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button><Button variant="danger" onClick={handleDelete}>Delete</Button></div></Card></div> )}
        </div>
      </>
    );
};

export default EditPost;