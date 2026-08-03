const CANONICAL_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
  'Penang', 'Perak', 'Perlis', 'Sabah', 'Sarawak', 'Selangor',
  'Terengganu', 'Kuala Lumpur', 'Putrajaya', 'Labuan',
];

const STATE_ALIASES = new Map([
  ['malacca', 'Melaka'], ['pulau pinang', 'Penang'], ['selangol', 'Selangor'],
  ['w.p. kuala lumpur', 'Kuala Lumpur'], ['wp kuala lumpur', 'Kuala Lumpur'],
  ['wilayah persekutuan kuala lumpur', 'Kuala Lumpur'],
  ['w.p. putrajaya', 'Putrajaya'], ['wp putrajaya', 'Putrajaya'],
  ['w.p. labuan', 'Labuan'], ['wp labuan', 'Labuan'],
]);

const canonicalLookup = new Map(CANONICAL_STATES.map(state => [state.toLowerCase(), state]));

const normalizeState = (value) => {
  const raw = String(value || '').trim();
  if (!raw || ['general', 'unknown', 'n/a', 'sindh', 'wilayah persekutuan'].includes(raw.toLowerCase())) return 'General';
  return STATE_ALIASES.get(raw.toLowerCase()) || canonicalLookup.get(raw.toLowerCase()) || 'General';
};

module.exports = { CANONICAL_STATES, STATE_ALIASES, normalizeState };
