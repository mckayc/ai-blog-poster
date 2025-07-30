import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import { BlogPost, Template } from '../types';
import * as db from '../services/dbService';
import * as gemini from '../services/geminiService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
    ['link', 'image', 'blockquote'],
    ['clean']
  ],
};

const EditPost: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [post, setPost] = useState<BlogPost | null>(null);
    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [regenerationPrompt, setRegenerationPrompt] = useState('');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
    const [streamError, setStreamError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    useEffect(() => {
        if (!postId) {
            navigate('/manage');
            return;
        }

        const performInitialStream = async (newPost: BlogPost) => {
            setIsStreaming(true);
            setStreamError(null);
            setContent(''); // Clear placeholder content

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
                let accumulatedContent = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    if (chunk.startsWith('STREAM_ERROR:')) {
                        throw new Error(chunk.replace('STREAM_ERROR:', '').trim());
                    }
                    accumulatedContent += chunk;
                    setContent(prev => prev + chunk);
                }

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = accumulatedContent;
                const h1 = tempDiv.querySelector('h1');
                const finalTitle = h1 ? h1.textContent || 'Untitled Post' : 'Untitled Post';
                if (h1) h1.remove();
                const finalHtml = tempDiv.innerHTML;

                setTitle(finalTitle);
                setContent(finalHtml);

                const updatedPost = { ...newPost, name: newPost.name, title: finalTitle, content: finalHtml };
                await db.updatePost(updatedPost);
                setPost(updatedPost);
                
            } catch (error: any) {
                console.error("Streaming failed:", error);
                setStreamError(error.message || "An unknown error occurred during streaming.");
            } finally {
                setIsStreaming(false);
                setSearchParams({}, { replace: true });
            }
        };

        const loadPost = async () => {
            setIsLoading(true);
            try {
                const foundPost = await db.getPost(postId);
                setPost(foundPost);
                setName(foundPost.name);
                setTitle(foundPost.title);
                setContent(foundPost.content);
                
                const isNew = searchParams.get('new') === 'true';
                if (isNew) {
                    await performInitialStream(foundPost);
                }

            } catch (err) {
                console.error(err);
                alert(`Failed to load post: ${err instanceof Error ? err.message : 'Unknown error'}`);
                navigate('/manage');
            } finally {
                setIsLoading(false);
            }
        };

        loadPost();
    }, [postId, navigate, searchParams, setSearchParams]);

    const handleSave = async () => {
        if (!post) return;
        setIsSaving(true);
        const updatedPost = { ...post, name, title, content };
        try {
            await db.updatePost(updatedPost);
            setPost(updatedPost);
        } catch (error) {
            console.error(error);
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
                setTitle(titles[0]);
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
            console.error(error);
            alert('Failed to delete post.');
        }
    };

    const handleRegenerate = async () => {
        if (!regenerationPrompt.trim() || !post) return;
        setIsStreaming(true);
        setStreamError(null);
        
        const existingHtml = `<h1>${title}</h1>\n${content}`;
        const originalContent = content; // Keep a copy to restore on error
        setContent(''); // Clear for streaming

        try {
            const response = await fetch('/api/gemini/regenerate-post-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    existingContent: existingHtml,
                    newInstructions: regenerationPrompt,
                })
            });

            if (!response.body) throw new Error("Response body is missing.");
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                if (chunk.startsWith('STREAM_ERROR:')) {
                    throw new Error(chunk.replace('STREAM_ERROR:', '').trim());
                }
                accumulatedContent += chunk;
                setContent(prev => prev + chunk);
            }

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = accumulatedContent;
            const h1 = tempDiv.querySelector('h1');
            const finalTitle = h1 ? h1.textContent || title : title;
            if (h1) h1.remove();
            const finalHtml = tempDiv.innerHTML;

            setTitle(finalTitle);
            setContent(finalHtml);

            const updatedPost = { ...post, name, title: finalTitle, content: finalHtml };
            await db.updatePost(updatedPost);
            setPost(updatedPost);

        } catch (error: any) {
            setStreamError(error.message || "An unknown regeneration error occurred.");
            setContent(originalContent);
        } finally {
            setIsStreaming(false);
            setRegenerationPrompt('');
        }
    };
    
    if (isLoading) {
        return <div className="text-center text-slate-400 p-8">Loading post...</div>;
    }

    if (!post) {
        return <div className="text-center text-red-400 p-8">Post not found. Redirecting...</div>;
    }
    
    return (
     <>
        <style>{`
          .ql-editor {
            min-height: 500px;
            font-size: 16px;
            line-height: 1.6;
            background-color: #0f172a; /* slate-900 */
            color: #cbd5e1; /* slate-300 */
          }
          .ql-toolbar {
            background-color: #1e293b; /* slate-800 */
            border-top-left-radius: 0.75rem;
            border-top-right-radius: 0.75rem;
            border: 1px solid #334155 !important; /* slate-700 */
          }
          .ql-container {
            border-bottom-left-radius: 0.75rem;
            border-bottom-right-radius: 0.75rem;
            border: 1px solid #334155 !important; /* slate-700 */
          }
          .ql-snow .ql-stroke { stroke: #d1d5db; }
          .ql-snow .ql-picker-label { color: #d1d5db; }
          .ql-snow .ql-picker.ql-expanded .ql-picker-label { border-color: transparent !important; }
          .ql-snow .ql-picker.ql-expanded .ql-picker-options { background-color: #334155; border-color: #475569 !important; }
          .ql-snow .ql-picker-options .ql-picker-item:hover { background-color: #475569; }
          .ql-snow .ql-editor h1 { font-size: 2.25em; }
          .ql-snow .ql-editor h2 { font-size: 1.8em; }
          .ql-snow .ql-editor h3 { font-size: 1.5em; }
          .ql-snow .ql-editor a { color: #818cf8; }
          .ql-snow .ql-editor blockquote { border-left: 4px solid #4f46e5; padding-left: 1rem; color: #9ca3af; }
        `}</style>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <div className="space-y-4">
                        <Input 
                            label="Internal Post Name (for your reference)" 
                            id="post-name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            disabled={isStreaming}
                        />
                        <div>
                             <label htmlFor="post-title" className="block text-sm font-medium text-slate-300 mb-1">
                                Blog Post Title
                              </label>
                            <div className="flex items-center gap-2">
                                <input
                                    id="post-title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition !text-xl !py-3 font-bold flex-grow"
                                    disabled={isStreaming || isGeneratingTitle}
                                />
                                <Button onClick={handleGenerateTitle} disabled={isStreaming || isGeneratingTitle} variant="secondary">
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isGeneratingTitle ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                    </svg>
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
                 {streamError && (
                    <Card className="border border-red-500 bg-red-900/30">
                        <h3 className="text-lg font-semibold text-red-300 mb-2">Error</h3>
                        <p className="text-red-300 text-sm font-mono">{streamError}</p>
                    </Card>
                )}
                <Card className="!p-0">
                    {isStreaming && (
                         <div className="p-4 border-b border-slate-700 text-yellow-300 flex items-center">
                            <svg className="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            AI is writing... The post will be saved automatically when finished.
                        </div>
                    )}
                    <ReactQuill 
                        theme="snow" 
                        value={content} 
                        onChange={setContent} 
                        modules={quillModules}
                        readOnly={isStreaming}
                    />
                </Card>
            </div>

            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
                    <div className="space-y-2">
                        <Button onClick={handleSave} disabled={isSaving || isStreaming} className="w-full">
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button variant="secondary" onClick={() => navigate('/manage')} className="w-full">
                            Close
                        </Button>
                        <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} className="w-full" disabled={isStreaming}>
                            Delete Post
                        </Button>
                    </div>
                </Card>
                <Card>
                    <h2 className="text-lg font-semibold text-white mb-4">Regenerate Post</h2>
                    <div className="space-y-2">
                        <Textarea
                            label="Instructions for AI"
                            id="regeneration-prompt"
                            value={regenerationPrompt}
                            onChange={e => setRegenerationPrompt(e.target.value)}
                            rows={5}
                            placeholder="e.g., 'Make the tone more humorous', or 'Add a section about cleaning and maintenance.'"
                            disabled={isStreaming}
                        />
                        <Button onClick={handleRegenerate} disabled={isStreaming || !regenerationPrompt.trim()} className="w-full">
                            {isStreaming ? 'Processing...' : 'Regenerate'}
                        </Button>
                    </div>
                </Card>
                <Card>
                    <h2 className="text-lg font-semibold text-white mb-4">Associated Products</h2>
                    <div className="space-y-3">
                        {post.products.map(p => (
                            <div key={p.id} className="flex items-center gap-3">
                            <img src={p.imageUrl} alt={p.title} className="w-16 h-16 object-cover rounded-md flex-shrink-0 bg-slate-700 border border-slate-600"/>
                            <div>
                                <p className="text-sm font-medium text-white line-clamp-2">{p.title}</p>
                                <p className="text-xs text-slate-400">{p.price}</p>
                            </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
            
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <Card>
                        <h2 className="text-xl font-bold text-white mb-4">Confirm Deletion</h2>
                        <p className="text-slate-300">Are you sure you want to delete this post?</p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete}>Delete</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
      </>
    );
};

export default EditPost;