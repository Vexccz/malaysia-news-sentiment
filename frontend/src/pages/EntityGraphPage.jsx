import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Graph } from '@antv/g6';
import { useTheme } from '../context/ThemeContext';
import { Search, List, Network, X, TrendingUp, BarChart3, FileText, Share2, PieChart } from 'lucide-react';
import { LineChart, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

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
    if (selectedNode === name) { setSelectedNode(null); setDetail(null); }
    else { setSelectedNode(name); fetchDetail(name); }
  };

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
        return {
          id: n.id,
          label: n.label,
          data: { label: n.label, mentions: n.mentions, sentiment: n.sentiment, category: n.category },
          size: nodeSize,
          style: {
            fill: color,
            stroke: color,
            lineWidth: 2.5,
            opacity: isHighlighted ? 1 : 0.3,
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
        return {
          id: `edge-${i}`,
          source: e.source,
          target: e.target,
          data: { weight: e.weight, avgSentiment: e.avgSentiment },
          style: {
            stroke: edgeColor,
            lineWidth: Math.min(5, 1.5 + e.weight * 0.6),
            strokeOpacity: 0.6,
            endArrow: false,
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
        linkDistance: mobileGraphMode ? 120 : 250,
        nodeStrength: mobileGraphMode ? -800 : -2000,
        edgeStrength: 0.25,
        collideStrength: 1,
        alphaDecay: 0.015,
        alphaMin: 0.001,
      },
      modes: {
        default: ['drag-canvas', 'zoom-canvas', 'drag-node'],
      },
      node: {
        style: { cursor: 'pointer' },
        state: {
          active: { lineWidth: 4, fillOpacity: 0.6, shadowBlur: 24 },
          inactive: { fillOpacity: 0.08, strokeOpacity: 0.2, labelOpacity: 0.25, shadowBlur: 0 },
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
      if (graphInstance.current) {
        graphInstance.current.destroy();
        graphInstance.current = null;
      }
    };
  }, [data, loading, isDark, viewMode, isMobile, getFilteredData, calculateEdgeSentiments]);

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
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="pl-8 pr-3 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors w-52 text-gray-900 dark:text-white placeholder:text-gray-400"
            placeholder="Search entities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchGraph()}
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-1 bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-xl p-0.5">
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
        <div className="flex gap-1 bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-xl p-0.5">
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
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: v, boxShadow: `0 0 6px ${v}` }} />{k}
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

      {/* Graph + Sidebar Container */}
      <div className="flex-1 flex rounded-2xl overflow-hidden border border-[#eee] dark:border-[#2a2a2a] bg-[#fafaf9] dark:bg-[#0f0f0f] relative min-h-[400px]">
        {/* Background gradient */}
        {isDark && <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(ellipse at 30% 40%, rgba(99,102,241,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(16,185,129,0.04) 0%, transparent 50%)' }} />}

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
                    className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-xl p-3 cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors"
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
                        <span className="w-2 h-2 rounded-full" style={{ background: SENTIMENT_COLORS[node.sentiment] || SENTIMENT_COLORS.Neutral, boxShadow: `0 0 6px ${SENTIMENT_COLORS[node.sentiment] || SENTIMENT_COLORS.Neutral}` }} />
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
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 gap-3">
                <div className="w-10 h-10 border-3 border-blue-100 dark:border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-sm">{loading ? 'Loading entity data...' : 'Rendering graph layout...'}</span>
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
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] w-full text-gray-500 dark:text-gray-400 gap-3">
            <div className="w-10 h-10 border-3 border-blue-100 dark:border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-sm">Loading entities...</span>
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
              className="border-l border-[#eee] dark:border-[#2a2a2a] bg-white/97 dark:bg-[#111]/97 backdrop-blur-xl overflow-y-auto overflow-x-hidden z-[2] p-5"
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
                            style={{ background: SENTIMENT_COLORS[k], boxShadow: `0 0 8px ${SENTIMENT_GLOW[k]}` }}
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
