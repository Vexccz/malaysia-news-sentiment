import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Graph, Minimap } from '@antv/g6';
import { useTheme } from '../context/ThemeContext';
import { Search, List, Network, X, TrendingUp, BarChart3, FileText, Share2, PieChart } from 'lucide-react';
import { LineChart, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { GraphSkeleton, CardSkeleton } from '../components/Skeletons';
import { useLanguage } from '../context/LanguageContext';

const SENTIMENT_COLORS = { Positive: '#10B981', Negative: '#EF4444', Neutral: '#F59E0B' };
const SENTIMENT_GLOW = { Positive: 'rgba(16,185,129,0.4)', Negative: 'rgba(239,68,68,0.4)', Neutral: 'rgba(245,158,11,0.4)' };
const TYPE_LABELS = { politicians: 'Politicians', parties: 'Parties', organizations: 'Organizations', locations: 'Locations' };
const TYPE_COLORS = { politicians: '#6366f1', parties: '#8b5cf6', organizations: '#06b6d4', locations: '#f59e0b' };

// Sentiment edge color calculator
const getSentimentEdgeColor = (avgSentiment) => {
  if (avgSentiment <= -0.3) return '#EF4444'; // red for negative
  if (avgSentiment >= 0.3) return '#10B981'; // green for positive
  return '#6B7280'; // grey for neutral
};

// Convert sentiment label to numeric value
const sentimentToValue = (sentiment) => {
  if (sentiment === 'Positive') return 1;
  if (sentiment === 'Negative') return -1;
  return 0;
};

export default function EntityGraphPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [data, setData] = useState({ nodes: [], edges: [] });
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [graphRendering, setGraphRendering] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchHighlight, setSearchHighlight] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [entityTypeFilters, setEntityTypeFilters] = useState({
    politicians: true,
    parties: true,
    organizations: true,
    locations: true
  });
  const [timeframe, setTimeframe] = useState('');
  const [viewMode, setViewMode] = useState('graph');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [activeTab, setActiveTab] = useState('overview');
  const graphRef = useRef(null);
  const containerRef = useRef(null);
  const graphInstance = useRef(null);
  const layoutAnimationRef = useRef(null);
  const pulseIntervalRef = useRef(null);

  // Feature 3: Physics sliders state
  const [linkDistance, setLinkDistance] = useState(250);
  const [nodeStrength, setNodeStrength] = useState(2000);
  const [showPhysics, setShowPhysics] = useState(false);

  // Feature 5: Path highlight state
  const [pathMode, setPathMode] = useState(false);
  const [selectedPathNodes, setSelectedPathNodes] = useState([]);
  const [highlightedPath, setHighlightedPath] = useState(null);

  // Feature 6: Timeline animation state
  const [timelineValue, setTimelineValue] = useState(100);
  const [isAnimating, setIsAnimating] = useState(false);
  const timelineRef = useRef(null);

  // Feature 7: Expanded neighborhood tracking
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [graphDataExtra, setGraphDataExtra] = useState({ nodes: [], edges: [] });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    checkMobile();
    if (window.innerWidth <= 768) setViewMode('list');
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cleanup timeline animation on unmount
  useEffect(() => {
    return () => {
      if (timelineRef.current) cancelAnimationFrame(timelineRef.current);
    };
  }, []);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api/v1';
      const params = new URLSearchParams();
      if (search) params.set('query', search);
      if (timeframe) params.set('timeframe', timeframe);
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`${API}/entities/graph?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed');
      setData(await res.json());
    } catch { setData({ nodes: [], edges: [] }); }
    finally { setLoading(false); }
  }, [search, timeframe, typeFilter]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  const fetchDetail = async (name) => {
    setDetailLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api/v1';
      const res = await fetch(`${API}/entities/${encodeURIComponent(name)}`, { headers: { Authorization: `Bearer ${token}` } });
      setDetail(res.ok ? await res.json() : null);
    } catch { setDetail(null); }
    finally { setDetailLoading(false); }
  };

  const handleNodeClick = (name) => {
    if (pathMode) {
      // Feature 5: Path highlight - select nodes for path finding
      setSelectedPathNodes(prev => {
        if (prev.includes(name)) {
          return prev.filter(n => n !== name);
        }
        if (prev.length >= 2) return [name];
        const next = [...prev, name];
        if (next.length === 2) {
          // Find path between the two selected nodes
          const sourceId = data.nodes.find(n => n.label === next[0])?.id;
          const targetId = data.nodes.find(n => n.label === next[1])?.id;
          if (sourceId && targetId) {
            const path = findShortestPath(sourceId, targetId);
            setHighlightedPath(path);
          }
        }
        return next;
      });
      return;
    }
    if (selectedNode === name) { setSelectedNode(null); setDetail(null); }
    else { setSelectedNode(name); fetchDetail(name); }
  };

  // Feature 5: BFS shortest path algorithm
  const findShortestPath = useCallback((sourceId, targetId) => {
    const adjacency = new Map();
    data.edges.forEach(e => {
      if (!adjacency.has(e.source)) adjacency.set(e.source, []);
      if (!adjacency.has(e.target)) adjacency.set(e.target, []);
      adjacency.get(e.source).push(e.target);
      adjacency.get(e.target).push(e.source);
    });
    const visited = new Set();
    const queue = [[sourceId]];
    visited.add(sourceId);
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      if (current === targetId) return path;
      const neighbors = adjacency.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return null;
  }, [data]);

  // Feature 7: Expand neighborhood for a node
  const expandNeighborhood = useCallback((nodeId) => {
    if (expandedNodes.has(nodeId)) return;
    const connectedEdges = data.edges.filter(e => e.source === nodeId || e.target === nodeId);
    const connectedNodeIds = new Set();
    connectedEdges.forEach(e => {
      if (e.source !== nodeId) connectedNodeIds.add(e.source);
      if (e.target !== nodeId) connectedNodeIds.add(e.target);
    });
    // Find nodes that are 2 hops away (not direct neighbors, not already present)
    const directNeighbors = new Set([nodeId, ...connectedNodeIds]);
    const secondHopNodes = new Set();
    connectedNodeIds.forEach(nid => {
      data.edges.forEach(e => {
        const other = e.source === nid ? e.target : (e.target === nid ? e.source : null);
        if (other && !directNeighbors.has(other)) secondHopNodes.add(other);
      });
    });
    const newNodes = [...secondHopNodes].slice(0, 5).map(nid => {
      const orig = data.nodes.find(n => n.id === nid);
      if (!orig) return null;
      return { ...orig, _expanded: true };
    }).filter(Boolean);
    const newNodeIds = new Set(newNodes.map(n => n.id));
    const newEdges = data.edges.filter(e =>
      (e.source === nodeId && newNodeIds.has(e.target)) ||
      (e.target === nodeId && newNodeIds.has(e.source)) ||
      (newNodeIds.has(e.source) && directNeighbors.has(e.target)) ||
      (newNodeIds.has(e.target) && directNeighbors.has(e.source))
    ).slice(0, 8);
    setExpandedNodes(prev => new Set([...prev, nodeId]));
    setGraphDataExtra(prev => ({
      nodes: [...prev.nodes, ...newNodes.filter(n => !prev.nodes.find(p => p.id === n.id))],
      edges: [...prev.edges, ...newEdges.filter(e => !prev.edges.find(p => p.id === e.id))],
    }));
  }, [data, expandedNodes]);

  // Filter nodes based on entity type checkboxes and search highlight
  const getFilteredData = useCallback(() => {
    let filteredNodes = data.nodes.filter(node => {
      const categoryKey = node.category;
      return entityTypeFilters[categoryKey] !== false;
    });

    // Apply search highlight filter
    if (searchHighlight) {
      const searchLower = searchHighlight.toLowerCase();
      filteredNodes = filteredNodes.map(node => {
        const matches = node.label.toLowerCase().includes(searchLower);
        return { ...node, highlighted: matches };
      });
    } else {
      filteredNodes = filteredNodes.map(node => ({ ...node, highlighted: true }));
    }

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = data.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [data, entityTypeFilters, searchHighlight]);

  // Calculate edge sentiment colors based on connected nodes
  const calculateEdgeSentiments = useCallback((nodes, edges) => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    
    return edges.map(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      
      if (sourceNode && targetNode) {
        const sourceSentiment = sentimentToValue(sourceNode.sentiment);
        const targetSentiment = sentimentToValue(targetNode.sentiment);
        const avgSentiment = (sourceSentiment + targetSentiment) / 2;
        
        return { ...edge, avgSentiment };
      }
      return { ...edge, avgSentiment: 0 };
    });
  }, []);

  // Initialize/update G6 graph with performance optimizations
  useEffect(() => {
    if (loading || !data.nodes.length || !graphRef.current) return;
    if (isMobile && viewMode === 'list') {
      if (graphInstance.current) {
        graphInstance.current.destroy();
        graphInstance.current = null;
      }
      setGraphRendering(false);
      return;
    }

    setGraphRendering(true);

    if (graphInstance.current) {
      graphInstance.current.destroy();
      graphInstance.current = null;
    }

    const container = graphRef.current;
    const width = container.offsetWidth || 800;
    const height = container.offsetHeight || 600;

    const mobileGraphMode = isMobile && viewMode === 'graph';
    
    // Apply filters
    const filtered = getFilteredData();
    let graphNodes = filtered.nodes;
    let graphEdges = calculateEdgeSentiments(filtered.nodes, filtered.edges);

    // Feature 6: Timeline filtering - progressively reveal nodes
    if (timelineValue < 100) {
      const sortedByMentions = [...graphNodes].sort((a, b) => b.mentions - a.mentions);
      const cutoff = Math.max(2, Math.ceil(sortedByMentions.length * (timelineValue / 100)));
      const visibleIds = new Set(sortedByMentions.slice(0, cutoff).map(n => n.id));
      graphNodes = graphNodes.filter(n => visibleIds.has(n.id));
      graphEdges = graphEdges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));
    }

    // Feature 7: Merge expanded neighborhood nodes
    if (graphDataExtra.nodes.length > 0) {
      const existingIds = new Set(graphNodes.map(n => n.id));
      const extraNodes = graphDataExtra.nodes.filter(n => !existingIds.has(n.id));
      graphNodes = [...graphNodes, ...extraNodes];
      const allIds = new Set(graphNodes.map(n => n.id));
      const extraEdges = graphDataExtra.edges.filter(e => allIds.has(e.source) && allIds.has(e.target));
      const existingEdgeKeys = new Set(graphEdges.map(e => `${e.source}-${e.target}`));
      graphEdges = [...graphEdges, ...extraEdges.filter(e => !existingEdgeKeys.has(`${e.source}-${e.target}`))];
    }
    
    if (mobileGraphMode) {
      const sorted = [...graphNodes].sort((a, b) => b.mentions - a.mentions);
      graphNodes = sorted.slice(0, 15);
      const nodeIds = new Set(graphNodes.map(n => n.id));
      graphEdges = graphEdges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
    }

    const maxMentions = Math.max(...graphNodes.map(n => n.mentions), 1);
    const baseNodeSize = mobileGraphMode ? 20 : 28;
    const sizeRange = mobileGraphMode ? 20 : 52;

    const g6Data = {
      nodes: graphNodes.map(n => {
        const color = SENTIMENT_COLORS[n.sentiment] || SENTIMENT_COLORS.Neutral;
        const nodeSize = baseNodeSize + (n.mentions / maxMentions) * sizeRange;
        const isHighlighted = n.highlighted !== false;
        // Feature 5: Path highlight dimming
        const onPath = !highlightedPath || highlightedPath.includes(n.id);
        // Feature 7: Expanded nodes get a distinct border
        const isExpanded = n._expanded;
        return {
          id: n.id,
          label: n.label,
          data: { label: n.label, mentions: n.mentions, sentiment: n.sentiment, category: n.category },
          size: isExpanded ? nodeSize * 0.85 : nodeSize,
          style: {
            fill: color,
            stroke: isExpanded ? '#6366F1' : color,
            lineWidth: isExpanded ? 3.5 : 2.5,
            opacity: (isHighlighted && onPath) ? 1 : 0.08,
            lineDash: isExpanded ? [4, 2] : undefined,
          },
          labelCfg: {
            style: {
              fill: isDark ? '#f1f5f9' : '#0f172a',
              fontSize: mobileGraphMode ? 10 : 13,
              fontWeight: 600,
            },
            position: 'bottom',
            offset: 6,
          },
        };
      }),
      edges: graphEdges.map((e, i) => {
        const edgeColor = getSentimentEdgeColor(e.avgSentiment || 0);
        // Feature 5: Highlight edges on the path
        const isOnPath = highlightedPath && highlightedPath.includes(e.source) && highlightedPath.includes(e.target);
        const pathIdxSrc = highlightedPath ? highlightedPath.indexOf(e.source) : -1;
        const pathIdxTgt = highlightedPath ? highlightedPath.indexOf(e.target) : -1;
        const isPathEdge = isOnPath && Math.abs(pathIdxSrc - pathIdxTgt) === 1;
        return {
          id: `edge-${i}`,
          source: e.source,
          target: e.target,
          data: { weight: e.weight, avgSentiment: e.avgSentiment },
          style: {
            stroke: isPathEdge ? '#6366F1' : edgeColor,
            lineWidth: isPathEdge ? 5 : Math.min(5, 1.5 + e.weight * 0.6),
            strokeOpacity: (highlightedPath && !isPathEdge) ? 0.05 : 0.6,
            endArrow: isPathEdge ? { path: 'M 0,0 L 8,4 L 8,-4 Z', fill: '#6366F1' } : false,
          },
        };
      }),
    };

    const graph = new Graph({
      container,
      width,
      height,
      renderer: 'canvas',
      enableOptimize: true,
      optimizeZoom: 0.7,
      data: g6Data,
      layout: {
        type: 'force',
        preventOverlap: true,
        nodeSpacing: mobileGraphMode ? 100 : 120,
        linkDistance: mobileGraphMode ? 120 : linkDistance,
        nodeStrength: mobileGraphMode ? -800 : -nodeStrength,
        edgeStrength: 0.25,
        collideStrength: 1,
        alphaDecay: 0.015,
        alphaMin: 0.001,
      },
      modes: {
        default: [
          'drag-canvas',
          'zoom-canvas',
          'drag-node',
          ['hover-activate', { degree: 1, trigger: 'mouseenter' }],
        ],
      },
      plugins: [
        new Minimap({
          size: [150, 100],
          className: 'g6-minimap',
        }),
      ],
      node: {
        style: { cursor: 'pointer' },
        state: {
          active: { lineWidth: 5, fillOpacity: 1, shadowBlur: 30, shadowColor: 'rgba(99,102,241,0.5)' },
          inactive: { fillOpacity: 0.06, strokeOpacity: 0.15, labelOpacity: 0.15, shadowBlur: 0 },
          selected: { lineWidth: 5, stroke: '#6366F1', shadowBlur: 24, shadowColor: 'rgba(99,102,241,0.6)' },
        },
      },
      edge: {
        state: {
          active: { stroke: '#6366F1', lineWidth: 3.5, strokeOpacity: 0.9 },
          inactive: { strokeOpacity: 0.06 },
        },
      },
      animation: true,
      autoFit: 'view',
      padding: 60,
    });

    graph.on('node:click', (evt) => {
      const nodeId = evt.item?._cfg?.id;
      const node = data.nodes.find(n => n.id === nodeId);
      if (node) handleNodeClick(node.label);
    });

    // Feature 7: Double-click to expand neighborhood
    graph.on('node:dblclick', (evt) => {
      const nodeId = evt.item?._cfg?.id;
      if (nodeId) expandNeighborhood(nodeId);
    });

    // Feature 4: Pulse animation on hover - gentle size pulse
    graph.on('node:mouseenter', (evt) => {
      const item = evt.item;
      if (!item) return;
      const originalSize = item.getModel().size;
      let growing = true;
      let currentSize = originalSize;
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = setInterval(() => {
        if (!graphInstance.current || !item.destroyed === false) {
          clearInterval(pulseIntervalRef.current);
          return;
        }
        if (growing) {
          currentSize += 1.2;
          if (currentSize >= originalSize * 1.25) growing = false;
        } else {
          currentSize -= 1.2;
          if (currentSize <= originalSize) growing = true;
        }
        try { graphInstance.current.updateItem(item, { size: currentSize }); } catch { /* item may be removed */ }
      }, 50);
    });
    graph.on('node:mouseleave', () => {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
        pulseIntervalRef.current = null;
      }
      // Reset all node sizes
      try {
        const nodes = graphInstance.current?.getNodes();
        if (nodes) {
          nodes.forEach(n => {
            const model = n.getModel();
            if (model.size !== model.data?._originalSize) {
              // Size was pulsed, but we'll just let the next render reset it
            }
          });
        }
      } catch { /* ignore */ }
    });

    setGraphRendering(true);
    graph.render();
    graph.on('afterlayout', () => setGraphRendering(false));
    setTimeout(() => setGraphRendering(false), 3000); // Fallback
    graphInstance.current = graph;

    // Set timeout fallback in case layout event doesn't fire
    const timeout = setTimeout(() => {
      setGraphRendering(false);
    }, 3000);

    return () => {
      clearTimeout(timeout);
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
      if (graphInstance.current) {
        graphInstance.current.destroy();
        graphInstance.current = null;
      }
    };
  }, [data, loading, isDark, viewMode, isMobile, getFilteredData, calculateEdgeSentiments, linkDistance, nodeStrength, highlightedPath, timelineValue, graphDataExtra, pathMode]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (graphInstance.current && graphRef.current) {
        const w = graphRef.current.offsetWidth;
        const h = graphRef.current.offsetHeight;
        graphInstance.current.resize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col h-full">
      {/* Minimap & Range Slider Styles */}
      <style>{`
        .g6-minimap {
          position: absolute !important;
          bottom: 12px !important;
          right: 12px !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          border: 1px solid ${isDark ? '#2a2a2a' : '#eee'} !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15) !important;
          z-index: 10 !important;
        }
        .g6-minimap-viewport {
          border: 2px solid #6366F1 !important;
          border-radius: 4px !important;
        }
        input[type="range"] {
          -webkit-appearance: none;
          height: 6px;
          border-radius: 3px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
        input[type="range"].accent-purple-500::-webkit-slider-thumb { background: #a855f7; }
        input[type="range"].accent-cyan-500::-webkit-slider-thumb { background: #06b6d4; }
      `}</style>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-baseline gap-3 mb-1">
          <h1 className="text-3xl font-bold text-ink dark:text-paper tracking-tight font-display flex items-center gap-2">
            <Network size={24} className="text-blue-600" />
            Entity Graph
          </h1>
        </div>
        <p className="text-xs text-ink-muted dark:text-ink-faint tracking-wide uppercase font-sans">
          Explore relationships between entities in the news
        </p>
        <div className="editorial-rule mb-3"></div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
        {/* Search */}
        <div className="relative w-full sm:w-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="pl-8 pr-3 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors w-full sm:w-52 text-gray-900 dark:text-white placeholder:text-gray-400"
            placeholder={t('searchEntities')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchGraph()}
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-1 bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm p-0.5">
          {['', 'politicians', 'parties', 'organizations', 'locations'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                typeFilter === t
                  ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t ? TYPE_LABELS[t] : 'All'}
            </button>
          ))}
        </div>

        {/* Time Filter */}
        <div className="flex gap-1 bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm p-0.5">
          {[{ k: '', l: 'All Time' }, { k: '24h', l: '24H' }, { k: '7d', l: '7D' }, { k: '30d', l: '30D' }].map(o => (
            <button
              key={o.k}
              onClick={() => setTimeframe(o.k)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                timeframe === o.k
                  ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>

        {/* Stats */}
        {!loading && data.nodes.length > 0 && (
          <div className="ml-auto flex gap-4 items-center text-[11px] font-medium text-gray-500 dark:text-gray-400">
            <span>{data.nodes.length} entities</span>
            <span>{data.edges.length} connections</span>
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-3 text-[11px] text-gray-500 dark:text-gray-400">
          {Object.entries(SENTIMENT_COLORS).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: v }} />{k}
            </span>
          ))}
        </div>

        {/* Mobile View Toggle */}
        {isMobile && data.nodes.length > 0 && (
          <div className="flex gap-1 bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-lg p-0.5">
            <button
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600' : 'text-gray-400'}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={16} />
            </button>
            <button
              className={`p-1.5 rounded-md transition-all ${viewMode === 'graph' ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600' : 'text-gray-400'}`}
              onClick={() => setViewMode('graph')}
              title="Graph View"
            >
              <Network size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Feature Controls Row */}
      {!loading && data.nodes.length > 0 && !isMobile && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Feature 3: Physics Controls Toggle */}
          <button
            onClick={() => setShowPhysics(!showPhysics)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
              showPhysics
                ? 'bg-purple-50 dark:bg-purple-500/15 text-purple-600 border-purple-200 dark:border-purple-500/30'
                : 'bg-white dark:bg-[#1a1a1a] text-gray-500 dark:text-gray-400 border-[#eee] dark:border-[#2a2a2a] hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-1"><BarChart3 size={12} /> Physics</span>
          </button>

          {/* Feature 5: Path Mode Toggle */}
          <button
            onClick={() => { setPathMode(!pathMode); setSelectedPathNodes([]); setHighlightedPath(null); }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
              pathMode
                ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 border-indigo-200 dark:border-indigo-500/30'
                : 'bg-white dark:bg-[#1a1a1a] text-gray-500 dark:text-gray-400 border-[#eee] dark:border-[#2a2a2a] hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-1"><Share2 size={12} /> Path Mode {pathMode ? 'ON' : ''}</span>
          </button>

          {/* Feature 5: Path info */}
          {pathMode && (
            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
              {selectedPathNodes.length === 0 && 'Click first node...'}
              {selectedPathNodes.length === 1 && `Selected: ${selectedPathNodes[0]} → Click second node`}
              {selectedPathNodes.length === 2 && `Path: ${selectedPathNodes[0]} ↔ ${selectedPathNodes[1]}${highlightedPath ? ` (${highlightedPath.length} nodes)` : ' (no path found)'}`}
            </span>
          )}
          {highlightedPath && (
            <button
              onClick={() => { setSelectedPathNodes([]); setHighlightedPath(null); }}
              className="px-2 py-1 rounded-md text-[10px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              Clear Path
            </button>
          )}

          {/* Feature 6: Timeline Toggle */}
          <button
            onClick={() => { if (timelineValue === 100) setTimelineValue(0); else setTimelineValue(100); }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
              timelineValue < 100
                ? 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 border-cyan-200 dark:border-cyan-500/30'
                : 'bg-white dark:bg-[#1a1a1a] text-gray-500 dark:text-gray-400 border-[#eee] dark:border-[#2a2a2a] hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-1"><TrendingUp size={12} /> Timeline</span>
          </button>

          {/* Feature 7: Expand hint */}
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
            Double-click a node to expand its neighborhood
          </span>
        </div>
      )}

      {/* Feature 3: Physics Sliders Panel */}
      {showPhysics && !isMobile && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="flex flex-wrap items-center gap-4 mb-3 px-4 py-2.5 bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm"
        >
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Link Distance</label>
            <input
              type="range"
              min={50}
              max={500}
              value={linkDistance}
              onChange={e => setLinkDistance(Number(e.target.value))}
              className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 w-8 text-right">{linkDistance}</span>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Repulsion</label>
            <input
              type="range"
              min={200}
              max={5000}
              value={nodeStrength}
              onChange={e => setNodeStrength(Number(e.target.value))}
              className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 w-10 text-right">{nodeStrength}</span>
          </div>
          <button
            onClick={() => { setLinkDistance(250); setNodeStrength(2000); }}
            className="px-2 py-1 rounded-md text-[10px] font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            Reset
          </button>
        </motion.div>
      )}

      {/* Feature 6: Timeline Slider */}
      {timelineValue < 100 && !isMobile && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm"
        >
          <TrendingUp size={14} className="text-cyan-500 flex-shrink-0" />
          <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Reveal Progress</label>
          <input
            type="range"
            min={5}
            max={100}
            value={timelineValue}
            onChange={e => setTimelineValue(Number(e.target.value))}
            className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
          />
          <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 w-10 text-right">{timelineValue}%</span>
          <button
            onClick={() => {
              setIsAnimating(true);
              let v = 5;
              let last = performance.now();
              const step = (now) => {
                if (now - last >= 120) {
                  v += 1;
                  last = now;
                  if (v > 100) { setTimelineValue(100); setIsAnimating(false); return; }
                  setTimelineValue(v);
                }
                timelineRef.current = requestAnimationFrame(step);
              };
              timelineRef.current = requestAnimationFrame(step);
            }}
            disabled={isAnimating}
            className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
          >
            {isAnimating ? '...' : '▶ Animate'}
          </button>
          <button
            onClick={() => { if (timelineRef.current) cancelAnimationFrame(timelineRef.current); setTimelineValue(100); setIsAnimating(false); }}
            className="px-2 py-1 rounded-md text-[10px] font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            Reset
          </button>
        </motion.div>
      )}

      {/* Graph + Sidebar Container */}
      <div className="flex-1 flex flex-col md:flex-row rounded-sm overflow-hidden border border-[#eee] dark:border-[#2a2a2a] bg-[#fafaf9] dark:bg-[#0f0f0f] relative min-h-[300px] md:min-h-[400px]">
        {/* Background fill */}
        {isDark && <div className="absolute inset-0 pointer-events-none z-0 bg-[#0f0f0f]" />}

        {/* Mobile List View */}
        {isMobile && viewMode === 'list' && !loading && data.nodes.length > 0 && (
          <div className="w-full overflow-y-auto p-3 space-y-2">
            {[...data.nodes]
              .sort((a, b) => b.mentions - a.mentions)
              .slice(0, 20)
              .map(node => {
                const connectedCount = data.edges.filter(e => e.source === node.id || e.target === node.id).length;
                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm p-3 cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors"
                    onClick={() => handleNodeClick(node.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{node.label}</span>
                        <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `${TYPE_COLORS[node.category] || '#6366f1'}15`, color: TYPE_COLORS[node.category] || '#6366f1' }}>
                          {TYPE_LABELS[node.category] || node.category}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{node.mentions}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: SENTIMENT_COLORS[node.sentiment] || SENTIMENT_COLORS.Neutral }} />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">{node.sentiment}</span>
                      </div>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{connectedCount} connection{connectedCount !== 1 ? 's' : ''}</span>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}

        {/* Graph View */}
        {(!isMobile || viewMode === 'graph') && (
          <div ref={graphRef} className="flex-1 relative z-[1]" style={{ minHeight: isMobile ? 350 : 550 }}>
            {(loading || graphRendering) && (
              <div className="flex items-center justify-center h-full p-6">
                <GraphSkeleton />
              </div>
            )}
            {!loading && !graphRendering && !data.nodes.length && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 gap-4">
                <Network size={56} strokeWidth={1.2} className="opacity-30" />
                <p className="text-sm font-medium">No entity data yet</p>
                <p className="text-xs opacity-70">Analyze some articles to see the relationship graph</p>
              </div>
            )}
          </div>
        )}

        {/* Loading state for list view */}
        {isMobile && viewMode === 'list' && loading && (
          <div className="p-4">
            <CardSkeleton count={3} />
          </div>
        )}

        {/* Detail Sidebar */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: isMobile ? '100%' : 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="border-l border-[#eee] dark:border-[#2a2a2a] bg-white dark:bg-[#111] overflow-y-auto overflow-x-hidden z-[2] p-5"
            >
              {/* Close button */}
              <button
                onClick={() => { setSelectedNode(null); setDetail(null); }}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
              >
                <X size={16} />
              </button>

              {detailLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : detail ? (
                <div className="space-y-5">
                  {/* Header */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{detail.name}</h3>
                    </div>
                    <span className="inline-block mt-2 text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded capitalize">{detail.category}</span>
                  </div>

                  {/* Mentions count */}
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {detail.totalMentions} <span className="text-xs font-medium text-gray-500">mentions</span>
                  </div>

                  {/* Sentiment bars */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-gray-900 dark:text-white">Sentiment Distribution</div>
                    {Object.entries(detail.sentimentBreakdown || {}).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-[10px] w-14 text-gray-500 font-medium">{k}</span>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${detail.totalMentions ? (v / detail.totalMentions * 100) : 0}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: SENTIMENT_COLORS[k] }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-gray-900 dark:text-white w-6 text-right">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Connected Entities */}
                  {detail.connectedEntities?.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold text-gray-900 dark:text-white mb-2">Connected Entities</div>
                      <div className="space-y-1">
                        {detail.connectedEntities.slice(0, 8).map(c => (
                          <div key={c.name} className="flex justify-between py-1.5 text-[11px] border-b border-[#eee] dark:border-[#2a2a2a] last:border-0">
                            <span className="text-blue-600 cursor-pointer hover:underline" onClick={() => handleNodeClick(c.name)}>{c.name}</span>
                            <span className="text-gray-400">{c.coOccurrences}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Articles */}
                  {detail.articles?.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold text-gray-900 dark:text-white mb-2">Recent Articles</div>
                      <div className="space-y-2">
                        {detail.articles.slice(0, 8).map((a, i) => (
                          <div key={i} className="py-2 border-b border-[#eee] dark:border-[#2a2a2a] last:border-0">
                            <div className="text-[11px] font-medium text-gray-900 dark:text-white leading-snug">{a.title?.slice(0, 60)}{a.title?.length > 60 ? '...' : ''}</div>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[10px] font-semibold" style={{ color: SENTIMENT_COLORS[a.sentiment] }}>{a.sentiment}</span>
                              <span className="text-[10px] text-gray-400">{a.source}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trend */}
                  {detail.trend?.length > 1 && (
                    <div>
                      <div className="text-[11px] font-semibold text-gray-900 dark:text-white mb-2">Trend</div>
                      <div className="flex items-end gap-0.5 h-12">
                        {detail.trend.slice(-14).map((d, i) => {
                          const total = d.Positive + d.Negative + d.Neutral;
                          return (
                            <div key={i} className="flex-1 flex flex-col gap-px h-full justify-end">
                              <div className="rounded-sm" style={{ background: SENTIMENT_COLORS.Positive, height: `${total ? (d.Positive / total * 100) : 0}%`, minHeight: d.Positive ? 2 : 0 }} />
                              <div className="rounded-sm" style={{ background: SENTIMENT_COLORS.Neutral, height: `${total ? (d.Neutral / total * 100) : 0}%`, minHeight: d.Neutral ? 2 : 0 }} />
                              <div className="rounded-sm" style={{ background: SENTIMENT_COLORS.Negative, height: `${total ? (d.Negative / total * 100) : 0}%`, minHeight: d.Negative ? 2 : 0 }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : <div className="text-gray-500 text-sm">No data</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
