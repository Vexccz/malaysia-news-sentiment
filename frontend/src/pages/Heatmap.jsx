import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import api, { getHistory } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Play, Pause, SkipForward, SkipBack, X, ChevronLeft, ChevronRight, Columns, Clock, ExternalLink, Loader2 } from 'lucide-react';

/* Page Interactive Animations */
const PAGE_ANIMS = `
@keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes slideOutLeft { to{opacity:0;transform:translateX(-100%)} }
@keyframes slideInTop { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
@keyframes sentimentFlash { 0%{filter:brightness(1)} 50%{filter:brightness(1.6)} 100%{filter:brightness(1)} }
@keyframes barFill { from{width:0} to{width:var(--bar-w)} }
@keyframes starPop { 0%{transform:scale(1)} 30%{transform:scale(1.5)} 60%{transform:scale(0.9)} 100%{transform:scale(1)} }
@keyframes ripple { to{transform:scale(4);opacity:0} }
@keyframes checkDraw { from{stroke-dashoffset:50} to{stroke-dashoffset:0} }
@keyframes progressPulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
`;
const AnimCSS = () => <style dangerouslySetInnerHTML={{__html: PAGE_ANIMS}}/>;



const GEOJSON_URL = 'https://raw.githubusercontent.com/dosm-malaysia/data-open/main/datasets/geodata/administrative_1_state.geojson';

