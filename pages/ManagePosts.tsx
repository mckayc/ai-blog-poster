
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BlogPost } from '../src/types';
import * as db from '../src/services/dbService';
import Card from '../src/components/common/Card';
import Button from '../src/components/common/Button';

const ManagePosts: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
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

  const handleSelectPost = (postId: string) => {
    setSelectedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };
  
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPosts(posts.map(p => p.id));
    } else {
      setSelectedPosts([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPosts.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedPosts.length} selected post(s)?`)) {
        try {
            await db.deletePosts(selectedPosts);
            setSelectedPosts([]);
            loadPosts();
        } catch (error) {
            alert("Failed to delete selected posts. See console for details.");
            console.error(error);
        }
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-white">Manage Blog Posts</h1>
        {selectedPosts.length > 0 && (
            <Button variant="danger" onClick={handleBulkDelete}>
                Delete Selected ({selectedPosts.length})
            </Button>
        )}
      </div>
      
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
          <div className="flex items-center px-4 py-2 bg-slate-800 rounded-lg">
            <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={selectedPosts.length > 0 && selectedPosts.length === posts.length}
                className="h-5 w-5 rounded border-slate-500 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
            />
            <label className="ml-3 text-sm font-medium text-slate-300">Select All</label>
          </div>
          {posts.map(post => (
            <Card key={post.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="flex items-start gap-4 flex-grow">
                 <input
                    type="checkbox"
                    checked={selectedPosts.includes(post.id)}
                    onChange={() => handleSelectPost(post.id)}
                    className="h-5 w-5 rounded border-slate-500 bg-slate-700 text-indigo-600 focus:ring-indigo-500 mt-1"
                />
                <div>
                  <h3 className="text-lg font-semibold text-white">{post.title || 'Untitled Post'}</h3>
                  <p className="text-sm text-slate-400">
                    Created on {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Products: {post.products.length}
                  </p>
                </div>
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
