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
import { useLanguage } from '../context/LanguageContext';
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
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
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
      // Silently fail
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
          <div className="h-8 w-40 bg-[#fafafa] dark:bg-[#222] animate-pulse mb-2" />
          <div className="h-4 w-56 bg-[#fafafa] dark:bg-[#222] animate-pulse" />
        </div>
        <div className="flex gap-2 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 w-24 bg-[#fafafa] dark:bg-[#222] animate-pulse" />
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] animate-pulse" />
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {t('bookmarks')}
        </h1>
        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
          Articles you've saved for later
        </p>
        <div className="mt-3 border-b border-[#e5e5e5] dark:border-[#222]" />
      </div>

      {/* Folder Chips */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Folder size={14} className="text-gray-400 dark:text-[#666]" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]">
            Folders
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveFolder(null)}
            className={`px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] border transition-colors ${
              activeFolder === null
                ? 'border-black dark:border-white text-white dark:text-black bg-black dark:bg-white'
                : 'border-[#e5e5e5] dark:border-[#222] text-gray-500 dark:text-[#999] hover:border-black dark:hover:border-white'
            }`}
          >
            All
          </button>

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
                    className="px-2 py-1 text-xs border border-[#e5e5e5] dark:border-[#222] bg-transparent text-black dark:text-white outline-none focus:border-black dark:focus:border-white w-28"
                  />
                  <button
                    onClick={() => handleRenameFolder(folderId)}
                    className="p-1 text-[#4ADE80] hover:opacity-70"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => { setEditingFolderId(null); setEditingFolderName(''); }}
                    className="p-1 text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white"
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
                  className={`px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] border transition-colors ${
                    isActive
                      ? 'border-black dark:border-white text-white dark:text-black bg-black dark:bg-white'
                      : 'border-[#e5e5e5] dark:border-[#222] text-gray-500 dark:text-[#999] hover:border-black dark:hover:border-white'
                  }`}
                >
                  {folder.name}
                </button>
                <div className="absolute -top-1 -right-1 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] p-0.5 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolderId(folderId);
                      setEditingFolderName(folder.name);
                    }}
                    className="p-0.5 text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white"
                  >
                    <Pencil size={10} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folderId);
                    }}
                    className="p-0.5 text-gray-400 dark:text-[#666] hover:text-[#FB7185]"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            );
          })}

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
                className="px-2 py-1 text-xs border border-[#e5e5e5] dark:border-[#222] bg-transparent text-black dark:text-white outline-none focus:border-black dark:focus:border-white w-32 placeholder:text-gray-400 dark:placeholder:text-[#666]"
              />
              <button
                onClick={handleCreateFolder}
                className="p-1 text-[#4ADE80] hover:opacity-70"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }}
                className="p-1 text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewFolderInput(true)}
              className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] border border-dashed border-[#e5e5e5] dark:border-[#222] text-gray-400 dark:text-[#666] hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors flex items-center gap-1"
            >
              <FolderPlus size={12} />
              New
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222]">
          <BookmarkX size={36} className="text-gray-200 dark:text-[#333] mb-4" />
          <h3 className="text-xl font-bold text-black dark:text-white mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {activeFolder ? 'No Bookmarks Here' : 'No Bookmarks Yet'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-[#999] italic max-w-sm mx-auto">
            {activeFolder
              ? '"Move articles here from your other bookmarks."'
              : '"Start saving articles to build your personal collection."'}
          </p>
        </div>
      ) : (
        <StaggerList className="grid gap-3 md:grid-cols-2">
          {articles.map((art) => {
            const artId = art._id || art.id;
            const sentimentBorderColor = art.sentiment === 'Positive' ? 'border-l-[#4ADE80]' :
              art.sentiment === 'Negative' ? 'border-l-[#FB7185]' : 'border-l-[#FBBF24]';
            return (
              <StaggerItem key={artId} className={`relative border-l-2 ${sentimentBorderColor}`}>
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
                    className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-[0.18em] border border-[#e5e5e5] dark:border-[#222] text-gray-400 dark:text-[#666] hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white bg-white/90 dark:bg-[#111]/90 transition-colors"
                  >
                    <Folder size={10} />
                    <span className="hidden sm:inline">Move</span>
                    <ChevronDown size={10} />
                  </button>

                  <AnimatePresence>
                    {movingArticleId === artId && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] z-20"
                      >
                        <button
                          onClick={() => handleMoveToFolder(artId, null)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-500 dark:text-[#999] hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors"
                        >
                          No folder
                        </button>
                        {folders.map((f) => {
                          const fId = f._id || f.id;
                          return (
                            <button
                              key={fId}
                              onClick={() => handleMoveToFolder(artId, fId)}
                              className="w-full text-left px-3 py-2 text-xs text-black dark:text-white hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors"
                            >
                              {f.name}
                            </button>
                          );
                        })}
                        {folders.length === 0 && (
                          <div className="px-3 py-2 text-xs text-gray-400 dark:text-[#666]">
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
