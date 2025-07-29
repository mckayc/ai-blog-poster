import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BlogPost } from '../types';
import * as db from '../services/dbService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const ManagePosts: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);

  const loadPosts = useCallback(() => {
    db.getPosts()
        .then(posts => {
            const sortedPosts = posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setPosts(sortedPosts);
        })
        .catch(error => console.error("Failed to load posts:", error));
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
      } catch (e) {
        console.error(e);
        alert("Failed to delete post.");
      }
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
                <Link to={`/edit/${post.id}`}>
                    <Button variant="secondary">Edit</Button>
                </Link>
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
