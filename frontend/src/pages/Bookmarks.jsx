import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StaggerList, StaggerItem } from '../components/StaggerList';
import ArticleCard from '../components/ArticleCard';
import ArticlePreviewModal from '../components/ArticlePreviewModal';
import {
  getHistory,
  getBookmarkFolders,
  createBookmarkFolder,
  updateBookmarkFolder,
  deleteBookmarkFolder,
  moveBookmarkToFolder,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Bookmark,
  BookmarkX,
  FolderPlus,
  Folder,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronDown,
} from 'lucide-react';

const Bookmarks = () => {
  const { user, toggleBookmark } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Folder state
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null); // null = "All"
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [movingArticleId, setMovingArticleId] = useState(null);

  const loadFolders = useCallback(async () => {
    try {
      const data = await getBookmarkFolders();
      setFolders(data.folders || data || []);
    } catch {
      // Silently fail — folders are optional enhancement
    }
  }, []);

  const loadBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      const params = { bookmarked: true };
      if (activeFolder) params.folder = activeFolder;
      const data = await getHistory(params);
      setArticles(data.articles || []);
    } catch {
      toast.error('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  }, [activeFolder]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const handlePreview = (article) => setSelectedArticle(article);

  const handleToggle = async (id) => {
    await toggleBookmark(id);
    setArticles((prev) => prev.filter((a) => (a._id || a.id) !== id));
  };

  // --- Folder CRUD ---
  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await createBookmarkFolder(name);
      setNewFolderName('');
      setShowNewFolderInput(false);
      toast.success(`Folder "${name}" created`);
      loadFolders();
    } catch (err) {
      toast.error(err?.friendlyMessage || 'Failed to create folder');
    }
  };

  const handleRenameFolder = async (id) => {
    const name = editingFolderName.trim();
    if (!name) return;
    try {
      await updateBookmarkFolder(id, name);
      setEditingFolderId(null);
      setEditingFolderName('');
      toast.success('Folder renamed');
      loadFolders();
    } catch (err) {
      toast.error(err?.friendlyMessage || 'Failed to rename folder');
    }
  };

  const handleDeleteFolder = async (id) => {
    try {
      await deleteBookmarkFolder(id);
      if (activeFolder === id) setActiveFolder(null);
      toast.success('Folder deleted');
      loadFolders();
      loadBookmarks();
    } catch (err) {
      toast.error(err?.friendlyMessage || 'Failed to delete folder');
    }
  };

  const handleMoveToFolder = async (articleId, folderId) => {
    try {
      await moveBookmarkToFolder(articleId, folderId);
      setMovingArticleId(null);
      toast.success('Article moved');
      loadBookmarks();
    } catch (err) {
      toast.error(err?.friendlyMessage || 'Failed to move article');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="h-8 w-40 bg-[#f0f0f0] dark:bg-[#2a2a2a] rounded animate-pulse mb-2" />
          <div className="h-4 w-56 bg-[#f0f0f0] dark:bg-[#2a2a2a] rounded animate-pulse" />
        </div>
        <div className="flex gap-2 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 w-24 bg-[#f0f0f0] dark:bg-[#2a2a2a] rounded animate-pulse" />
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 font-['Playfair_Display']">
          <Bookmark size={24} className="text-blue-600" />
          Bookmarks
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-sans">
          Articles you've saved for later
        </p>
      </motion.div>

      {/* Folder Chips */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <Folder size={14} className="text-ink-muted dark:text-ink-faint" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans">
            Folders
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* All chip */}
          <button
            onClick={() => setActiveFolder(null)}
            className={`px-3 py-1.5 text-xs font-sans border transition-colors ${
              activeFolder === null
                ? 'border-ink dark:border-paper text-ink dark:text-paper bg-ink/5 dark:bg-paper/5'
                : 'border-ink/10 dark:border-paper/10 text-ink-muted dark:text-ink-faint hover:border-ink/30 dark:hover:border-paper/30'
            }`}
          >
            All
          </button>

          {/* Folder chips */}
          {folders.map((folder) => {
            const folderId = folder._id || folder.id;
            const isActive = activeFolder === folderId;

            if (editingFolderId === folderId) {
              return (
                <div key={folderId} className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameFolder(folderId);
                      if (e.key === 'Escape') { setEditingFolderId(null); setEditingFolderName(''); }
                    }}
                    className="px-2 py-1 text-xs border border-ink/20 dark:border-paper/20 bg-transparent text-ink dark:text-paper outline-none focus:border-ink/40 dark:focus:border-paper/40 w-28 font-sans"
                  />
                  <button
                    onClick={() => handleRenameFolder(folderId)}
                    className="p-1 text-green-600 hover:text-green-700"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => { setEditingFolderId(null); setEditingFolderName(''); }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            }

            return (
              <div key={folderId} className="group relative flex items-center">
                <button
                  onClick={() => setActiveFolder(folderId)}
                  className={`px-3 py-1.5 text-xs font-sans border transition-colors ${
                    isActive
                      ? 'border-ink dark:border-paper text-ink dark:text-paper bg-ink/5 dark:bg-paper/5'
                      : 'border-ink/10 dark:border-paper/10 text-ink-muted dark:text-ink-faint hover:border-ink/30 dark:hover:border-paper/30'
                  }`}
                >
                  {folder.name}
                </button>
                {/* Edit/Delete actions on hover */}
                <div className="absolute -top-1 -right-1 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-[#1a1a1a] border border-ink/10 dark:border-paper/10 p-0.5 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolderId(folderId);
                      setEditingFolderName(folder.name);
                    }}
                    className="p-0.5 text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper"
                  >
                    <Pencil size={10} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folderId);
                    }}
                    className="p-0.5 text-ink-muted dark:text-ink-faint hover:text-red-500"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* New folder input / button */}
          {showNewFolderInput ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') { setShowNewFolderInput(false); setNewFolderName(''); }
                }}
                placeholder="Folder name"
                className="px-2 py-1 text-xs border border-ink/20 dark:border-paper/20 bg-transparent text-ink dark:text-paper outline-none focus:border-ink/40 dark:focus:border-paper/40 w-32 font-sans placeholder:text-ink-faint dark:placeholder:text-ink-muted"
              />
              <button
                onClick={handleCreateFolder}
                className="p-1 text-green-600 hover:text-green-700"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewFolderInput(true)}
              className="px-3 py-1.5 text-xs font-sans border border-dashed border-ink/20 dark:border-paper/20 text-ink-muted dark:text-ink-faint hover:border-ink/40 dark:hover:border-paper/40 hover:text-ink dark:hover:text-paper transition-colors flex items-center gap-1"
            >
              <FolderPlus size={12} />
              New
            </button>
          )}
        </div>
      </motion.div>

      {/* Content */}
      {articles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a]"
        >
          <div className="max-w-[60px] mx-auto mb-5 flex flex-col items-center gap-0.5">
            <div className="w-full h-[2px] bg-gray-200 dark:bg-gray-700" />
            <div className="w-full h-px bg-gray-100 dark:bg-gray-800" />
          </div>
          <BookmarkX size={36} className="text-gray-200 dark:text-gray-600 mb-4" />
          <h3 className="font-['Playfair_Display'] text-xl font-bold text-gray-900 dark:text-white mb-3">
            {activeFolder ? 'No Bookmarks Here' : 'No Bookmarks Yet'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 italic font-serif max-w-sm mx-auto">
            {activeFolder
              ? '"Move articles here from your other bookmarks."'
              : '"Start saving articles to build your personal collection."'}
          </p>
        </motion.div>
      ) : (
        <StaggerList className="grid gap-3 md:grid-cols-2">
          {articles.map((art) => {
            const artId = art._id || art.id;
            return (
              <StaggerItem key={artId} className="relative">
                <ArticleCard
                  article={art}
                  onPreview={handlePreview}
                  onBookmark={handleToggle}
                  isBookmarked={user?.bookmarks?.includes(artId)}
                />
                {/* Move-to-folder button */}
                <div className="absolute top-2 right-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMovingArticleId(movingArticleId === artId ? null : artId);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-[0.2em] font-sans border border-ink/10 dark:border-paper/10 text-ink-muted dark:text-ink-faint hover:border-ink/30 dark:hover:border-paper/30 hover:text-ink dark:hover:text-paper bg-white/90 dark:bg-[#1a1a1a]/90 transition-colors"
                  >
                    <Folder size={10} />
                    <span className="hidden sm:inline">Move</span>
                    <ChevronDown size={10} />
                  </button>

                  {/* Folder dropdown */}
                  <AnimatePresence>
                    {movingArticleId === artId && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#1a1a1a] border border-ink/10 dark:border-paper/10 z-20"
                      >
                        <button
                          onClick={() => handleMoveToFolder(artId, null)}
                          className="w-full text-left px-3 py-2 text-xs font-sans text-ink-muted dark:text-ink-faint hover:bg-ink/5 dark:hover:bg-paper/5 transition-colors"
                        >
                          No folder
                        </button>
                        {folders.map((f) => {
                          const fId = f._id || f.id;
                          return (
                            <button
                              key={fId}
                              onClick={() => handleMoveToFolder(artId, fId)}
                              className="w-full text-left px-3 py-2 text-xs font-sans text-ink dark:text-paper hover:bg-ink/5 dark:hover:bg-paper/5 transition-colors"
                            >
                              {f.name}
                            </button>
                          );
                        })}
                        {folders.length === 0 && (
                          <div className="px-3 py-2 text-xs font-sans text-ink-faint dark:text-ink-muted">
                            No folders yet
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}

      <ArticlePreviewModal
        key={selectedArticle?._id || selectedArticle?.id || 'bookmark-preview'}
        article={selectedArticle}
        isOpen={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </motion.div>
  );
};

export default Bookmarks;
