
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


const EditPost: React.FC = () => {
    const { postId } = useParams<{ postId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const isEditing = !!postId;
    const editorRef = useRef<any>(null);

    const [post, setPost] = useState<Partial<BlogPost>>({ title: '', content: '' });
    const [status, setStatus] = useState<'loading' | 'saving' | 'deleting' | 'generating' | 'idle'>('loading');
    const [generationDetails, setGenerationDetails] = useState('');
    const [generationError, setGenerationError] = useState('');

     const generateStream = useCallback(async (products: Product[], instructions: string, templateId: string, includeComparisonCards: boolean) => {
        if (!post.id) return;
        
        let accumulatedContent = '';
        let finalData: Partial<BlogPost> = {};

        try {
            const response = await gemini.generatePostStream(products, instructions, templateId, includeComparisonCards);
            
            if (!response.body) throw new Error("Response body is missing");

            const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                accumulatedContent += value;

                // Try to parse the accumulated content so far
                try {
                    // Find the last complete JSON object
                    const lastBraceIndex = accumulatedContent.lastIndexOf('}');
                    if (lastBraceIndex > -1) {
                         const potentialJson = accumulatedContent.substring(0, lastBraceIndex + 1);
                         const parsed = JSON.parse(potentialJson);
                         
                         // Update UI with partial data
                         setPost(p => ({
                             ...p,
                             title: parsed.title || p.title,
                             content: parsed.content || p.content,
                             heroImageUrl: parsed.heroImageUrl || p.heroImageUrl,
                             tags: parsed.tags || p.tags
                         }));
                         finalData = parsed; // keep track of the last good parse
                    }
                } catch (e) {
                    // This is expected as the JSON streams in chunks.
                    // We just continue to the next chunk.
                }
                 setGenerationDetails(`Received ${accumulatedContent.length} bytes...`);
            }

            // Once streaming is complete, save the final complete data.
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
    }, [post.id]);


    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const isNewPost = urlParams.get('new') === 'true';

        if (isEditing) {
            if (isNewPost) {
                 // Fetch the skeleton post, then generate
                setStatus('loading');
                db.getPost(postId!)
                    .then(fetchedPost => {
                        setPost(fetchedPost);
                        setStatus('generating');
                        setGenerationDetails('Initializing AI stream...');
                        
                        const instructions = urlParams.get('instructions') || '';
                        const templateId = urlParams.get('templateId') || 'default';
                        const includeComparisonCards = urlParams.get('includeComparisonCards') === 'true';

                        generateStream(fetchedPost.products || [], instructions, templateId, includeComparisonCards);
                    })
                    .catch(err => {
                        console.error("Failed to fetch post for generation:", err);
                        navigate('/posts');
                    });
            } else {
                 // Just load the post for normal editing
                setStatus('loading');
                db.getPost(postId!)
                    .then(fetchedPost => {
                        setPost(fetchedPost);
                        setStatus('idle');
                    })
                    .catch(err => {
                        console.error("Failed to fetch post:", err);
                        alert("Could not load the post. Redirecting to posts list.");
                        navigate('/posts');
                    });
            }
        } else {
            // New post mode (blank editor)
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
                    navigate(`/edit/${response.id}`); // Navigate to the new post's edit page
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

                <div>
                    <Editor
                        apiKey='no-api-key' // Using the free tier for this demo
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
                            'insertdatetime', 'media', 'table', 'help', 'wordcount', 'autoresize', 'imagetools'
                          ],
                          toolbar: 'undo redo | blocks | ' +
                            'bold italic forecolor | alignleft aligncenter ' +
                            'alignright alignjustify | bullist numlist outdent indent | ' +
                            'link image media | table | code | removeformat | help',
                          content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:16px }',
                          skin: 'oxide-dark',
                          content_css: 'dark',
                          image_advtab: true,
                          table_toolbar: "tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol",
                          autoresize_bottom_margin: 50,
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default EditPost;