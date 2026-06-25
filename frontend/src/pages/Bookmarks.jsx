import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  FolderOpen,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronDown,
  Tag,
  Tags,
  Download,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Hash,
} from 'lucide-react';

// ─── Tag persistence (localStorage) ────────────────────────────────────────────
const TAGS_STORAGE_KEY = 'bookmark_tags';

const loadAllTags = () => {
  try {
    return JSON.parse(localStorage.getItem(TAGS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveAllTags = (tagsMap) => {
  localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tagsMap));
};

// ─── BM/ENG translations ──────────────────────────────────────────────────────
const translations = {
  bookmarks: { en: 'Bookmarks', bm: 'Tandabuku' },
  subtitle: { en: "Articles you've saved for later", bm: 'Artikel yang anda simpan untuk kemudian' },
  folders: { en: 'Folders', bm: 'Folder' },
  all: { en: 'All', bm: 'Semua' },
  noFolder: { en: 'No folder', bm: 'Tiada folder' },
  newFolder: { en: 'New', bm: 'Baru' },
  folderName: { en: 'Folder name', bm: 'Nama folder' },
  move: { en: 'Move', bm: 'Pindah' },
  noFoldersYet: { en: 'No folders yet', bm: 'Belum ada folder' },
  noBookmarksHere: { en: 'No Bookmarks Here', bm: 'Tiada Tandabuku Di Sini' },
  noBookmarksYet: { en: 'No Bookmarks Yet', bm: 'Belum Ada Tandabuku' },
  moveHere: { en: 'Move articles here from your other bookmarks.', bm: 'Pindahkan artikel ke sini dari tandabuku lain.' },
  startSaving: { en: 'Start saving articles to build your personal collection.', bm: 'Mula simpan artikel untuk membina koleksi peribadi anda.' },
  tags: { en: 'Tags', bm: 'Tag' },
  allTags: { en: 'All Tags', bm: 'Semua Tag' },
  filterByTag: { en: 'Filter by tag', bm: 'Tapis mengikut tag' },
  addTag: { en: 'Add tag', bm: 'Tambah tag' },
  addTagPlaceholder: { en: 'Type tag & press Enter', bm: 'Taip tag & tekan Enter' },
  export: { en: 'Export CSV', bm: 'Eksport CSV' },
  exported: { en: 'Bookmarks exported', bm: 'Tandabuku dieksport' },
  noTags: { en: 'No tags yet', bm: 'Belum ada tag' },
  filterActive: { en: 'Showing tagged articles', bm: 'Menunjukkan artikel bertag' },
  clearFilter: { en: 'Clear filter', bm: 'Padam tapisan' },
  moveArticle: { en: 'Move to folder', bm: 'Pindah ke folder' },
  tagArticle: { en: 'Tags', bm: 'Tag' },
  folderCreated: { en: 'Folder created', bm: 'Folder dicipta' },
  folderRenamed: { en: 'Folder renamed', bm: 'Folder dinamakan semula' },
  folderDeleted: { en: 'Folder deleted', bm: 'Folder dipadam' },
  articleMoved: { en: 'Article moved', bm: 'Artikel dipindahkan' },
  failedLoad: { en: 'Failed to load bookmarks', bm: 'Gagal memuatkan tandabuku' },
  articleTagged: { en: 'Tag added', bm: 'Tag ditambah' },
  tagRemoved: { en: 'Tag removed', bm: 'Tag dipadam' },
  bookmarksCount: { en: 'bookmarks', bm: 'tandabuku' },
  taggedCount: { en: 'tagged', bm: 'bertag' },
};

const tLocal = (key, lang) => {
  const entry = translations[key];
  if (!entry) return key;
  return lang === 'bm' ? entry.bm : entry.en;
};

// ─── CSV Export Helper ─────────────────────────────────────────────────────────
const exportToCSV = (articles, tagsMap) => {
  const headers = ['Title', 'Source', 'Sentiment', 'Score', 'Date', 'URL', 'Tags'];
  const rows = articles.map((art) => {
    const artId = art._id || art.id;
    const artTags = tagsMap[artId] || [];
    return [
      `"${(art.title || '').replace(/"/g, '""')}"`,
      `"${(art.source || '').replace(/"/g, '""')}"`,
      art.sentiment || '',
      art.score ?? '',
      art.publishedAt || art.date || '',
      `"${(art.url || art.link || '').replace(/"/g, '""')}"`,
      `"${artTags.join(', ')}"`,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bookmarks_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ─── Tag Input Component ───────────────────────────────────────────────────────
const TagInput = ({ tags, onAdd, onRemove, lang }) => {
  const [input, setInput] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      const newTag = input.trim().toLowerCase().replace(/[^a-z0-9\u00C0-\u024F\u4E00-\u9FFF\u0400-\u04FF_-]/g, '');
      if (newTag && !tags.includes(newTag)) {
        onAdd(newTag);
      }
      setInput('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] bg-black dark:bg-white text-white dark:text-black"
          >
            <Hash size={8} />
            {tag}
            <button
              onClick={() => onRemove(tag)}
              className="ml-0.5 opacity-60 hover:opacity-100"
            >
              <X size={8} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tLocal('addTagPlaceholder', lang)}
          className="flex-1 px-2 py-1 text-[11px] border border-[#e5e5e5] dark:border-[#333] bg-transparent text-black dark:text-white outline-none focus:border-black dark:focus:border-white placeholder:text-gray-400 dark:placeholder:text-[#555]"
        />
      </div>
    </div>
  );
};

// ─── Folder Sidebar Component ──────────────────────────────────────────────────
const FolderSidebar = ({
  folders,
  activeFolder,
  setActiveFolder,
  editingFolderId,
  setEditingFolderId,
  editingFolderName,
  setEditingFolderName,
  showNewFolderInput,
  setShowNewFolderInput,
  newFolderName,
  setNewFolderName,
  handleCreateFolder,
  handleRenameFolder,
  handleDeleteFolder,
  lang,
}) => (
  <div className="mb-6">
    <div className="flex items-center gap-2 mb-3">
      <Folder size={14} className="text-gray-400 dark:text-[#666]" />
      <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] font-medium">
        {tLocal('folders', lang)}
      </span>
      <div className="flex-1 border-b border-[#e5e5e5] dark:border-[#222] ml-2" />
    </div>

    <div className="flex flex-wrap items-center gap-2">
      {/* All button */}
      <button
        onClick={() => setActiveFolder(null)}
        className={`px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] border-2 transition-colors ${
          activeFolder === null
            ? 'border-black dark:border-white text-white dark:text-black bg-black dark:bg-white'
            : 'border-[#e5e5e5] dark:border-[#222] text-gray-500 dark:text-[#999] hover:border-black dark:hover:border-white'
        }`}
      >
        {tLocal('all', lang)}
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
                className="px-2 py-1 text-xs border-2 border-black dark:border-white bg-transparent text-black dark:text-white outline-none w-28"
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
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] border-2 transition-colors ${
                isActive
                  ? 'border-black dark:border-white text-white dark:text-black bg-black dark:bg-white'
                  : 'border-[#e5e5e5] dark:border-[#222] text-gray-500 dark:text-[#999] hover:border-black dark:hover:border-white'
              }`}
            >
              {isActive ? <FolderOpen size={12} /> : <Folder size={12} />}
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
            placeholder={tLocal('folderName', lang)}
            className="px-2 py-1 text-xs border-2 border-black dark:border-white bg-transparent text-black dark:text-white outline-none w-32 placeholder:text-gray-400 dark:placeholder:text-[#666]"
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
          className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] border-2 border-dashed border-[#e5e5e5] dark:border-[#222] text-gray-400 dark:text-[#666] hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors flex items-center gap-1"
        >
          <FolderPlus size={12} />
          {tLocal('newFolder', lang)}
        </button>
      )}
    </div>
  </div>
);

// ─── Tag Filter Bar ────────────────────────────────────────────────────────────
const TagFilterBar = ({ allTags, activeTag, setActiveTag, lang }) => {
  if (allTags.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Tags size={14} className="text-gray-400 dark:text-[#666]" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] font-medium">
          {tLocal('filterByTag', lang)}
        </span>
        <div className="flex-1 border-b border-[#e5e5e5] dark:border-[#222] ml-2" />
        {activeTag && (
          <button
            onClick={() => setActiveTag(null)}
            className="flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white transition-colors"
          >
            <X size={10} />
            {tLocal('clearFilter', lang)}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] border transition-colors ${
              activeTag === tag
                ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                : 'border-[#e5e5e5] dark:border-[#333] text-gray-500 dark:text-[#999] hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
            }`}
          >
            <Hash size={9} />
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Article Tag Panel (inline) ────────────────────────────────────────────────
const ArticleTagPanel = ({ artId, allTagsMap, setAllTagsMap, lang }) => {
  const tags = allTagsMap[artId] || [];
  const [expanded, setExpanded] = useState(false);

  const addTag = (tag) => {
    setAllTagsMap((prev) => {
      const next = { ...prev, [artId]: [...(prev[artId] || []), tag] };
      saveAllTags(next);
      return next;
    });
    toast.success(tLocal('articleTagged', lang));
  };

  const removeTag = (tag) => {
    setAllTagsMap((prev) => {
      const updated = (prev[artId] || []).filter((t) => t !== tag);
      const next = { ...prev };
      if (updated.length === 0) {
        delete next[artId];
      } else {
        next[artId] = updated;
      }
      saveAllTags(next);
      return next;
    });
    toast.success(tLocal('tagRemoved', lang));
  };

  return (
    <div className="mt-2">
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white transition-colors"
      >
        <Tag size={10} />
        {tLocal('tagArticle', lang)}
        {tags.length > 0 && (
          <span className="px-1.5 py-0 text-[9px] bg-black dark:bg-white text-white dark:text-black">
            {tags.length}
          </span>
        )}
        <ChevronDown size={10} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-1">
              <TagInput tags={tags} onAdd={addTag} onRemove={removeTag} lang={lang} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const Bookmarks = () => {
  const { user, toggleBookmark } = useAuth();
  const [articles, setArticles] = useState([]);
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Folder state
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [movingArticleId, setMovingArticleId] = useState(null);

  // Tag state (localStorage-backed)
  const [allTagsMap, setAllTagsMap] = useState(() => loadAllTags());
  const [activeTag, setActiveTag] = useState(null);

  // Compute all unique tags across all bookmarks
  const allUniqueTags = useMemo(() => {
    const tagSet = new Set();
    Object.values(allTagsMap).forEach((tags) => tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [allTagsMap]);

  // Filtered articles (by active tag)
  const displayedArticles = useMemo(() => {
    if (!activeTag) return articles;
    return articles.filter((art) => {
      const artId = art._id || art.id;
      return (allTagsMap[artId] || []).includes(activeTag);
    });
  }, [articles, activeTag, allTagsMap]);

  // Count tagged articles
  const taggedCount = useMemo(() => {
    return articles.filter((art) => {
      const artId = art._id || art.id;
      return (allTagsMap[artId] || []).length > 0;
    }).length;
  }, [articles, allTagsMap]);

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
      toast.error(tLocal('failedLoad', lang));
    } finally {
      setLoading(false);
    }
  }, [activeFolder, lang]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // Refresh tags from localStorage on mount (sync across tabs)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === TAGS_STORAGE_KEY) {
        setAllTagsMap(loadAllTags());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
      toast.success(tLocal('folderCreated', lang));
      loadFolders();
    } catch (err) {
      toast.error(err?.friendlyMessage || tLocal('folderCreated', lang));
    }
  };

  const handleRenameFolder = async (id) => {
    const name = editingFolderName.trim();
    if (!name) return;
    try {
      await updateBookmarkFolder(id, name);
      setEditingFolderId(null);
      setEditingFolderName('');
      toast.success(tLocal('folderRenamed', lang));
      loadFolders();
    } catch (err) {
      toast.error(err?.friendlyMessage || 'Failed to rename folder');
    }
  };

  const handleDeleteFolder = async (id) => {
    try {
      await deleteBookmarkFolder(id);
      if (activeFolder === id) setActiveFolder(null);
      toast.success(tLocal('folderDeleted', lang));
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
      toast.success(tLocal('articleMoved', lang));
      loadBookmarks();
    } catch (err) {
      toast.error(err?.friendlyMessage || 'Failed to move article');
    }
  };

  const handleExport = () => {
    exportToCSV(articles, allTagsMap);
    toast.success(tLocal('exported', lang));
  };

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
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

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto"
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-3xl font-bold text-black dark:text-white tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {tLocal('bookmarks', lang)}
            </h1>
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
              {tLocal('subtitle', lang)}
            </p>
          </div>

          {/* Export button */}
          {articles.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] border-2 border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors"
            >
              <FileSpreadsheet size={14} />
              {tLocal('export', lang)}
            </motion.button>
          )}
        </div>
        <div className="mt-3 border-b-2 border-black dark:border-white" />
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-5 text-[10px] uppercase tracking-[0.18em] text-gray-400 dark:text-[#555]">
        <span>
          {articles.length} {tLocal('bookmarksCount', lang)}
        </span>
        {taggedCount > 0 && (
          <>
            <span className="text-[#e5e5e5] dark:text-[#333]">|</span>
            <span>
              {taggedCount} {tLocal('taggedCount', lang)}
            </span>
          </>
        )}
        {activeTag && (
          <>
            <span className="text-[#e5e5e5] dark:text-[#333]">|</span>
            <span className="flex items-center gap-1 text-black dark:text-white">
              <Filter size={10} />
              {tLocal('filterActive', lang)}: <Hash size={8} />{activeTag}
            </span>
          </>
        )}
      </div>

      {/* ── Folder Management ─────────────────────────────────────────────── */}
      <FolderSidebar
        folders={folders}
        activeFolder={activeFolder}
        setActiveFolder={setActiveFolder}
        editingFolderId={editingFolderId}
        setEditingFolderId={setEditingFolderId}
        editingFolderName={editingFolderName}
        setEditingFolderName={setEditingFolderName}
        showNewFolderInput={showNewFolderInput}
        setShowNewFolderInput={setShowNewFolderInput}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        handleCreateFolder={handleCreateFolder}
        handleRenameFolder={handleRenameFolder}
        handleDeleteFolder={handleDeleteFolder}
        lang={lang}
      />

      {/* ── Tag Filter ────────────────────────────────────────────────────── */}
      <TagFilterBar
        allTags={allUniqueTags}
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        lang={lang}
      />

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {displayedArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111] border-2 border-[#e5e5e5] dark:border-[#222]">
          <BookmarkX size={36} className="text-gray-200 dark:text-[#333] mb-4" />
          <h3
            className="text-xl font-bold text-black dark:text-white mb-3"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {activeTag
              ? `No bookmarks tagged "${activeTag}"`
              : activeFolder
              ? tLocal('noBookmarksHere', lang)
              : tLocal('noBookmarksYet', lang)}
          </h3>
          <p className="text-sm text-gray-500 dark:text-[#999] italic max-w-sm mx-auto">
            {activeTag
              ? '"Add this tag to bookmarks to see them here."'
              : activeFolder
              ? `"${tLocal('moveHere', lang)}"`
              : `"${tLocal('startSaving', lang)}"`}
          </p>
        </div>
      ) : (
        <StaggerList className="grid gap-3 md:grid-cols-2">
          {displayedArticles.map((art) => {
            const artId = art._id || art.id;
            const sentimentBorderColor =
              art.sentiment === 'Positive'
                ? 'border-l-[#4ADE80]'
                : art.sentiment === 'Negative'
                ? 'border-l-[#FB7185]'
                : 'border-l-[#FBBF24]';
            const artTags = allTagsMap[artId] || [];

            return (
              <StaggerItem key={artId} className={`relative border-l-2 ${sentimentBorderColor}`}>
                <ArticleCard
                  article={art}
                  onPreview={handlePreview}
                  onBookmark={handleToggle}
                  isBookmarked={user?.bookmarks?.includes(artId)}
                />

                {/* Article tags display */}
                {artTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-3 pt-1 pb-1">
                    {artTags.map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] border transition-colors cursor-pointer ${
                          activeTag === tag
                            ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                            : 'border-[#e5e5e5] dark:border-[#333] text-gray-400 dark:text-[#666] hover:border-black dark:hover:border-white'
                        }`}
                        onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                      >
                        <Hash size={7} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons row */}
                <div className="flex items-center justify-between px-3 pb-2 pt-1">
                  {/* Tag management */}
                  <ArticleTagPanel
                    artId={artId}
                    allTagsMap={allTagsMap}
                    setAllTagsMap={setAllTagsMap}
                    lang={lang}
                  />

                  {/* Move-to-folder button */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMovingArticleId(movingArticleId === artId ? null : artId);
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-[0.18em] border border-[#e5e5e5] dark:border-[#333] text-gray-400 dark:text-[#666] hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors"
                    >
                      <Folder size={10} />
                      <span className="hidden sm:inline">{tLocal('move', lang)}</span>
                      <ChevronDown size={10} />
                    </button>

                    <AnimatePresence>
                      {movingArticleId === artId && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 bottom-full mb-1 w-44 bg-white dark:bg-[#111] border-2 border-[#e5e5e5] dark:border-[#222] z-20"
                        >
                          <button
                            onClick={() => handleMoveToFolder(artId, null)}
                            className="w-full text-left px-3 py-2 text-xs text-gray-500 dark:text-[#999] hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors"
                          >
                            {tLocal('noFolder', lang)}
                          </button>
                          {folders.map((f) => {
                            const fId = f._id || f.id;
                            return (
                              <button
                                key={fId}
                                onClick={() => handleMoveToFolder(artId, fId)}
                                className="w-full text-left px-3 py-2 text-xs text-black dark:text-white hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors flex items-center gap-2"
                              >
                                <Folder size={11} className="text-gray-400 dark:text-[#666]" />
                                {f.name}
                              </button>
                            );
                          })}
                          {folders.length === 0 && (
                            <div className="px-3 py-2 text-xs text-gray-400 dark:text-[#666]">
                              {tLocal('noFoldersYet', lang)}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}

      {/* ── Preview Modal ─────────────────────────────────────────────────── */}
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
