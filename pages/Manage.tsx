
import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { BlogPost } from '../types';
import { useApp } from '../contexts/AppContext';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';
import CopyIcon from '../components/icons/CopyIcon';
import SaveIcon from '../components/icons/SaveIcon';
import Modal from '../components/Modal';

const Manage: React.FC = () => {
  const [blogPosts, setBlogPosts] = useLocalStorage<BlogPost[]>('blog-posts', []);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postLabels, setPostLabels] = useState('');
  const [postMetaDescription, setPostMetaDescription] = useState('');
  const [postSocialSnippets, setPostSocialSnippets] = useState('');
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const { addToast } = useApp();

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setPostTitle(post.title);
    setPostContent(post.content);
    setPostLabels(post.labels);
    setPostMetaDescription(post.metaDescription);
    setPostSocialSnippets(post.socialMediaSnippets);
  };

  const handleSave = () => {
    if (!editingPost) return;
    setBlogPosts(blogPosts.map(p => p.id === editingPost.id ? { 
      ...p, 
      title: postTitle, 
      content: postContent, 
      labels: postLabels,
      metaDescription: postMetaDescription,
      socialMediaSnippets: postSocialSnippets,
    } : p));
    setEditingPost(null);
    addToast('Post updated successfully!', 'success');
  };

  const handleDelete = (post: BlogPost) => {
    setPostToDelete(post);
  };
  
  const confirmDelete = () => {
      if(!postToDelete) return;
      setBlogPosts(blogPosts.filter(p => p.id !== postToDelete.id));
      setPostToDelete(null);
      addToast('Post deleted.', 'info');
  }

  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    addToast('Copied to clipboard!', 'success');
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-800">Manage Blog Posts</h2>
      
      {blogPosts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-md border border-gray-200">
          <p className="text-gray-500 text-lg">You haven't generated any blog posts yet.</p>
          <p className="text-gray-400">Go to the Generator page to create your first one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {blogPosts.map(post => (
            <div key={post.id} className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-primary">{post.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Created on: {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => handleCopyToClipboard(post.content)}
                    className="p-2 text-gray-500 hover:text-primary hover:bg-blue-100 rounded-full transition-colors"
                    title="Copy HTML"
                  >
                    <CopyIcon className="w-5 h-5"/>
                  </button>
                  <button
                    onClick={() => handleEdit(post)}
                    className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-100 rounded-full transition-colors"
                    title="Edit Post"
                  >
                    <EditIcon className="w-5 h-5"/>
                  </button>
                  <button
                    onClick={() => handleDelete(post)}
                    className="p-2 text-gray-500 hover:text-error hover:bg-red-100 rounded-full transition-colors"
                    title="Delete Post"
                  >
                    <TrashIcon className="w-5 h-5"/>
                  </button>
                </div>
              </div>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-800 select-none">Show Details</summary>
                <div className="mt-2 p-3 bg-gray-50 rounded-md border text-gray-600 space-y-3">
                  <p><span className="font-semibold">Products:</span> {post.products.map(p => p.title).join(', ')}</p>
                  <p><span className="font-semibold">Labels:</span> <span className="font-mono text-xs p-1 bg-gray-200 rounded">{post.labels || 'N/A'}</span></p>
                  <hr/>
                  <div>
                    <p className="font-semibold">Meta Description:</p>
                    <p className="pl-2 italic">"{post.metaDescription}"</p>
                  </div>
                  <div>
                    <p className="font-semibold">Social Snippets:</p>
                    <div className="pl-2 whitespace-pre-wrap font-mono text-xs bg-gray-100 p-2 rounded">{post.socialMediaSnippets}</div>
                  </div>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={!!editingPost} onClose={() => setEditingPost(null)} title={`Editing Post`}>
        <div className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
          <div>
            <label htmlFor="editTitle" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" id="editTitle" value={postTitle} onChange={e => setPostTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
          </div>
          <div>
            <label htmlFor="editLabels" className="block text-sm font-medium text-gray-700 mb-1">Labels</label>
            <input type="text" id="editLabels" value={postLabels} onChange={e => setPostLabels(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
          </div>
           <div>
            <label htmlFor="editMeta" className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
            <textarea id="editMeta" value={postMetaDescription} onChange={e => setPostMetaDescription(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
          </div>
           <div>
            <label htmlFor="editSocial" className="block text-sm font-medium text-gray-700 mb-1">Social Media Snippets</label>
            <textarea id="editSocial" value={postSocialSnippets} onChange={e => setPostSocialSnippets(e.target.value)} rows={4} className="w-full p-2 border border-gray-300 rounded-md font-mono text-sm whitespace-pre-wrap" />
          </div>
          <div>
            <label htmlFor="editContent" className="block text-sm font-medium text-gray-700 mb-1">Content (HTML)</label>
            <textarea
              id="editContent"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={15}
              className="w-full p-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 sticky bottom-0 bg-white py-2">
            <button onClick={() => setEditingPost(null)} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md">
                <SaveIcon className="w-5 h-5" />
                Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
       <Modal isOpen={!!postToDelete} onClose={() => setPostToDelete(null)} title="Confirm Deletion">
        <div className="space-y-4">
          <p>Are you sure you want to delete the post titled "{postToDelete?.title}"? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPostToDelete(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
              Cancel
            </button>
            <button onClick={confirmDelete} className="px-4 py-2 bg-error text-white rounded-md hover:bg-opacity-90">
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default Manage;
