import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Activity, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { LoadingSkeleton } from '../components/Skeletons';

const AgentDashboard = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    insights: [],
    spikes: [],
    trending: [],
    anomalies: [],
    generatedAt: null
  });
  const [expandedInsights, setExpandedInsights] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [insightsRes, spikesRes, trendingRes, anomaliesRes] = await Promise.all([
        api.get('/agent/insights'),
        api.get('/agent/spikes'),
        api.get('/agent/trending', { params: { hours: 6 } }),
        api.get('/agent/anomalies')
      ]);

      setData({
        insights: insightsRes.data.insights || [],
        spikes: spikesRes.data.spikes || [],
        trending: trendingRes.data.trending || [],
        anomalies: anomaliesRes.data.anomalies || [],
        generatedAt: insightsRes.data.generatedAt || new Date().toISOString()
      });
    } catch (error) {
      console.error('Agent dashboard error:', error);
      toast.error('Failed to load agent intelligence data');
    } finally {
      setLoading(false);
    }
  };

  const toggleInsight = (index) => {
    setExpandedInsights(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const highPriorityCount = data.insights.filter(i => i.priority === 'high').length;

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    return new Date(ts).toLocaleString('en-MY', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 pb-4 border-b border-gray-200 dark:border-[#222]"
        >
          <h1
            className="text-4xl font-bold tracking-tight mb-2"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            AGENT INTELLIGENCE
          </h1>
          <p className="text-xs uppercase tracking-widest text-gray-600 dark:text-gray-400 mb-3">
            AUTONOMOUS MONITORING
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
            Last updated: {formatTimestamp(data.generatedAt)}
          </p>
        </motion.div>

        {/* Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'SENTIMENT SPIKES', value: data.spikes.length, icon: Activity },
            { label: 'TRENDING ENTITIES', value: data.trending.length, icon: TrendingUp },
            { label: 'ANOMALIES', value: data.anomalies.length, icon: AlertTriangle },
            { label: 'PRIORITY ALERTS', value: highPriorityCount, icon: Zap }
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className="bg-[#fafafa] dark:bg-[#111] border border-gray-200 dark:border-[#222] border-l-[3px] border-l-gray-900 dark:border-l-gray-100 p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon size={18} className="text-gray-600 dark:text-gray-400" />
                  <span className="text-2xl font-mono font-bold">{stat.value}</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-500">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Spikes Section */}
        {data.spikes.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-200 dark:border-[#222]">
              <Activity size={18} className="text-gray-700 dark:text-gray-300" />
              <h2
                className="text-xl font-bold uppercase tracking-wide"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                Sentiment Spikes
              </h2>
            </div>
            <div className="border border-gray-200 dark:border-[#222] overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#fafafa] dark:bg-[#111] border-b border-gray-200 dark:border-[#222]">
                    <th className="text-left p-3 text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-medium">
                      Sentiment
                    </th>
                    <th className="text-right p-3 text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-medium">
                      Current
                    </th>
                    <th className="text-right p-3 text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-medium">
                      Prev Avg
                    </th>
                    <th className="text-right p-3 text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-medium">
                      Change
                    </th>
                    <th className="text-center p-3 text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-medium">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.spikes.map((spike, idx) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      className="border-b border-gray-200 dark:border-[#222] last:border-b-0 hover:bg-gray-50 dark:hover:bg-[#0d0d0d]"
                    >
                      <td className="p-3 text-sm capitalize font-medium">{spike.sentiment}</td>
                      <td className="p-3 text-right font-mono text-sm">{spike.current}</td>
                      <td className="p-3 text-right font-mono text-sm text-gray-500 dark:text-gray-400">
                        {spike.previousAvg != null ? spike.previousAvg.toFixed(2) : '-'}
                      </td>
                      <td className="p-3 text-right font-mono text-sm font-semibold">
                        <span className={spike.type === 'surge' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}>
                          {spike.change > 0 ? '+' : ''}{spike.change?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest border ${
                          spike.type === 'surge'
                            ? 'border-green-600 text-green-600 dark:border-green-500 dark:text-green-500'
                            : 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-500'
                        }`}>
                          {spike.type}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>
        )}

        {/* Trending Entities Section */}
        {data.trending.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-200 dark:border-[#222]">
              <TrendingUp size={18} className="text-gray-700 dark:text-gray-300" />
              <h2
                className="text-xl font-bold uppercase tracking-wide"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                Trending Entities
              </h2>
            </div>
            <div className="space-y-2">
              {data.trending.map((entity, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="bg-[#fafafa] dark:bg-[#111] border border-gray-200 dark:border-[#222] border-l-[3px] border-l-gray-900 dark:border-l-gray-100 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{entity.entity}</span>
                    {entity.trending && (
                      <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-widest border border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500">
                        TRENDING
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500">Recent</p>
                      <p className="font-mono text-sm font-semibold">{entity.recentCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500">Change</p>
                      <p className={`font-mono text-sm font-semibold ${
                        entity.change > 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                      }`}>
                        {entity.change > 0 ? '+' : ''}{entity.change?.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Anomalies Section */}
        {data.anomalies.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-200 dark:border-[#222]">
              <AlertTriangle size={18} className="text-gray-700 dark:text-gray-300" />
              <h2
                className="text-xl font-bold uppercase tracking-wide"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                Anomalies Detected
              </h2>
            </div>
            <div className="space-y-2">
              {data.anomalies.map((anomaly, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="bg-[#fafafa] dark:bg-[#111] border border-gray-200 dark:border-[#222] border-l-[3px] border-l-gray-900 dark:border-l-gray-100 p-4 flex items-start justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold capitalize">{anomaly.type}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Source: <span className="font-medium text-gray-700 dark:text-gray-300">{anomaly.source}</span>
                    </p>
                    {anomaly.count != null && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Count: <span className="font-mono">{anomaly.count}</span>
                      </p>
                    )}
                    {anomaly.percentage != null && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Percentage: <span className="font-mono">{anomaly.percentage}%</span>
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest border ${
                    anomaly.severity === 'high'
                      ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-500'
                      : anomaly.severity === 'medium'
                      ? 'border-amber-600 text-amber-600 dark:border-amber-500 dark:text-amber-500'
                      : 'border-gray-400 text-gray-400 dark:border-gray-500 dark:text-gray-500'
                  }`}>
                    {anomaly.severity}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Insights Section */}
        {data.insights.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-200 dark:border-[#222]">
              <Zap size={18} className="text-gray-700 dark:text-gray-300" />
              <h2
                className="text-xl font-bold uppercase tracking-wide"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                Agent Insights
              </h2>
            </div>
            <div className="space-y-3">
              {[...data.insights]
                .sort((a, b) => {
                  const order = { high: 0, medium: 1, low: 2 };
                  return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
                })
                .map((insight, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    className="bg-[#fafafa] dark:bg-[#111] border border-gray-200 dark:border-[#222] border-l-[3px] border-l-gray-900 dark:border-l-gray-100 p-4 cursor-pointer select-none"
                    onClick={() => toggleInsight(idx)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            {insight.type}
                          </span>
                          <span className={`px-1.5 py-0.5 text-[9px] uppercase tracking-widest border ${
                            insight.priority === 'high'
                              ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-500'
                              : insight.priority === 'medium'
                              ? 'border-amber-600 text-amber-600 dark:border-amber-500 dark:text-amber-500'
                              : 'border-gray-400 text-gray-400 dark:border-gray-500 dark:text-gray-500'
                          }`}>
                            {insight.priority}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{insight.message}</p>

                        {insight.details && expandedInsights[idx] && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-gray-200 dark:border-[#222]"
                          >
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-mono">
                              {insight.details}
                            </p>
                          </motion.div>
                        )}
                      </div>
                      {insight.details && (
                        <div className="mt-0.5 text-gray-400">
                          {expandedInsights[idx] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
            </div>
          </motion.section>
        )}

        {/* Empty State */}
        {!loading && data.insights.length === 0 && data.spikes.length === 0 && data.trending.length === 0 && data.anomalies.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center py-20 border border-gray-200 dark:border-[#222]"
          >
            <Activity size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
              No agent intelligence data available
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Data will appear once the monitoring agent processes articles
            </p>
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default AgentDashboard;
