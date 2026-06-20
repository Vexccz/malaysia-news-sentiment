import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

// Malaysia GeoJSON from public source
const GEOJSON_URL = 'https://raw.githubusercontent.com/dosm-malaysia/data-open/main/datasets/geodata/administrative_1_state.geojson';

// Fallback: simplified state name mapping (GeoJSON name → backend name)
const STATE_NAME_MAP = {
  'Johor': 'Johor',
  'Kedah': 'Kedah',
  'Kelantan': 'Kelantan',
  'Melaka': 'Melaka',
  'Negeri Sembilan': 'Negeri Sembilan',
  'Pahang': 'Pahang',
  'Perak': 'Perak',
  'Perlis': 'Perlis',
  'Pulau Pinang': 'Pulau Pinang',
  'Sabah': 'Sabah',
  'Sarawak': 'Sarawak',
  'Selangor': 'Selangor',
  'Terengganu': 'Terengganu',
  'W.P. Kuala Lumpur': 'Kuala Lumpur',
  'W.P. Putrajaya': 'Putrajaya',
  'W.P. Labuan': 'Labuan',
};

const getSentimentColor = (val) => {
  if (val === null || val === undefined) return '#6b7280';
  if (val > 0.3) return '#16a34a';
  if (val > 0.1) return '#22c55e';
  if (val > -0.1) return '#eab308';
  if (val > -0.3) return '#f97316';
  return '#ef4444';
};

const getSentimentLabel = (val) => {
  if (val === null || val === undefined) return 'No data';
  if (val > 0.1) return 'Positive';
  if (val > -0.1) return 'Neutral';
  return 'Negative';
};

