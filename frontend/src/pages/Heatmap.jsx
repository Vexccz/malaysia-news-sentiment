import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const GEOJSON_URL = 'https://raw.githubusercontent.com/dosm-malaysia/data-open/main/datasets/geodata/administrative_1_state.geojson';

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
  if (val > 0.3) return '#4ADE80';
  if (val > 0.1) return '#4ADE80';
  if (val > -0.1) return '#FBBF24';
  if (val > -0.3) return '#FB7185';
  return '#FB7185';
};

const getSentimentLabel = (val) => {
  if (val === null || val === undefined) return 'No data';
  if (val > 0.1) return 'Positive';
  if (val > -0.1) return 'Neutral';
  return 'Negative';
};

const Heatmap = () => {
  const [data, setData] = useState([]);
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [selectedState, setSelectedState] = useState(null);
  const [geoError, setGeoError] = useState(false);
  const [geoLoaded, setGeoLoaded] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const navigate = useNavigate();

  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const hoveredIdRef = useRef(null);
  const hoveredNameRef = useRef(null);
  const dataRef = useRef([]);
  const geojsonRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = days === 0 ? '' : `?days=${days}`;
        const res = await api.get(`/news/heatmap${query}`);
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

  const getStateData = useCallback((stateName) => {
    return data.find(d => d.state === stateName) || { avgSentiment: null, articleCount: 0, topTopic: 'N/A' };
  }, [data]);

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

  const loadGeoJSON = async (map) => {
    try {
      const res = await fetch(GEOJSON_URL);
      if (!res.ok) throw new Error('GeoJSON fetch failed');
      const geojson = await res.json();

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
          'line-color': isDark ? '#333' : '#e5e5e5',
          'line-width': 1,
        },
      });

      map.on('mousemove', 'state-fills', (e) => {
        if (e.features.length === 0) return;
        map.getCanvas().style.cursor = 'pointer';

        const feat = e.features[0];
        const name = feat.properties._normalizedName;

        if (hoveredIdRef.current !== feat.id) {
          hoveredIdRef.current = feat.id;
          map.setFilter('state-fills-hover', ['==', ['id'], feat.id]);
        }

        const popup = popupRef.current;
        popup.setLngLat(e.lngLat);

        if (hoveredNameRef.current !== name) {
          hoveredNameRef.current = name;
          const sd = dataRef.current.find(d => d.state === name) || { avgSentiment: null, articleCount: 0, topTopic: 'N/A' };
          const sentLabel = getSentimentLabel(sd.avgSentiment);
          const sentVal = sd.avgSentiment !== null ? (sd.avgSentiment > 0 ? '+' : '') + sd.avgSentiment.toFixed(2) : 'N/A';
          const sentColor = getSentimentColor(sd.avgSentiment);
          const posPct = sd.posPct !== undefined ? sd.posPct : Math.max(0, Math.round((sd.avgSentiment > 0 ? 40 + sd.avgSentiment * 60 : 20)));
          const negPct = sd.negPct !== undefined ? sd.negPct : Math.max(0, Math.round((sd.avgSentiment < 0 ? 40 + Math.abs(sd.avgSentiment) * 60 : 20)));
          const neuPct = Math.max(0, 100 - posPct - negPct);

          popup.setHTML(`
            <div style="font-family:system-ui;min-width:180px;padding:2px 0">
              <div style="font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;color:${isDark ? '#fff' : '#000'}">${name}</div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                <span style="font-size:22px;font-weight:800;color:${sentColor}">${sentVal}</span>
                <span style="font-size:10px;font-weight:600;text-transform:uppercase;color:${sentColor};letter-spacing:0.08em">${sentLabel}</span>
              </div>
              <div style="height:4px;background:${isDark ? '#222' : '#e5e5e5'};display:flex;overflow:hidden;margin-bottom:8px">
                <div style="width:${posPct}%;background:#4ADE80"></div>
                <div style="width:${neuPct}%;background:#FBBF24"></div>
                <div style="width:${negPct}%;background:#FB7185"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:10px;color:${isDark ? '#666' : '#999'};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">
                <span>${posPct}% pos</span>
                <span>${neuPct}% neu</span>
                <span>${negPct}% neg</span>
              </div>
              <div style="border-top:1px solid ${isDark ? '#222' : '#e5e5e5'};padding-top:6px;font-size:10px;color:${isDark ? '#666' : '#999'}">
                <div style="margin-bottom:2px">Articles: <strong style="color:${isDark ? '#fff' : '#000'}">${sd.articleCount}</strong></div>
                <div>Top: <strong style="color:${isDark ? '#fff' : '#000'}">${sd.topTopic}</strong></div>
              </div>
            </div>
          `);

          if (!popup.isOpen()) {
            popup.addTo(map);
          }
        }
      });

      map.on('mouseleave', 'state-fills', () => {
        map.getCanvas().style.cursor = '';
        hoveredIdRef.current = null;
        map.setFilter('state-fills-hover', ['==', ['id'], '']);
        popupRef.current.remove();
      });

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded() || !map.getSource('states')) return;

    const geojson = geojsonRef.current;
    if (!geojson || !geojson.features) return;

    const colorExpr = ['match', ['get', '_normalizedName']];
    geojson.features.forEach(f => {
      const name = f.properties._normalizedName;
      const sd = data.find(d => d.state === name);
      const color = sd && sd.articleCount > 0
        ? getSentimentColor(sd.avgSentiment)
        : '#6b7280';
      colorExpr.push(name, color);
    });
    colorExpr.push('#6b7280');

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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Sentiment Heatmap
          </h1>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
            Geographic sentiment distribution across Malaysian states
          </p>
          <div className="mt-3 border-b border-[#e5e5e5] dark:border-[#222]" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mr-2">Range</span>
          {[
            { label: '7d', value: 7 },
            { label: '30d', value: 30 },
            { label: '90d', value: 90 },
            { label: 'All', value: 0 },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] border transition-colors ${
                days === opt.value
                  ? 'border-black dark:border-white text-white dark:text-black bg-black dark:bg-white'
                  : 'border-[#e5e5e5] dark:border-[#222] text-gray-500 dark:text-[#999] hover:border-black dark:hover:border-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] overflow-hidden relative"
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-black/40">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-black dark:border-white border-t-transparent animate-spin" />
              <span className="text-sm text-gray-500 dark:text-[#999]">Loading sentiment data...</span>
            </div>
          </div>
        )}

        {geoError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60">
            <div className="text-center p-6">
              <p className="text-sm text-[#FB7185] font-medium">Failed to load map boundaries</p>
              <p className="text-xs text-gray-400 dark:text-[#666] mt-1">Check your internet connection</p>
            </div>
          </div>
        )}

        <div ref={mapContainer} className="w-full h-[320px] sm:h-[480px]" />

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 py-3 border-t border-[#e5e5e5] dark:border-[#222] flex-wrap">
          {[
            { color: '#4ADE80', label: 'Positive' },
            { color: '#FBBF24', label: 'Neutral' },
            { color: '#FB7185', label: 'Negative' },
            { color: '#6b7280', label: 'No data' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] text-gray-500 dark:text-[#999] uppercase tracking-[0.18em]">{item.label}</span>
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
              className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black dark:text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{selectedState}</h2>
                <button
                  onClick={() => setSelectedState(null)}
                  className="text-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-0 divide-x divide-[#e5e5e5] dark:divide-[#222] border border-[#e5e5e5] dark:border-[#222]">
                <div className="text-center p-3 bg-[#fafafa] dark:bg-[#0a0a0a]">
                  <p className="text-xl font-bold text-black dark:text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{sd.articleCount}</p>
                  <p className="text-[10px] text-gray-500 dark:text-[#999] uppercase tracking-[0.18em]">Articles</p>
                </div>
                <div className="text-center p-3 bg-[#fafafa] dark:bg-[#0a0a0a]">
                  <p className={`text-xl font-bold ${sd.avgSentiment > 0 ? 'text-[#4ADE80]' : sd.avgSentiment < 0 ? 'text-[#FB7185]' : 'text-[#FBBF24]'}`} style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    {sd.avgSentiment !== null ? (sd.avgSentiment > 0 ? '+' : '') + sd.avgSentiment.toFixed(2) : 'N/A'}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-[#999] uppercase tracking-[0.18em]">Avg Sentiment</p>
                </div>
                <div className="text-center p-3 bg-[#fafafa] dark:bg-[#0a0a0a]">
                  <p className="text-xl font-bold text-black dark:text-white capitalize" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{sd.topTopic}</p>
                  <p className="text-[10px] text-gray-500 dark:text-[#999] uppercase tracking-[0.18em]">Top Topic</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => navigate(`/search?state=${encodeURIComponent(selectedState)}`)}
                  className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] border border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                >
                  View Articles
                </button>
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
        className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222]"
      >
        <div className="px-5 pt-5 pb-3 border-b border-[#e5e5e5] dark:border-[#222]">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]">State Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e5e5] dark:border-[#222]">
                <th className="text-left px-5 py-3 text-[10px] text-gray-500 dark:text-[#999] font-medium uppercase tracking-[0.18em]">State</th>
                <th className="text-center px-3 py-3 text-[10px] text-gray-500 dark:text-[#999] font-medium uppercase tracking-[0.18em]">Articles</th>
                <th className="text-center px-3 py-3 text-[10px] text-gray-500 dark:text-[#999] font-medium uppercase tracking-[0.18em]">Sentiment</th>
                <th className="text-center px-3 py-3 text-[10px] text-gray-500 dark:text-[#999] font-medium uppercase tracking-[0.18em]">Top Topic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#222]">
              {data
                .filter(d => d.articleCount > 0)
                .sort((a, b) => b.articleCount - a.articleCount)
                .map((d, i) => (
                  <motion.tr
                    key={d.state}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] cursor-pointer transition-colors"
                    onClick={() => setSelectedState(d.state)}
                  >
                    <td className="px-5 py-2.5 text-black dark:text-white font-medium">{d.state}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600 dark:text-[#999]">{d.articleCount}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 text-xs font-mono ${
                        d.avgSentiment > 0.1 ? 'text-[#4ADE80]' :
                        d.avgSentiment < -0.1 ? 'text-[#FB7185]' :
                        'text-[#FBBF24]'
                      }`}>
                        {d.avgSentiment > 0 ? '+' : ''}{d.avgSentiment.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-600 dark:text-[#999] capitalize">{d.topTopic}</td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
          {data.filter(d => d.articleCount > 0).length === 0 && !loading && (
            <p className="text-center text-sm text-gray-400 dark:text-[#666] py-8">No geographic data available for this period</p>
          )}
        </div>
      </motion.div>

      {/* Custom popup styles */}
      <style>{`
        .sentiment-popup .maplibregl-popup-content {
          background: ${isDark ? '#111' : '#fff'};
          color: ${isDark ? '#fff' : '#000'};
          border: 1px solid ${isDark ? '#222' : '#e5e5e5'};
          border-radius: 0;
          padding: 10px 14px;
          box-shadow: none;
        }
        .sentiment-popup .maplibregl-popup-tip {
          border-top-color: ${isDark ? '#111' : '#fff'};
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
