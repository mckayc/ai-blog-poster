
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BlogPost } from '../types.ts';
import * as db from '../services/dbService.ts';
import Card from '../components/common/Card.tsx';
import Button from '../components/common/Button.tsx';

const ManagePosts: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const navigate = useNavigate();

  const loadPosts = useCallback(() => {
    setLoading(true);
    db.getPosts()
      .then(posts => {
        const sortedPosts = posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPosts(sortedPosts);
      })
      .catch(e => {
        console.error("Failed to load posts:", e)
        alert("Could not load posts. See console for details.")
      })
      .finally(() => setLoading(false));
  }, []);
  
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);


  const handleDeletePost = async () => {
    if (postToDelete) {
      try {
        await db.deletePost(postToDelete.id);
        setPostToDelete(null);
        loadPosts();
      } catch (error) {
        alert("Failed to delete post. See console for details.");
        console.error(error);
      }
    }
  };
  
  const handleOpen = (postId: string) => {
    navigate(`/edit/${postId}`);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Manage Blog Posts</h1>
      
      {loading ? (
         <Card className="text-center">
            <p className="text-slate-400">Loading posts...</p>
        </Card>
      ) : posts.length === 0 ? (
        <Card className="text-center">
          <p className="text-slate-400">You haven't created any blog posts yet. Go to the 'Edit Post' page to create one!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <Card key={post.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <h3 className="text-lg font-semibold text-white">{post.title || 'Untitled Post'}</h3>
                <p className="text-sm text-slate-400">
                  Created on {new Date(post.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Products: {post.products.length}
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex space-x-2 flex-shrink-0">
                <Button variant="secondary" onClick={() => handleOpen(post.id)}>Open</Button>
                <Button variant="danger" onClick={() => setPostToDelete(post)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
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