const Heatmap = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [selectedState, setSelectedState] = useState(null);
  const [geoError, setGeoError] = useState(false);
  const [geoLoaded, setGeoLoaded] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const hoveredIdRef = useRef(null);
  const dataRef = useRef([]);
  const geojsonRef = useRef(null);

  // Fetch sentiment data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/news/heatmap?days=${days}`);
        setData(res.data);
        dataRef.current = res.data;
      } catch (err) {
        console.error('Heatmap fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [days]);

  // Build state data lookup
  const getStateData = useCallback((stateName) => {
    return data.find(d => d.state === stateName) || { avgSentiment: null, articleCount: 0, topTopic: 'N/A' };
  }, [data]);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: isDark
        ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
        : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [109.5, 4.0],
      zoom: 5.2,
      minZoom: 4,
      maxZoom: 10,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    mapRef.current = map;
    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'sentiment-popup',
    });

    map.on('load', () => {
      loadGeoJSON(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch map style on theme change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;

    const newStyle = isDark
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    map.once('style.load', () => {
      loadGeoJSON(map);
    });
    map.setStyle(newStyle);
  }, [isDark]);

  // Load GeoJSON and add layers
  const loadGeoJSON = async (map) => {
    try {
      const res = await fetch(GEOJSON_URL);
      if (!res.ok) throw new Error('GeoJSON fetch failed');
      const geojson = await res.json();

      // Normalize state names
      geojson.features.forEach((f, i) => {
        const rawName = f.properties.state || f.properties.name || '';
        f.properties._normalizedName = STATE_NAME_MAP[rawName] || rawName;
        f.id = i;
      });

      geojsonRef.current = geojson;

      if (map.getSource('states')) {
        map.removeLayer('state-borders');
        map.removeLayer('state-fills');
        map.removeLayer('state-fills-hover');
        map.removeSource('states');
      }

      map.addSource('states', { type: 'geojson', data: geojson });

      map.addLayer({
        id: 'state-fills',
        type: 'fill',
        source: 'states',
        paint: {
          'fill-color': '#6b7280',
          'fill-opacity': 0.6,
        },
      });

      map.addLayer({
        id: 'state-fills-hover',
        type: 'fill',
        source: 'states',
        paint: {
          'fill-color': '#6b7280',
          'fill-opacity': 0.85,
        },
        filter: ['==', ['id'], ''],
      });

      map.addLayer({
        id: 'state-borders',
        type: 'line',
        source: 'states',
        paint: {
          'line-color': isDark ? '#555' : '#999',
          'line-width': 1,
        },
      });

      // Hover
      map.on('mousemove', 'state-fills', (e) => {
        if (e.features.length === 0) return;
        map.getCanvas().style.cursor = 'pointer';

        if (hoveredIdRef.current !== null) {
          map.setFilter('state-fills-hover', ['==', ['id'], '']);
        }

        const feat = e.features[0];
        hoveredIdRef.current = feat.id;
        map.setFilter('state-fills-hover', ['==', ['id'], feat.id]);

        const name = feat.properties._normalizedName;
        const sd = dataRef.current.find(d => d.state === name) || { avgSentiment: null, articleCount: 0, topTopic: 'N/A' };
        const sentLabel = getSentimentLabel(sd.avgSentiment);
        const sentVal = sd.avgSentiment !== null ? (sd.avgSentiment > 0 ? '+' : '') + sd.avgSentiment.toFixed(2) : 'N/A';

        popupRef.current
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family:system-ui;min-width:140px">
              <div style="font-weight:700;font-size:13px;margin-bottom:4px">${name}</div>
              <div style="font-size:11px;color:#888;margin-bottom:2px">Sentiment: <span style="color:${getSentimentColor(sd.avgSentiment)};font-weight:600">${sentVal} (${sentLabel})</span></div>
              <div style="font-size:11px;color:#888;margin-bottom:2px">Articles: <strong>${sd.articleCount}</strong></div>
              <div style="font-size:11px;color:#888">Top: <strong>${sd.topTopic}</strong></div>
            </div>
          `)
          .addTo(map);
      });

      map.on('mouseleave', 'state-fills', () => {
        map.getCanvas().style.cursor = '';
        hoveredIdRef.current = null;
        map.setFilter('state-fills-hover', ['==', ['id'], '']);
        popupRef.current.remove();
      });

      // Click
      map.on('click', 'state-fills', (e) => {
        if (e.features.length === 0) return;
        const name = e.features[0].properties._normalizedName;
        setSelectedState(prev => prev === name ? null : name);
      });

      setGeoError(false);
      setGeoLoaded(true);
    } catch (err) {
      console.error('GeoJSON load error:', err);
      setGeoError(true);
    }
  };

  // Update fill colors when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded() || !map.getSource('states')) return;

    const geojson = geojsonRef.current;
    if (!geojson || !geojson.features) return;

    // Build color expression
    const colorExpr = ['match', ['get', '_normalizedName']];
    geojson.features.forEach(f => {
      const name = f.properties._normalizedName;
      const sd = data.find(d => d.state === name);
      const color = sd && sd.articleCount > 0
        ? getSentimentColor(sd.avgSentiment)
        : '#6b7280';
      colorExpr.push(name, color);
    });
    colorExpr.push('#6b7280'); // default

    try {
      map.setPaintProperty('state-fills', 'fill-color', colorExpr);
      map.setPaintProperty('state-fills-hover', 'fill-color', colorExpr);
    } catch (e) {
      // layers might not exist yet
    }
  }, [data, geoLoaded]);

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
        className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-2xl overflow-hidden relative"
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-black/40 backdrop-blur-sm rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Loading sentiment data...</span>
            </div>
          </div>
        )}

        {geoError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60 rounded-2xl">
            <div className="text-center p-6">
              <p className="text-sm text-red-500 font-medium">Failed to load map boundaries</p>
              <p className="text-xs text-gray-400 mt-1">Check your internet connection</p>
            </div>
          </div>
        )}

        <div ref={mapContainer} className="w-full" style={{ height: '480px' }} />

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 py-3 border-t border-[#eee] dark:border-[#2a2a2a] flex-wrap">
          {[
            { color: '#22c55e', label: 'Positive' },
            { color: '#eab308', label: 'Neutral' },
            { color: '#ef4444', label: 'Negative' },
            { color: '#6b7280', label: 'No data' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-gray-600 dark:text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Selected state detail */}
      <AnimatePresence>
        {selectedState && (() => {
          const sd = getStateData(selectedState);
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-2xl p-6"
            >
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
                    {sd.avgSentiment !== null ? (sd.avgSentiment > 0 ? '+' : '') + sd.avgSentiment.toFixed(2) : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Avg Sentiment</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-[#111]">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{sd.topTopic}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Top Topic</p>
                </div>
              </div>
            </motion.div>
          );
        })()}
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

      {/* Custom popup styles */}
      <style>{`
        .sentiment-popup .maplibregl-popup-content {
          background: ${isDark ? '#1a1a1a' : '#fff'};
          color: ${isDark ? '#fff' : '#111'};
          border: 1px solid ${isDark ? '#333' : '#eee'};
          border-radius: 12px;
          padding: 10px 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .sentiment-popup .maplibregl-popup-tip {
          border-top-color: ${isDark ? '#1a1a1a' : '#fff'};
        }
        .maplibregl-ctrl-attrib {
          font-size: 10px !important;
          opacity: 0.6;
        }
      `}</style>
    </motion.div>
  );
};

export default Heatmap;
