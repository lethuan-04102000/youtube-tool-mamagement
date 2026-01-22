'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, Edit, Save, X } from 'lucide-react';

interface Comment {
  text: string;
  category?: string;
}

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/comments');
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      // Load default comments if API fails
      setComments([
        { text: "Great video!", category: "general" },
        { text: "Thanks for sharing!", category: "general" },
        { text: "Very informative!", category: "educational" },
      ]);
    }
  };

  const addComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      text: newComment,
      category: newCategory || 'general',
    };

    setComments([...comments, comment]);
    setNewComment('');
    setNewCategory('');

    // Optionally save to backend
    saveCommentsToBackend([...comments, comment]);
  };

  const deleteComment = (index: number) => {
    const updated = comments.filter((_, i) => i !== index);
    setComments(updated);
    saveCommentsToBackend(updated);
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditText(comments[index].text);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    
    const updated = [...comments];
    updated[editingIndex] = { ...updated[editingIndex], text: editText };
    setComments(updated);
    setEditingIndex(null);
    saveCommentsToBackend(updated);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const saveCommentsToBackend = async (commentsList: Comment[]) => {
    try {
      await fetch('http://localhost:3000/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: commentsList }),
      });
    } catch (error) {
      console.error('Failed to save comments:', error);
    }
  };

  const exportComments = () => {
    const json = JSON.stringify({ comments }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comments.json';
    a.click();
  };

  const categories = Array.from(new Set(comments.map(c => c.category || 'general')));

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Comment Library</h1>
          <p className="text-gray-600 mt-2">Manage your auto-comment templates</p>
        </div>
        <button
          onClick={exportComments}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Save size={20} />
          Export JSON
        </button>
      </div>

      {/* Add Comment Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Plus size={24} />
          Add New Comment
        </h2>
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Enter comment text..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && addComment()}
          />
          <div className="flex gap-3">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category (optional)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addComment}
              disabled={!newComment.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Comment
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-600 text-sm mb-1">Total Comments</div>
          <div className="text-3xl font-bold text-gray-900">{comments.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-600 text-sm mb-1">Categories</div>
          <div className="text-3xl font-bold text-blue-600">{categories.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-600 text-sm mb-1">Avg Length</div>
          <div className="text-3xl font-bold text-green-600">
            {comments.length > 0 
              ? Math.round(comments.reduce((sum, c) => sum + c.text.length, 0) / comments.length)
              : 0}
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare size={24} />
            Comments ({comments.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {comments.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No comments yet. Add your first comment above.
            </div>
          ) : (
            comments.map((comment, index) => (
              <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                {editingIndex === index ? (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={saveEdit}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Save size={18} />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-gray-900 mb-2">{comment.text}</p>
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {comment.category || 'general'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {comment.text.length} characters
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => startEdit(index)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => deleteComment(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
