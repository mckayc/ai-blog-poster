import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import { BlogPost, Product, Template } from '../types';
import * as db from '../services/dbService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
    ['link', 'blockquote'],
    ['clean']
  ],
};

const EditPost: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [post, setPost] = useState<BlogPost | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isNewPost, setIsNewPost] = useState(false);
    const [streamError, setStreamError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // This function parses the title from the <h1> tag and updates the post
    const finalizeStream = useCallback((finalContent: string) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = finalContent;
        const h1 = tempDiv.querySelector('h1');
        const finalTitle = h1 ? h1.textContent || 'Untitled Post' : 'Untitled Post';
        
        if (h1) {
          h1.remove(); // Remove the h1 from the content itself
        }
        const finalHtml = tempDiv.innerHTML;

        setTitle(finalTitle);
        setContent(finalHtml);

        if (post) {
            const updatedPost = { ...post, title: finalTitle, content: finalHtml };
            db.updatePost(updatedPost).catch(e => console.error("Failed to auto-save post after stream.", e));
        }
    }, [post]);

    const streamContent = useCallback(async (postToStream: BlogPost) => {
        setIsStreaming(true);
        setStreamError(null);
        setContent(''); // Clear placeholder content
        
        const instructions = searchParams.get('instructions') || '';
        const templateId = searchParams.get('templateId');
        let templatePrompt = null;
        if(templateId) {
            // In a real app, you might fetch this from a context or a dedicated service call
            const templates: Template[] = await db.getTemplates();
            templatePrompt = templates.find(t => t.id === templateId)?.prompt || null;
        }

        try {
            const response = await fetch('/api/gemini/generate-post-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    products: postToStream.products, 
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
                accumulatedContent += chunk;
                setContent(prev => prev + chunk);
            }
            finalizeStream(accumulatedContent);

        } catch (error: any) {
            console.error("Streaming failed:", error);
            setStreamError(error.message || "An unknown error occurred during streaming.");
        } finally {
            setIsStreaming(false);
            // Clean up URL
            navigate(`/edit/${postToStream.id}`, { replace: true });
        }
    }, [searchParams, navigate, finalizeStream]);
    
    useEffect(() => {
        if (!postId) {
            navigate('/manage');
            return;
        }
        setIsLoading(true);
        db.getPost(postId)
            .then(foundPost => {
                if (foundPost) {
                    setPost(foundPost);
                    setTitle(foundPost.title);
                    setContent(foundPost.content);
                    const isNew = searchParams.get('new') === 'true';
                    setIsNewPost(isNew);
                    if(isNew){
                       streamContent(foundPost);
                    }
                } else {
                    throw new Error(`Post with ID ${postId} not found.`);
                }
            })
            .catch(err => {
                console.error(err);
                navigate('/manage');
            })
            .finally(() => setIsLoading(false));
    }, [postId, navigate]); // Only run when postId changes

    const handleSave = async () => {
        if (!post) return;
        setIsSaving(true);
        const updatedPost = { ...post, title, content };
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
                    <Input 
                        label="Post Title" 
                        id="post-title" 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)}
                        className="!text-xl !py-3 font-bold"
                        disabled={isStreaming}
                    />
                </Card>
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