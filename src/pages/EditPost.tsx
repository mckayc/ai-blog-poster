
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import { BlogPost, Product } from '../types';
import * as db from '../services/dbService';
import * as gemini from '../services/geminiService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import LoadingOverlay from '../components/common/LoadingOverlay';

// Required imports for self-hosted TinyMCE
import 'tinymce/tinymce';
import 'tinymce/models/dom/model'; // Required for editor to initialize
import 'tinymce/themes/silver/theme';
import 'tinymce/icons/default/icons';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/image';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/code';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/media';
import 'tinymce/plugins/table';
import 'tinymce/plugins/help';
import 'tinymce/plugins/wordcount';
import 'tinymce/plugins/autoresize';


const EditPost: React.FC = () => {
    const { postId } = useParams<{ postId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const isEditing = !!postId;
    const editorRef = useRef<any>(null);
    const hasGenerated = useRef(false);

    const [post, setPost] = useState<Partial<BlogPost>>({ title: '', content: '', tags: [], asins: '' });
    const [status, setStatus] = useState<'loading' | 'saving' | 'deleting' | 'generating' | 'generating_tags' | 'idle'>('loading');
    const [generationDetails, setGenerationDetails] = useState('');
    const [generationError, setGenerationError] = useState('');

    const generateAndSavePost = useCallback(async (postIdToUpdate: string, productsToUse: Product[], options: Omit<gemini.GenerationOptions, 'products'>): Promise<boolean> => {
        setStatus('generating');
        setGenerationDetails('Generating post with AI... This may take a moment.');
        setGenerationError('');
        
        try {
            const finalData = await gemini.generateFullPost({ ...options, products: productsToUse });
            
            setGenerationDetails('AI finished. Saving post...');
            
            const postToSave = {
                ...post,
                ...finalData,
                id: postIdToUpdate,
            } as BlogPost;

            await db.updatePost(postToSave);
            setPost(postToSave);
            setStatus('idle');
            setGenerationDetails('');
            return true;
        } catch (err: any) {
            console.error("Post generation failed:", err);
            const errorMessage = `AI generation failed. This could be due to a network issue, an invalid API key, or a problem with the AI model's response. Please check the container logs for detailed errors.\n\nError: ${err.message || "An unknown error occurred during generation."}`;
            setGenerationError(errorMessage);
            // We leave status as 'generating' so the overlay with the error remains visible.
            return false;
        }
    }, [post]);

    useEffect(() => {
        const fetchPost = async () => {
            if (postId) {
                try {
                    const fetchedPost = await db.getPost(postId);
                    setPost(fetchedPost);

                    const params = new URLSearchParams(location.search);
                    if (params.get('new') === 'true' && fetchedPost.products?.length && !hasGenerated.current) {
                        hasGenerated.current = true;
                        
                        const generationOptions = {
                            instructions: params.get('instructions') || '',
                            templateId: params.get('templateId') || 'default',
                            introductionStyle: params.get('introductionStyle') || 'Full',
                            introductionTone: params.get('introductionTone') || 'Friendly',
                            descriptionStyle: params.get('descriptionStyle') || 'Detailed Paragraphs',
                            descriptionTone: params.get('descriptionTone') || 'Professional',
                            comparisonCards: JSON.parse(params.get('comparisonCards') || 'null') || { enabled: false },
                            photoComparison: JSON.parse(params.get('photoComparison') || 'null') || { enabled: false },
                        };
                        
                        const success = await generateAndSavePost(fetchedPost.id, fetchedPost.products, generationOptions);
                        if (success) {
                            // On success, remove the query params from URL to prevent re-generation on refresh
                            navigate(`/edit/${postId}`, { replace: true });
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch post", error);
                    alert("Failed to fetch post.");
                    navigate('/posts');
                } finally {
                    if (status === 'loading') {
                      setStatus('idle');
                    }
                }
            } else {
                setPost({ title: 'New Post', content: '<p>Start writing...</p>', tags: [] });
                setStatus('idle');
            }
        };

        fetchPost();
    }, [postId, navigate, location.search, generateAndSavePost, status]);

    const handleSave = async () => {
        if (!post) return;
        setStatus('saving');
        try {
            const content = editorRef.current ? editorRef.current.getContent() : post.content;
            const updatedPost = { ...post, content };
            const response = await db.savePost(updatedPost);
            if (!isEditing && response.id) {
                navigate(`/edit/${response.id}`);
            }
        } catch (error) {
            alert('Failed to save post.');
            console.error(error);
        } finally {
            setStatus('idle');
        }
    };

    const handleDelete = async () => {
        if (!post.id) return;
        if (window.confirm('Are you sure you want to delete this post?')) {
            setStatus('deleting');
            try {
                await db.deletePost(post.id);
                navigate('/posts');
            } catch (error) {
                alert('Failed to delete post.');
                console.error(error);
                setStatus('idle');
            }
        }
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPost(prev => ({ ...prev, title: e.target.value }));
    };

    const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const tags = e.target.value.split(',').map(t => t.trim());
        setPost(prev => ({...prev, tags}));
    };

    const handleGenerateTags = async () => {
        if(!post.title || !editorRef.current) return;
        setStatus('generating_tags');
        try {
            const content = editorRef.current.getContent({format: 'text'});
            const tags = await gemini.generateTags(post.title, content);
            setPost(p => ({...p, tags}));
        } catch (error) {
            console.error("Failed to generate tags:", error);
            alert("Could not generate tags. Check the console for details.");
        } finally {
            setStatus('idle');
        }
    }
    
    if (status === 'loading' && isEditing) {
        return <LoadingOverlay message="Loading Post..." />;
    }
    if (status === 'generating') {
        return <LoadingOverlay message="Generating Post with AI..." details={generationError || generationDetails} />;
    }

    return (
        <div className="flex flex-col h-full">
            { (status === 'saving' || status === 'deleting') && <LoadingOverlay message={status === 'saving' ? "Saving..." : "Deleting..."} />}

            <div className="flex-shrink-0 mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">
                    {isEditing ? 'Edit Post' : 'New Post'}
                </h1>
                <div className="flex items-center gap-2">
                    {isEditing && <Button variant="danger" onClick={handleDelete} disabled={status !== 'idle'}>Delete</Button>}
                    <Button onClick={handleSave} disabled={status !== 'idle'}>
                        {status === 'saving' ? 'Saving...' : 'Save Post'}
                    </Button>
                </div>
            </div>

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col">
                    <Card className="flex-grow flex flex-col min-h-[600px]">
                        <Input
                            label="Post Title"
                            value={post.title || ''}
                            onChange={handleTitleChange}
                            className="text-lg font-semibold mb-4"
                            placeholder="Your Awesome Blog Post Title"
                        />
                         <Editor
                            apiKey='no-api-key'
                            onInit={(evt, editor) => editorRef.current = editor}
                            key={post.id || 'new'}
                            initialValue={post.content}
                            init={{
                                skin_url: '/tinymce/skins/ui/oxide',
                                content_css: '/tinymce/skins/content/default/content.min.css',
                                height: '100%',
                                menubar: false,
                                plugins: 'autoresize advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount',
                                toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist outdent indent | link image | code | fullscreen',
                                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; }',
                                autoresize_bottom_margin: 20,
                                image_advtab: true,
                                image_title: true,
                                automatic_uploads: true,
                                file_picker_types: 'image',
                                file_picker_callback: () => {},
                            }}
                        />
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <h2 className="text-xl font-semibold text-white mb-4">Post Details</h2>
                        <div className="space-y-4">
                           <div>
                                <label htmlFor="tags-input" className="block text-sm font-medium text-slate-300 mb-1">Tags (comma-separated)</label>
                                <Input
                                    id="tags-input"
                                    value={post.tags?.join(', ') || ''}
                                    onChange={handleTagsChange}
                                    placeholder="e.g., tech, review, comparison"
                                />
                                <Button onClick={handleGenerateTags} variant="secondary" className="w-full mt-2" disabled={status === 'generating_tags' || !post.title}>
                                    {status === 'generating_tags' ? 'Generating...' : 'Generate Tags with AI'}
                                </Button>
                           </div>
                           <Input
                                label="ASINs (comma-separated)"
                                value={post.asins || ''}
                                onChange={(e) => setPost(p => ({ ...p, asins: e.target.value }))}
                                placeholder="B08HMW_EXAMPLE,B08J5_EXAMPLE"
                            />
                        </div>
                    </Card>
                    <Card>
                        <h2 className="text-xl font-semibold text-white mb-4">Associated Products</h2>
                        {post.products && post.products.length > 0 ? (
                           <ul className="space-y-3">
                            {post.products.map(p => (
                                <li key={p.id} className="flex items-center gap-3">
                                    <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded bg-slate-700"/>
                                    <div>
                                        <p className="text-sm font-medium text-white">{p.name}</p>
                                        <p className="text-xs text-slate-400">{p.brand}</p>
                                    </div>
                                </li>
                            ))}
                           </ul>
                        ) : (
                            <p className="text-slate-400">No products are associated with this post.</p>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default EditPost;
