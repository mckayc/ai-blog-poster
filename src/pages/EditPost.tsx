
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

    const [post, setPost] = useState<Partial<BlogPost>>({ title: '', content: '', tags: [] });
    const [status, setStatus] = useState<'loading' | 'saving' | 'deleting' | 'generating' | 'generating_tags' | 'idle'>('loading');
    const [generationDetails, setGenerationDetails] = useState('');
    const [generationError, setGenerationError] = useState('');

     const generateStream = useCallback(async (options: Omit<gemini.GenerationOptions, 'products'>) => {
        if (!post.id || !post.products) return;
        
        let accumulatedContent = '';
        let finalData: Partial<BlogPost> = {};

        try {
            const response = await gemini.generatePostStream({ ...options, products: post.products });
            
            if (!response.body) throw new Error("Response body is missing");

            const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                accumulatedContent += value;

                try {
                    const lastBraceIndex = accumulatedContent.lastIndexOf('}');
                    if (lastBraceIndex > -1) {
                         const potentialJson = accumulatedContent.substring(0, lastBraceIndex + 1);
                         const parsed = JSON.parse(potentialJson);
                         
                         setPost(p => ({
                             ...p,
                             title: parsed.title || p.title,
                             content: parsed.content || p.content,
                             heroImageUrl: parsed.heroImageUrl || p.heroImageUrl,
                             tags: parsed.tags || p.tags
                         }));
                         finalData = parsed;
                    }
                } catch (e) {
                    // This is expected as the JSON streams in chunks.
                }
                 setGenerationDetails(`Received ${accumulatedContent.length} bytes...`);
            }

            setStatus('saving');
            setGenerationDetails('Finalizing and saving post...');
            const finalPost = { ...post, ...finalData, id: post.id };
            await db.updatePost(finalPost);
            setPost(finalPost);
            
        } catch (err: any) {
            console.error("Streaming generation failed:", err);
            setGenerationError(err.message || "An unknown error occurred during generation.");
        } finally {
            setStatus('idle');
            setGenerationDetails('');
        }
    }, [post.id, post.products]);


    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const isNewPost = urlParams.get('new') === 'true';

        if (isEditing) {
            db.getPost(postId!)
                .then(fetchedPost => {
                    if (!fetchedPost) throw new Error(`Post with ID ${postId} not found.`);
                    
                    const initialPostState = {
                        ...fetchedPost,
                        tags: fetchedPost.tags || [],
                    };
                    setPost(initialPostState);

                    if (isNewPost) {
                        setStatus('generating');
                        setGenerationDetails('Initializing AI stream...');
                        
                        const generationOptions = {
                            instructions: urlParams.get('instructions') || '',
                            templateId: urlParams.get('templateId') || 'default',
                            introductionStyle: urlParams.get('introductionStyle') || 'Full',
                            introductionTone: urlParams.get('introductionTone') || 'Friendly',
                            descriptionStyle: urlParams.get('descriptionStyle') || 'Detailed Paragraphs',
                            descriptionTone: urlParams.get('descriptionTone') || 'Professional',
                            comparisonCards: JSON.parse(urlParams.get('comparisonCards') || '{"enabled":true,"placement":{"middle":true}}'),
                            photoComparison: JSON.parse(urlParams.get('photoComparison') || '{"enabled":false,"placement":{"beginning":true}}'),
                        };

                        generateStream(generationOptions);
                    } else {
                        setStatus('idle');
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch post:", err);
                    alert("Could not load the post. It may have been deleted. Redirecting to posts list.");
                    navigate('/posts');
                });
        } else {
            setPost({ title: '', content: '<p><br></p>', name: 'New Draft', products: [], tags: [] });
            setStatus('idle');
        }
    }, [postId, isEditing, navigate, location.search, generateStream]);

    const handleContentChange = (content: string, editor: any) => {
        setPost(p => ({ ...p, content }));
    };
    
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPost(p => ({ ...p, title: e.target.value, name: e.target.value }));
    };

    const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
        setPost(p => ({ ...p, tags }));
    };

    const handleGenerateTags = async () => {
        if (!post.title || !post.content) {
            alert("Please provide a title and content before generating tags.");
            return;
        }
        setStatus('generating_tags');
        try {
            const newTags = await gemini.generateTags(post.title, post.content);
            setPost(p => ({ ...p, tags: newTags }));
        } catch(err) {
            console.error(err);
            alert("Failed to generate tags.");
        } finally {
            setStatus('idle');
        }
    };

    const handleSave = async () => {
        setStatus('saving');
        try {
            if (isEditing) {
                 await db.updatePost(post);
            } else {
                if (!post.title) {
                    alert("Please provide a title for the post.");
                    setStatus('idle');
                    return;
                }
                const response = await db.savePost(post);
                 if (response.id) {
                    navigate(`/edit/${response.id}`);
                 }
            }
            alert("Changes saved successfully!");
        } catch (err) {
            console.error("Failed to save changes:", err);
            alert("Could not save changes.");
        } finally {
            setStatus('idle');
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this post forever?")) {
            setStatus('deleting');
            try {
                await db.deletePost(post.id!);
                alert("Post deleted.");
                navigate('/posts');
            } catch (err) {
                console.error("Failed to delete post:", err);
                alert("Could not delete the post.");
                setStatus('idle');
            }
        }
    };
    
    const isBusy = status === 'loading' || status === 'saving' || status === 'deleting' || status === 'generating';

    if (status === 'loading') return <LoadingOverlay message="Loading Editor..." />;
    if (status === 'generating') return <LoadingOverlay message="AI is Generating Content..." details={generationDetails} />;

    return (
        <div>
            <Card className="!p-4 mb-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <h1 className="text-2xl font-bold text-white line-clamp-1">{isEditing ? `Editing: ${post.name || 'Untitled'}` : 'Create New Post'}</h1>
                    <div className="flex items-center space-x-2">
                        {isEditing ? (
                            <>
                                <Button onClick={handleSave} disabled={isBusy}>
                                    {status === 'saving' ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <Button variant="danger" onClick={handleDelete} disabled={isBusy}>
                                    {status === 'deleting' ? 'Deleting...' : 'Delete'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button onClick={handleSave} disabled={isBusy}>
                                    {status === 'saving' ? 'Saving...' : 'Save as New Post'}
                                </Button>
                                <Button variant="secondary" onClick={() => navigate('/posts')}>
                                    Cancel
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </Card>

            {generationError && (
                 <Card className="mb-4 border border-red-500/50">
                    <h3 className="text-lg font-bold text-red-400">Generation Error</h3>
                    <p className="text-red-300 mt-2">{generationError}</p>
                </Card>
            )}

            <div className="space-y-6">
                <Input 
                    label="Post Title" 
                    value={post.title || ''}
                    onChange={handleTitleChange}
                    placeholder="Your awesome blog post title"
                    className="!text-xl !py-3 font-bold"
                    disabled={isBusy}
                />
                <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <Input 
                            label="Tags (comma-separated)"
                            value={post.tags?.join(', ') || ''}
                            onChange={handleTagsChange}
                            placeholder="e.g., tech, review, comparison"
                            disabled={isBusy}
                        />
                    </div>
                    <Button variant="secondary" onClick={handleGenerateTags} disabled={isBusy || status === 'generating_tags'}>
                        {status === 'generating_tags' ? 'Generating...' : 'Generate Tags'}
                    </Button>
                </div>
                <div>
                    <Editor
                        onInit={(evt, editor) => editorRef.current = editor}
                        value={post.content || ''}
                        onEditorChange={handleContentChange}
                        disabled={isBusy}
                        init={{
                          height: 700,
                          menubar: 'file edit view insert format tools table help',
                          plugins: [
                            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                            'insertdatetime', 'media', 'table', 'help', 'wordcount', 'autoresize'
                          ],
                          toolbar: 'undo redo | blocks | ' +
                            'bold italic forecolor | alignleft aligncenter ' +
                            'alignright alignjustify | bullist numlist outdent indent | ' +
                            'link image media | table | code | removeformat | help',
                          content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:16px }',
                          image_advtab: true,
                          table_toolbar: "tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol",
                          autoresize_bottom_margin: 50,
                          // The following lines are crucial for self-hosting to find the UI skin.
                          skin_url: '/tinymce/skins/ui/oxide',
                          content_css: '/tinymce/skins/content/default/content.min.css'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default EditPost;
