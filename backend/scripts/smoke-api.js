const API_BASE = process.env.API_BASE || 'http://localhost:5001/api/v1';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path}: ${response.status} ${body.error || ''}`);
  return body;
};

(async () => {
  const guest = await request('/auth/guest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  const headers = { authorization: `Bearer ${guest.token}` };
  const stats = await request('/history/stats', { headers });
  const graph = await request('/entities/graph', { headers });
  const regional = await request('/news/regional', { headers });
  const monitor = await request('/monitor/stats', { headers });
  if (!stats.total || !Array.isArray(graph.nodes) || graph.nodes.length === 0) throw new Error('Critical data assertions failed');
  const invalidStates = regional.filter(row => ['Sindh', 'Selangol', 'Malacca', 'Pulau Pinang'].includes(row.state));
  if (invalidStates.length) throw new Error(`Non-canonical states: ${invalidStates.map(row => row.state).join(', ')}`);
  if (!monitor.success) throw new Error('Monitor unhealthy');
  console.log(JSON.stringify({ ok: true, total: stats.total, nodes: graph.nodes.length, states: regional.length }));
})().catch(error => { console.error(error.message); process.exit(1); });
