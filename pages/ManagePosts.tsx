
import React, { useState, useEffect, useCallback } from 'react';
import { BlogPost } from '../types';
import * as db from '../services/dbService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Textarea from '../components/common/Textarea';

const EditModal: React.FC<{ post: BlogPost; onSave: (updatedPost: BlogPost) => void; onClose: () => void; }> = ({ post, onSave, onClose }) => {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);

  const handleSave = () => {
    onSave({ ...post, title, content });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-4">Edit Post</h2>
        <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white mb-4"
        />
        <Textarea 
            label="Post Content (HTML)"
            id="edit-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-grow min-h-0"
            rows={15}
        />
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </Card>
    </div>
  );
};


const ManagePosts: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [postToEdit, setPostToEdit] = useState<BlogPost | null>(null);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);

  const loadPosts = useCallback(() => {
    const sortedPosts = db.getPosts().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setPosts(sortedPosts);
  }, []);
  
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleUpdatePost = (updatedPost: BlogPost) => {
    db.updatePost(updatedPost);
    setPostToEdit(null);
    loadPosts();
  };

  const handleDeletePost = () => {
    if (postToDelete) {
      db.deletePost(postToDelete.id);
      setPostToDelete(null);
      loadPosts();
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Manage Blog Posts</h1>
      
      {posts.length === 0 ? (
        <Card className="text-center">
          <p className="text-slate-400">You haven't generated any blog posts yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <Card key={post.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <h3 className="text-lg font-semibold text-white">{post.title}</h3>
                <p className="text-sm text-slate-400">
                  Generated on {new Date(post.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Compared {post.products.length} product(s).
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex space-x-2 flex-shrink-0">
                <Button variant="secondary" onClick={() => setPostToEdit(post)}>Edit</Button>
                <Button variant="danger" onClick={() => setPostToDelete(post)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {postToEdit && (
        <EditModal 
          post={postToEdit} 
          onSave={handleUpdatePost} 
          onClose={() => setPostToEdit(null)} 
        />
      )}

      {postToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <Card>
                <h2 className="text-xl font-bold text-white mb-4">Confirm Deletion</h2>
                <p className="text-slate-300">Are you sure you want to delete the post titled "{postToDelete.title}"?</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button variant="secondary" onClick={() => setPostToDelete(null)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeletePost}>Delete</Button>
                </div>
            </Card>
        </div>
      )}

    </div>
  );
};

export default ManagePosts;