import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

// Simplified Malaysia state SVG paths (approximate boundaries)
const STATE_PATHS = {
  'Perlis': 'M 95 30 L 105 25 L 115 30 L 110 40 L 100 42 Z',
  'Kedah': 'M 85 42 L 115 35 L 125 50 L 130 70 L 115 80 L 95 75 L 80 60 Z',
  'Pulau Pinang': 'M 80 80 L 95 75 L 100 85 L 90 92 L 78 88 Z',
  'Perak': 'M 100 80 L 130 70 L 155 85 L 160 110 L 150 130 L 125 135 L 110 120 L 95 100 Z',
  'Kelantan': 'M 155 30 L 185 25 L 200 40 L 195 65 L 175 75 L 155 70 L 145 50 Z',
  'Terengganu': 'M 175 75 L 200 65 L 210 90 L 205 120 L 190 130 L 170 110 L 165 85 Z',
  'Pahang': 'M 150 100 L 170 90 L 190 110 L 200 140 L 190 170 L 165 175 L 145 160 L 140 130 Z',
  'Selangor': 'M 110 130 L 140 125 L 145 155 L 135 170 L 115 168 L 105 150 Z',
  'Kuala Lumpur': 'M 122 145 L 132 143 L 134 153 L 125 155 Z',
  'Putrajaya': 'M 130 158 L 138 156 L 140 163 L 132 164 Z',
  'Negeri Sembilan': 'M 115 170 L 140 165 L 150 180 L 140 195 L 120 192 L 110 180 Z',
  'Melaka': 'M 115 195 L 135 192 L 140 205 L 125 210 L 112 205 Z',
  'Johor': 'M 120 200 L 150 190 L 175 195 L 185 215 L 175 235 L 145 240 L 120 230 L 115 210 Z',
  'Sabah': 'M 320 30 L 380 20 L 400 35 L 395 65 L 375 80 L 345 75 L 325 60 L 315 45 Z',
  'Sarawak': 'M 250 55 L 320 40 L 345 60 L 350 85 L 330 100 L 290 105 L 260 95 L 245 75 Z',
  'Labuan': 'M 310 42 L 318 40 L 320 47 L 313 48 Z',
};

const getSentimentColor = (value, isDark) => {
  if (value > 0.3) return isDark ? '#22c55e' : '#16a34a';
  if (value > 0.1) return isDark ? '#4ade80' : '#22c55e';
  if (value > -0.1) return isDark ? '#eab308' : '#ca8a04';
  if (value > -0.3) return isDark ? '#f97316' : '#ea580c';
  return isDark ? '#ef4444' : '#dc2626';
};