const STATE_NAME_MAP = {
  'Johor': 'Johor', 'Kedah': 'Kedah', 'Kelantan': 'Kelantan', 'Melaka': 'Melaka',
  'Negeri Sembilan': 'Negeri Sembilan', 'Pahang': 'Pahang', 'Perak': 'Perak', 'Perlis': 'Perlis',
  'Pulau Pinang': 'Pulau Pinang', 'Sabah': 'Sabah', 'Sarawak': 'Sarawak', 'Selangor': 'Selangor',
  'Terengganu': 'Terengganu', 'W.P. Kuala Lumpur': 'Kuala Lumpur', 'W.P. Putrajaya': 'Putrajaya', 'W.P. Labuan': 'Labuan',
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

/* ── Generate week periods (last 12 weeks) ── */
const generateWeekPeriods = () => {
  const periods = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    periods.push({
      id: i,
      label: `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      days: (i + 1) * 7,
      startDays: i * 7,
      offset: i * 7,
      rangeDays: 7,
    });
  }
  return periods;
};

const WEEK_PERIODS = generateWeekPeriods();

/* ── Standalone Map Component for Compare Mode ── */
const MapPanel = ({ isDark, data, geojsonCache, onStateClick, panelId }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const hoveredIdRef = useRef(null);
  const hoveredNameRef = useRef(null);
  const dataRef = useRef(data);
  const isDarkRef = useRef(isDark);
  const onStateClickRef = useRef(onStateClick);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { isDarkRef.current = isDark; }, [isDark]);
  useEffect(() => { onStateClickRef.current = onStateClick; }, [onStateClick]);

  const addLayers = useCallback((map, geojson) => {
    const pid = panelId;
    if (map.getSource(`states-${pid}`)) {
      try {
        map.removeLayer(`state-borders-${pid}`);
        map.removeLayer(`state-hover-${pid}`);
        map.removeLayer(`state-fills-${pid}`);
        map.removeSource(`states-${pid}`);
      } catch (_) {}
    }
    map.addSource(`states-${pid}`, { type: 'geojson', data: geojson });
    map.addLayer({ id: `state-fills-${pid}`, type: 'fill', source: `states-${pid}`, paint: { 'fill-color': '#6b7280', 'fill-opacity': 0.6 } });
    map.addLayer({ id: `state-hover-${pid}`, type: 'fill', source: `states-${pid}`, paint: { 'fill-color': '#6b7280', 'fill-opacity': 0.85 }, filter: ['==', ['id'], ''] });
    map.addLayer({ id: `state-borders-${pid}`, type: 'line', source: `states-${pid}`, paint: { 'line-color': isDarkRef.current ? '#333' : '#e5e5e5', 'line-width': 1 } });

    map.on('mousemove', `state-fills-${pid}`, (e) => {
      if (!e.features.length) return;
      map.getCanvas().style.cursor = 'pointer';
      const feat = e.features[0];
      const name = feat.properties._normalizedName;
      if (hoveredIdRef.current !== feat.id) {
        hoveredIdRef.current = feat.id;
        map.setFilter(`state-hover-${pid}`, ['==', ['id'], feat.id]);
      }
      const popup = popupRef.current;
      popup.setLngLat(e.lngLat);
      if (hoveredNameRef.current !== name) {
        hoveredNameRef.current = name;
        const sd = dataRef.current.find(d => d.state === name) || { avgSentiment: null, articleCount: 0, topTopic: 'N/A' };
        const sentColor = getSentimentColor(sd.avgSentiment);
        const sentVal = sd.avgSentiment !== null ? (sd.avgSentiment > 0 ? '+' : '') + sd.avgSentiment.toFixed(2) : 'N/A';
        popup.setHTML(`<div style="font-family:system-ui;min-width:140px;padding:2px 0"><div style="font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:${isDarkRef.current ? '#fff' : '#000'}">${name}</div><div style="font-size:20px;font-weight:800;color:${sentColor};margin-top:4px">${sentVal}</div><div style="font-size:10px;color:${isDarkRef.current ? '#666' : '#999'}">Articles: ${sd.articleCount}</div></div>`);
        if (!popup.isOpen()) popup.addTo(map);
      }
    });
    map.on('mouseleave', `state-fills-${pid}`, () => {
      map.getCanvas().style.cursor = '';
      hoveredIdRef.current = null;
      map.setFilter(`state-hover-${pid}`, ['==', ['id'], '']);
      popupRef.current.remove();
    });
    map.on('click', `state-fills-${pid}`, (e) => {
      if (!e.features.length) return;
      onStateClickRef.current(e.features[0].properties._normalizedName);
    });
  }, [panelId]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isDark
        ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
        : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [109.5, 4.0], zoom: 5.2, minZoom: 4, maxZoom: 10,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;
    popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'sentiment-popup' });

    map.on('load', () => {
      const tryAddLayers = (retries = 0) => {
        if (geojsonCache.current) {
          addLayers(map, geojsonCache.current);
        } else if (retries < 20) {
          setTimeout(() => tryAddLayers(retries + 1), 300);
        }
      };
      tryAddLayers();
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  /* Update colors when data changes */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded() || !map.getSource(`states-${panelId}`) || !geojsonCache.current) return;
    const geojson = geojsonCache.current;
    const colorExpr = ['match', ['get', '_normalizedName']];
    geojson.features.forEach(f => {
      const name = f.properties._normalizedName;
      const sd = data.find(d => d.state === name);
      colorExpr.push(name, sd && sd.articleCount > 0 ? getSentimentColor(sd.avgSentiment) : '#6b7280');
    });
    colorExpr.push('#6b7280');
    try {
      map.setPaintProperty(`state-fills-${panelId}`, 'fill-color', colorExpr);
      map.setPaintProperty(`state-hover-${panelId}`, 'fill-color', colorExpr);
    } catch (_) {}
  }, [data, panelId]);

  return (
    <div ref={containerRef} className="w-full h-[320px] sm:h-[480px]" />
  );
};

/* ── Main Heatmap Component ── */
const Heatmap = () => {
  const [data, setData] = useState([]);
  const [compareData, setCompareData] = useState([]);
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
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

  /* ── Time animation state ── */
  const [currentPeriodIdx, setCurrentPeriodIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const playIntervalRef = useRef(null);

  /* ── Compare mode state ── */
  const [compareMode, setCompareMode] = useState(false);
  const [comparePeriodIdx, setComparePeriodIdx] = useState(1);

  /* ── State drill-down articles ── */
  const [panelArticles, setPanelArticles] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  /* ── Fetch heatmap data ── */
  const fetchData = useCallback(async (days, setter) => {
    try {
      const query = days === 0 ? '' : `?days=${days}`;
      const res = await api.get(`/news/heatmap${query}`);
      setter(res.data);
      return res.data;
    } catch (err) {
      console.error('Heatmap fetch error:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (showAnimation) {
        const period = WEEK_PERIODS[currentPeriodIdx];
        await fetchData(period.days, setData);
      } else {
        await fetchData(7, setData);
      }
      setLoading(false);
    };
    load();
  }, [currentPeriodIdx, showAnimation, fetchData]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  /* Fetch compare data */
  useEffect(() => {
    if (!compareMode) return;
    const period = WEEK_PERIODS[comparePeriodIdx];
    fetchData(period.days, setCompareData);
  }, [compareMode, comparePeriodIdx, fetchData]);

  /* ── Animation controls ── */
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentPeriodIdx(prev => {
          if (prev >= WEEK_PERIODS.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying]);

  const togglePlay = () => {
    if (currentPeriodIdx >= WEEK_PERIODS.length - 1) setCurrentPeriodIdx(0);
    setIsPlaying(!isPlaying);
  };

  const stepForward = () => {
    setIsPlaying(false);
    setCurrentPeriodIdx(prev => Math.min(prev + 1, WEEK_PERIODS.length - 1));
  };

  const stepBack = () => {
    setIsPlaying(false);
    setCurrentPeriodIdx(prev => Math.max(prev - 1, 0));
  };

  /* ── State drill-down: fetch articles ── */
  const handleStateClick = useCallback(async (stateName) => {
    setSelectedState(stateName);
    setPanelOpen(true);
    setPanelLoading(true);
    try {
      const days = showAnimation ? WEEK_PERIODS[currentPeriodIdx].days : 7;
      const result = await getHistory({ state: stateName, days, pageSize: 20 });
      setPanelArticles(result.articles || result.data || result || []);
    } catch (err) {
      console.error('Failed to fetch state articles:', err);
      setPanelArticles([]);
    } finally {
      setPanelLoading(false);
    }
  }, [showAnimation, currentPeriodIdx, fetchData]);

  const getStateData = useCallback((stateName) => {
    return data.find(d => d.state === stateName) || { avgSentiment: null, articleCount: 0, topTopic: 'N/A' };
  }, [data]);

  /* ── MapLibre initialization ── */
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: isDark
        ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
        : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [109.5, 4.0], zoom: 5.2, minZoom: 4, maxZoom: 10,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = map;
    popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'sentiment-popup' });

    map.on('load', () => { loadGeoJSON(map); });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;
    const newStyle = isDark
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
    map.once('style.load', () => { loadGeoJSON(map); });
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
      map.addLayer({ id: 'state-fills', type: 'fill', source: 'states', paint: { 'fill-color': '#6b7280', 'fill-opacity': 0.6 } });
      map.addLayer({ id: 'state-fills-hover', type: 'fill', source: 'states', paint: { 'fill-color': '#6b7280', 'fill-opacity': 0.85 }, filter: ['==', ['id'], ''] });
      map.addLayer({ id: 'state-borders', type: 'line', source: 'states', paint: { 'line-color': isDark ? '#333' : '#e5e5e5', 'line-width': 1 } });

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
                <span>${posPct}% pos</span><span>${neuPct}% neu</span><span>${negPct}% neg</span>
              </div>
              <div style="border-top:1px solid ${isDark ? '#222' : '#e5e5e5'};padding-top:6px;font-size:10px;color:${isDark ? '#666' : '#999'}">
                <div style="margin-bottom:2px">Articles: <strong style="color:${isDark ? '#fff' : '#000'}">${sd.articleCount}</strong></div>
                <div>Top: <strong style="color:${isDark ? '#fff' : '#000'}">${sd.topTopic}</strong></div>
              </div>
            </div>`);
          if (!popup.isOpen()) popup.addTo(map);
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
        handleStateClick(e.features[0].properties._normalizedName);
      });

      setGeoError(false);
      setGeoLoaded(true);
    } catch (err) {
      console.error('GeoJSON load error:', err);
      setGeoError(true);
    }
  };

  /* Update map colors */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded() || !map.getSource('states')) return;
    const geojson = geojsonRef.current;
    if (!geojson || !geojson.features) return;
    const colorExpr = ['match', ['get', '_normalizedName']];
    geojson.features.forEach(f => {
      const name = f.properties._normalizedName;
      const sd = data.find(d => d.state === name);
      colorExpr.push(name, sd && sd.articleCount > 0 ? getSentimentColor(sd.avgSentiment) : '#6b7280');
    });
    colorExpr.push('#6b7280');
    try {
      map.setPaintProperty('state-fills', 'fill-color', colorExpr);
      map.setPaintProperty('state-fills-hover', 'fill-color', colorExpr);
    } catch (_) {}
  }, [data, geoLoaded]);

  const currentPeriod = WEEK_PERIODS[currentPeriodIdx];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Sentiment Heatmap
          </h1>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-1">
            {lang === 'ms' ? 'Taburan sentimen merentasi negeri-negeri Malaysia' : 'Geographic sentiment distribution across Malaysian states'}
          </p>
          <div className="mt-3 border-b-2 border-black dark:border-white" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Compare toggle */}
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] border transition-colors ${
              compareMode
                ? 'border-black dark:border-white text-white dark:text-black bg-black dark:bg-white'
                : 'border-[#e5e5e5] dark:border-[#222] text-gray-500 dark:text-[#999] hover:border-black dark:hover:border-white'
            }`}
          >
            <Columns size={12} />
            {lang === 'ms' ? 'Banding' : 'Compare'}
          </button>
          {/* Animation toggle */}
          <button
            onClick={() => { setShowAnimation(!showAnimation); setIsPlaying(false); setCurrentPeriodIdx(0); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] border transition-colors ${
              showAnimation
                ? 'border-black dark:border-white text-white dark:text-black bg-black dark:bg-white'
                : 'border-[#e5e5e5] dark:border-[#222] text-gray-500 dark:text-[#999] hover:border-black dark:hover:border-white'
            }`}
          >
            <Clock size={12} />
            {lang === 'ms' ? 'Animasi' : 'Animate'}
          </button>
        </div>
      </div>

      {/* ── Time Animation Controls ── */}
      <AnimatePresence>
        {showAnimation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222] overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] font-semibold">Time Period</span>
                <span className="text-sm font-bold text-black dark:text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {currentPeriod.label}
                </span>
              </div>
              {/* Progress bar */}
              <div className="relative h-1.5 bg-[#e5e5e5] dark:bg-[#222] mb-4">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-black dark:bg-white"
                  animate={{ width: `${((currentPeriodIdx + 1) / WEEK_PERIODS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
                {WEEK_PERIODS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setIsPlaying(false); setCurrentPeriodIdx(i); }}
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 border border-[#e5e5e5] dark:border-[#333] transition-colors"
                    style={{
                      left: `${((i + 0.5) / WEEK_PERIODS.length) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: i === currentPeriodIdx ? (isDark ? '#fff' : '#000') : (isDark ? '#222' : '#fff'),
                    }}
                  />
                ))}
              </div>
              {/* Transport controls */}
              <div className="flex items-center justify-center gap-3">
                <button onClick={stepBack} disabled={currentPeriodIdx === 0}
                  className="p-2 text-gray-500 dark:text-[#999] hover:text-black dark:hover:text-white disabled:opacity-30 transition-colors">
                  <SkipBack size={16} />
                </button>
                <button onClick={togglePlay}
                  className="w-10 h-10 flex items-center justify-center border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
                  {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>
                <button onClick={stepForward} disabled={currentPeriodIdx >= WEEK_PERIODS.length - 1}
                  className="p-2 text-gray-500 dark:text-[#999] hover:text-black dark:hover:text-white disabled:opacity-30 transition-colors">
                  <SkipForward size={16} />
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-400 dark:text-[#666] mt-2 uppercase tracking-[0.12em]">
                {lang === 'ms' ? 'Minggu' : 'Week'} {currentPeriodIdx + 1} / {WEEK_PERIODS.length}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Map Area (single or compare) ── */}
      {compareMode ? (
        <div className="flex flex-col sm:flex-row gap-0 border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] overflow-hidden">
          {/* Left map (current period or animation period) */}
          <div className="flex-1 min-w-0 border-r border-[#e5e5e5] dark:border-[#222]">
            <div className="px-3 py-2 border-b border-[#e5e5e5] dark:border-[#222] flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] font-semibold flex items-center gap-2">
                <Clock size={12} />
                {showAnimation ? currentPeriod.label : lang === 'ms' ? '7 Hari Lalu' : 'Last 7 Days'}
              </span>
            </div>
            <div ref={mapContainer} className="w-full h-[320px] sm:h-[480px]" />
          </div>
          {/* Right map (comparison period) */}
          <div className="flex-1 min-w-0">
            <div className="px-3 py-2 border-b border-[#e5e5e5] dark:border-[#222] flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] font-semibold flex items-center gap-2">
                <Clock size={12} />
                {WEEK_PERIODS[comparePeriodIdx].label}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setComparePeriodIdx(prev => Math.max(prev - 1, 0))} disabled={comparePeriodIdx === 0}
                  className="p-1 text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-30"><ChevronLeft size={14} /></button>
                <button onClick={() => setComparePeriodIdx(prev => Math.min(prev + 1, WEEK_PERIODS.length - 1))} disabled={comparePeriodIdx >= WEEK_PERIODS.length - 1}
                  className="p-1 text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-30"><ChevronRight size={14} /></button>
              </div>
            </div>
            <MapPanel isDark={isDark} data={compareData} geojsonCache={geojsonRef} onStateClick={handleStateClick} panelId="compare" />
          </div>
        </div>
      ) : (
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
        </motion.div>
      )}

      {/* ── Legend (upgraded with gradient color scale + intensity) ── */}
      <div className="border border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#111] px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3 justify-between">
        {/* Sentiment swatches */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 dark:text-[#888]">Sentiment</span>
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

        {/* Gradient intensity scale */}
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 dark:text-[#888]">Intensity</span>
          <span className="text-[10px] text-gray-500 dark:text-[#999] uppercase tracking-[0.12em]">Low</span>
          <div
            className="h-3 w-32"
            style={{
              background:
                'linear-gradient(90deg, rgba(107,114,128,0.25), rgba(251,191,36,0.85), rgba(74,222,128,0.95))',
            }}
          />
          <span className="text-[10px] text-gray-500 dark:text-[#999] uppercase tracking-[0.12em]">High</span>
        </div>

        <p className="text-[10px] italic text-gray-400 dark:text-[#666] font-serif">
          Hover any state for article preview. Click to open drill-down.
        </p>
      </div>

      {/* ── State Drill-Down Side Panel ── */}
      <AnimatePresence>
        {panelOpen && selectedState && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222]"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black dark:border-white">
              <div>
                <h2 className="text-lg font-bold text-black dark:text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {selectedState}
                </h2>
                <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[#999] mt-0.5">
                  {lang === 'ms' ? 'Artikel Terkini' : 'Recent Articles'}
                </p>
              </div>
              <button
                onClick={() => { setPanelOpen(false); setSelectedState(null); }}
                className="w-8 h-8 flex items-center justify-center border border-[#e5e5e5] dark:border-[#333] text-gray-400 hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Sentiment summary */}
            {(() => {
              const sd = getStateData(selectedState);
              return (
    <><AnimCSS />
                <div className="grid grid-cols-3 gap-0 divide-x divide-[#e5e5e5] dark:divide-[#222] border-b border-[#e5e5e5] dark:border-[#222]">
                  <div className="text-center p-4 bg-[#fafafa] dark:bg-[#0a0a0a]">
                    <p className="text-xl font-bold text-black dark:text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{sd.articleCount}</p>
                    <p className="text-[10px] text-gray-500 dark:text-[#999] uppercase tracking-[0.18em]">{lang === 'ms' ? 'Artikel' : 'Articles'}</p>
                  </div>
                  <div className="text-center p-4 bg-[#fafafa] dark:bg-[#0a0a0a]">
                    <p className={`text-xl font-bold ${sd.avgSentiment > 0 ? 'text-[#4ADE80]' : sd.avgSentiment < 0 ? 'text-[#FB7185]' : 'text-[#FBBF24]'}`} style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                      {sd.avgSentiment !== null ? (sd.avgSentiment > 0 ? '+' : '') + sd.avgSentiment.toFixed(2) : 'N/A'}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-[#999] uppercase tracking-[0.18em]">{lang === 'ms' ? 'Purata Sentimen' : 'Avg Sentiment'}</p>
                  </div>
                  <div className="text-center p-4 bg-[#fafafa] dark:bg-[#0a0a0a]">
                    <p className="text-xl font-bold text-black dark:text-white capitalize" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{sd.topTopic}</p>
                    <p className="text-[10px] text-gray-500 dark:text-[#999] uppercase tracking-[0.18em]">{lang === 'ms' ? 'Topik Utama' : 'Top Topic'}</p>
                  </div>
                </div>
    </>
              );
            })()}

            {/* Articles list */}
            <div className="max-h-[400px] overflow-y-auto">
              {panelLoading ? (
                <div className="flex items-center justify-center py-12 gap-3">
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                  <span className="text-sm text-gray-400 dark:text-[#666]">{lang === 'ms' ? 'Memuatkan...' : 'Loading articles...'}</span>
                </div>
              ) : panelArticles.length > 0 ? (
                <div className="divide-y divide-[#e5e5e5] dark:divide-[#222]">
                  {panelArticles.slice(0, 15).map((article, i) => (
                    <motion.div
                      key={article._id || article.id || i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="px-5 py-3 hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-black dark:text-white leading-snug line-clamp-2">
                            {article.title || 'Untitled'}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-gray-400 dark:text-[#666] uppercase tracking-[0.1em]">
                              {article.source || article.sourceName || 'Unknown'}
                            </span>
                            {article.sentiment && (
                              <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${
                                article.sentiment === 'Positive' ? 'text-[#4ADE80]' :
                                article.sentiment === 'Negative' ? 'text-[#FB7185]' : 'text-[#FBBF24]'
                              }`}>
                                {article.sentiment}
                              </span>
                            )}
                            {article.date && (
                              <span className="text-[10px] text-gray-400 dark:text-[#666]">
                                {new Date(article.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>
                        {article.url && (
                          <a href={article.url} target="_blank" rel="noopener noreferrer"
                            className="mt-0.5 text-gray-400 hover:text-black dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-400 dark:text-[#666]">{lang === 'ms' ? 'Tiada artikel dijumpai' : 'No articles found for this state'}</p>
                </div>
              )}
            </div>

            {/* Footer action */}
            <div className="px-5 py-3 border-t border-[#e5e5e5] dark:border-[#222] flex justify-between items-center">
              <span className="text-[10px] text-gray-400 dark:text-[#666] uppercase tracking-[0.12em]">
                {panelArticles.length > 15 ? `${lang === 'ms' ? 'Menunjukkan 15 daripada' : 'Showing 15 of'} ${panelArticles.length}` : ''}
              </span>
              <button
                onClick={() => navigate(`/search?state=${encodeURIComponent(selectedState)}`)}
                className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] border border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              >
                {lang === 'ms' ? 'Lihat Semua' : 'View All Articles'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── State Summary Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-[#111] border border-[#e5e5e5] dark:border-[#222]"
      >
        <div className="px-5 pt-5 pb-3 border-b-2 border-black dark:border-white">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-[#999]">{lang === 'ms' ? 'Ringkasan Negeri' : 'State Summary'}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e5e5] dark:border-[#222]">
                <th className="text-left px-5 py-3 text-[10px] text-gray-500 dark:text-[#999] font-medium uppercase tracking-[0.18em]">{lang === 'ms' ? 'Negeri' : 'State'}</th>
                <th className="text-center px-3 py-3 text-[10px] text-gray-500 dark:text-[#999] font-medium uppercase tracking-[0.18em]">{lang === 'ms' ? 'Artikel' : 'Articles'}</th>
                <th className="text-center px-3 py-3 text-[10px] text-gray-500 dark:text-[#999] font-medium uppercase tracking-[0.18em]">{lang === 'ms' ? 'Sentimen' : 'Sentiment'}</th>
                <th className="text-center px-3 py-3 text-[10px] text-gray-500 dark:text-[#999] font-medium uppercase tracking-[0.18em]">{lang === 'ms' ? 'Topik Utama' : 'Top Topic'}</th>
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
                    onClick={() => handleStateClick(d.state)}
                  >
                    <td className="px-5 py-2.5 text-black dark:text-white font-medium">{d.state}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600 dark:text-[#999]">{d.articleCount}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 text-xs font-mono ${
                        d.avgSentiment > 0.1 ? 'text-[#4ADE80]' : d.avgSentiment < -0.1 ? 'text-[#FB7185]' : 'text-[#FBBF24]'
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
            <p className="text-center text-sm text-gray-400 dark:text-[#666] py-8">
              {lang === 'ms' ? 'Tiada data geografi untuk tempoh ini' : 'No geographic data available for this period'}
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Custom popup styles ── */}
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
