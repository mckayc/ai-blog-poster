
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill, { Quill } from 'react-quill';
import ImageResize from 'quill-image-resize-module-react';
import { BlogPost } from '../types.ts';
import * as db from '../services/dbService.ts';
import Card from '../components/common/Card.tsx';
import Button from '../components/common/Button.tsx';
import Input from '../components/common/Input.tsx';
import LoadingOverlay from '../components/common/LoadingOverlay.tsx';

// Register the stable image resize module
Quill.register({ 'modules/imageResize': ImageResize });

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
    ['link', 'image'],
    [{ 'align': [] }],
    ['clean']
  ],
  imageResize: {
    parchment: Quill.import('parchment'),
    modules: ['Resize', 'DisplaySize']
  },
};

const EditPost: React.FC = () => {
    const { postId } = useParams<{ postId?: string }>();
    const navigate = useNavigate();
    const isEditing = !!postId;

    const [post, setPost] = useState<Partial<BlogPost>>({ title: '', content: '' });
    const [status, setStatus] = useState<'loading' | 'saving' | 'deleting' | 'idle'>('idle');

    useEffect(() => {
        if (isEditing) {
            setStatus('loading');
            db.getPost(postId)
                .then(fetchedPost => {
                    setPost(fetchedPost);
                    setStatus('idle');
                })
                .catch(err => {
                    console.error("Failed to fetch post:", err);
                    alert("Could not load the post. Redirecting to posts list.");
                    navigate('/posts');
                });
        } else {
            // New post mode
            setPost({ title: '', content: '<p><br></p>', name: 'New Draft' });
        }
    }, [postId, isEditing, navigate]);

    const handleContentChange = (content: string) => {
        setPost(p => ({ ...p, content }));
    };
    
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPost(p => ({ ...p, title: e.target.value }));
    };

    const handleSaveNew = async () => {
        if (!post.title) {
            alert("Please provide a title for the post.");
            return;
        }
        setStatus('saving');
        try {
            const newPostData = {
                ...post,
                name: post.title, // Use title as internal name for new posts
                products: [],
                tags: [],
            };
            const response = await db.savePost(newPostData);
            if (response.id) {
                alert("Post saved successfully!");
                navigate(`/edit/${response.id}`); // Navigate to the new post's edit page
            }
        } catch (err) {
            console.error("Failed to save new post:", err);
            alert("Could not save the post.");
            setStatus('idle');
        }
    };
    
    const handleSaveChanges = async () => {
        setStatus('saving');
        try {
            await db.updatePost(post);
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

    const isBusy = status === 'loading' || status === 'saving' || status === 'deleting';

    if (status === 'loading') {
        return <LoadingOverlay message="Loading Editor..." />;
    }

    return (
        <div>
            <style>{`
                .ql-editor { min-height: 600px; font-size: 1rem; line-height: 1.6; background-color: #f8fafc; color: #0f172a; }
                .ql-toolbar { background-color: #f1f5f9; border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem; border: 1px solid #e2e8f0 !important; }
                .ql-container { border-bottom-left-radius: 0.5rem; border-bottom-right-radius: 0.5rem; border: 1px solid #e2e8f0 !important; }
            `}</style>
            
            <Card className="!p-4 mb-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <h1 className="text-2xl font-bold text-white">{isEditing ? 'Edit Post' : 'Create New Post'}</h1>
                    <div className="flex items-center space-x-2">
                        {isEditing ? (
                            <>
                                <Button onClick={handleSaveChanges} disabled={isBusy}>
                                    {status === 'saving' ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <Button variant="danger" onClick={handleDelete} disabled={isBusy}>
                                    {status === 'deleting' ? 'Deleting...' : 'Delete'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button onClick={handleSaveNew} disabled={isBusy}>
                                    {status === 'saving' ? 'Saving...' : 'Save'}
                                </Button>
                                <Button variant="secondary" onClick={() => navigate('/posts')}>
                                    Open Posts
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </Card>

            <div className="space-y-6">
                <Input 
                    label="Post Title" 
                    value={post.title || ''}
                    onChange={handleTitleChange}
                    placeholder="Your awesome blog post title"
                    className="!text-xl !py-3 font-bold"
                    disabled={isBusy}
                />

                <div className="bg-white rounded-lg text-slate-900">
                    <ReactQuill 
                        theme="snow" 
                        value={post.content || ''} 
                        onChange={handleContentChange}
                        modules={quillModules}
                        readOnly={isBusy}
                    />
                </div>
            </div>
        </div>
    );
};

export default EditPost;