const Heatmap = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [days, setDays] = useState(7);
  const [hoveredState, setHoveredState] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0, visible: false });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState(0);
  const svgRef = useRef(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const res = await api.get(`/news/heatmap?days=${days}`);
      setData(res.data);
    } catch (err) {
      console.error('Heatmap fetch error:', err);
    } finally {
      setDataLoading(false);
      setLoading(false);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.3, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.3, 0.5));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse drag for panning
  const handleMouseDown = (e) => {
    if (e.target.tagName !== 'path') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    if (hoveredState) {
      setTooltip({ x: e.clientX, y: e.clientY, visible: true });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch gestures for mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchDistance(distance);
    } else if (e.touches.length === 1 && e.target.tagName !== 'path') {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchDistance > 0) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = distance - touchDistance;
      setZoom(prev => Math.max(0.5, Math.min(3, prev + delta * 0.005)));
      setTouchDistance(distance);
    } else if (e.touches.length === 1 && isDragging) {
      setPan({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchDistance(0);
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.cursor = 'default';
    }
  }, [isDragging]);

  const getStateData = (stateName) => data.find(d => d.state === stateName) || { avgSentiment: 0, articleCount: 0, topTopic: 'N/A' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sentiment Heatmap</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Geographic sentiment distribution across Malaysia</p>
        </div>

        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="px-3 py-2 rounded-xl border border-[#eee] dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-2xl p-6 relative overflow-hidden"
      >
        {loading ? (
          <div className="space-y-4 p-6">
            <div className="h-64 bg-[#f0f0f0] dark:bg-[#2a2a2a] rounded-xl animate-pulse" />
            <div className="flex justify-center gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 w-16 bg-[#f0f0f0] dark:bg-[#2a2a2a] rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Zoom controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <button
                onClick={handleZoomIn}
                className="w-9 h-9 rounded-lg bg-white dark:bg-[#222] border border-[#eee] dark:border-[#333] shadow-md hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors flex items-center justify-center"
                title="Zoom in"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700 dark:text-gray-300">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
              <button
                onClick={handleZoomOut}
                className="w-9 h-9 rounded-lg bg-white dark:bg-[#222] border border-[#eee] dark:border-[#333] shadow-md hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors flex items-center justify-center"
                title="Zoom out"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700 dark:text-gray-300">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
              <button
                onClick={handleResetView}
                className="w-9 h-9 rounded-lg bg-white dark:bg-[#222] border border-[#eee] dark:border-[#333] shadow-md hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors flex items-center justify-center"
                title="Reset view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700 dark:text-gray-300">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                </svg>
              </button>
            </div>

            {/* Data loading indicator */}
            {dataLoading && (
              <div className="absolute top-4 left-4 z-10 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Updating...</span>
              </div>
            )}

            <div 
              className="relative select-none"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
            >
              <svg 
                ref={svgRef}
                viewBox="0 0 430 260" 
                className="w-full h-auto max-h-[500px]"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                }}
              >
              {/* Background */}
              <rect width="430" height="260" fill="transparent" />

              {/* State paths */}
              {Object.entries(STATE_PATHS).map(([state, path]) => {
                const stateData = getStateData(state);
                const color = stateData.articleCount > 0
                  ? getSentimentColor(stateData.avgSentiment, isDark)
                  : (isDark ? '#333' : '#e5e7eb');

                return (
                  <path
                    key={state}
                    d={path}
                    fill={color}
                    stroke={hoveredState === state ? '#2563eb' : (isDark ? '#555' : '#999')}
                    strokeWidth={hoveredState === state ? 2 : 0.8}
                    className="cursor-pointer transition-all duration-200"
                    style={{ opacity: hoveredState && hoveredState !== state ? 0.5 : 1 }}
                    onMouseEnter={() => setHoveredState(state)}
                    onMouseLeave={() => setHoveredState(null)}
                    onClick={() => setSelectedState(state === selectedState ? null : state)}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setHoveredState(state);
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      setSelectedState(state === selectedState ? null : state);
                      setTimeout(() => setHoveredState(null), 2000);
                    }}
                  />
                );
              })}

              {/* State labels */}
              {Object.entries(STATE_PATHS).map(([state, path]) => {
                // Calculate centroid from path (simplified)
                const nums = path.match(/\d+/g).map(Number);
                const xs = nums.filter((_, i) => i % 2 === 0);
                const ys = nums.filter((_, i) => i % 2 === 1);
                const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
                const cy = ys.reduce((a, b) => a + b, 0) / ys.length;

                if (['Labuan', 'Putrajaya', 'Kuala Lumpur'].includes(state)) return null;

                return (
                  <text
                    key={`label-${state}`}
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    fontSize="6"
                    fill={isDark ? '#ccc' : '#333'}
                    className="pointer-events-none select-none"
                    fontWeight="500"
                  >
                    {state.length > 10 ? state.slice(0, 8) + '.' : state}
                  </text>
                );
              })}
            </svg>

            {/* Tooltip */}
            <AnimatePresence>
              {hoveredState && tooltip.visible && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="fixed z-50 pointer-events-none bg-white dark:bg-[#222] border border-[#eee] dark:border-[#333] rounded-xl p-3 shadow-xl"
                  style={{ left: tooltip.x + 15, top: tooltip.y - 10 }}
                >
                  {(() => {
                    const sd = getStateData(hoveredState);
                    const sentimentColor = sd.avgSentiment > 0.1 ? 'text-green-600 dark:text-green-400' : 
                                          sd.avgSentiment < -0.1 ? 'text-red-600 dark:text-red-400' : 
                                          'text-yellow-600 dark:text-yellow-400';
                    return (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{hoveredState}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 dark:text-gray-400">Sentiment:</span>
                          <span className={`font-semibold ${sentimentColor}`}>
                            {sd.avgSentiment > 0 ? '+' : ''}{sd.avgSentiment.toFixed(3)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 dark:text-gray-400">Articles:</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{sd.articleCount}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 dark:text-gray-400">Topic:</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{sd.topTopic}</span>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
        )}

        {/* Enhanced Legend with sentiment ranges */}
        <div className="mt-6 pt-4 border-t border-[#eee] dark:border-[#2a2a2a]">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 text-center">Sentiment Scale</p>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-sm bg-[#22c55e] dark:bg-[#22c55e]" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Very Positive (+0.3)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-sm bg-[#4ade80] dark:bg-[#4ade80]" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Positive (+0.1)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-sm bg-[#eab308] dark:bg-[#eab308]" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Neutral (±0.1)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-sm bg-[#f97316] dark:bg-[#f97316]" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Negative (-0.1)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-sm bg-[#ef4444] dark:bg-[#ef4444]" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Very Negative (-0.3)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-sm bg-[#e5e7eb] dark:bg-[#333]" />
              <span className="text-xs text-gray-600 dark:text-gray-400">No data</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3">
            Pinch to zoom • Drag to pan • Click state for details
          </p>
        </div>
      </motion.div>

      {/* Selected state detail */}
      <AnimatePresence>
        {selectedState && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-2xl p-6"
          >
            {(() => {
              const sd = getStateData(selectedState);
              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedState}</h2>
                    <button
                      onClick={() => setSelectedState(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-[#111]">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{sd.articleCount}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Articles</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-[#111]">
                      <p className={`text-2xl font-bold ${sd.avgSentiment > 0 ? 'text-green-500' : sd.avgSentiment < 0 ? 'text-red-500' : 'text-yellow-500'}`}>
                        {sd.avgSentiment > 0 ? '+' : ''}{sd.avgSentiment.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Avg Sentiment</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-[#111]">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{sd.topTopic}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Top Topic</p>
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* State summary table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-2xl p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">State Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#eee] dark:border-[#2a2a2a]">
                <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">State</th>
                <th className="text-center py-2 text-gray-500 dark:text-gray-400 font-medium">Articles</th>
                <th className="text-center py-2 text-gray-500 dark:text-gray-400 font-medium">Sentiment</th>
                <th className="text-center py-2 text-gray-500 dark:text-gray-400 font-medium">Top Topic</th>
              </tr>
            </thead>
            <tbody>
              {data
                .filter(d => d.articleCount > 0)
                .sort((a, b) => b.articleCount - a.articleCount)
                .map((d, i) => (
                  <motion.tr
                    key={d.state}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ x: 3 }}
                    className="border-b border-[#eee] dark:border-[#2a2a2a] last:border-0 hover:bg-gray-50 dark:hover:bg-[#111] cursor-pointer transition-colors"
                    onClick={() => setSelectedState(d.state)}
                  >
                    <td className="py-2.5 text-gray-900 dark:text-white font-medium">{d.state}</td>
                    <td className="py-2.5 text-center text-gray-600 dark:text-gray-300">{d.articleCount}</td>
                    <td className="py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        d.avgSentiment > 0.1 ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                        d.avgSentiment < -0.1 ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                      }`}>
                        {d.avgSentiment > 0 ? '+' : ''}{d.avgSentiment.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2.5 text-center text-gray-600 dark:text-gray-300 capitalize">{d.topTopic}</td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
          {data.filter(d => d.articleCount > 0).length === 0 && !loading && (
            <p className="text-center text-sm text-gray-400 py-8">No geographic data available for this period</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Heatmap;
