/**
 * Shared entity extraction patterns + helpers.
 *
 * Kept deliberately tiny — same pattern set as controllers/entityController.js
 * so MongoDB-derived graph and Neo4j-projected graph stay in sync.
 *
 * NOTE: entityController.js keeps its own copy intentionally (Feature #5
 * slice 1: no controller rewrite). Future slice can swap it to import here.
 */

const entityPatterns = {
  politicians: [
    'Anwar Ibrahim', 'Muhyiddin Yassin', 'Ismail Sabri', 'Najib Razak',
    'Mahathir', 'Ahmad Zahid', 'Hadi Awang', 'Lim Guan Eng',
    'Rafizi Ramli', 'Khairy Jamaluddin', 'Syed Saddiq', 'Wan Azizah',
    'Tengku Zafrul', 'Fadillah Yusof', 'Johari Abdul Ghani',
    'Anthony Loke', 'Nik Abduh', 'Mat Sabu', 'Azmin Ali',
    'Hamzah Zainudin', 'Wee Ka Siong', 'Hannah Yeoh', 'Nurul Izzah',
    'Saifuddin Nasution', 'Fahmi Fadzil', 'Gobind Singh',
  ],
  parties: [
    'UMNO', 'PKR', 'DAP', 'PAS', 'Bersatu', 'GPS', 'MCA', 'MIC',
    'Pakatan Harapan', 'Perikatan Nasional', 'Barisan Nasional',
    'Gabungan Parti Sarawak', 'Warisan', 'MUDA', 'Pejuang',
  ],
  organizations: [
    'MACC', 'SPR', 'Bank Negara', 'Petronas', 'Khazanah',
    'EPF', 'KWSP', 'Bursa Malaysia', 'TNB', 'Proton', 'Maybank',
    'PDRM', 'ATM', 'KKM', 'MOH', 'MOF', 'AGC',
    'Suhakam', 'Election Commission', 'Parliament',
    'IMF', 'World Bank', 'ASEAN', 'UN', 'WHO',
  ],
  locations: [
    'Putrajaya', 'Kuala Lumpur', 'Sabah', 'Sarawak', 'Johor',
    'Penang', 'Selangor', 'Perak', 'Kedah', 'Kelantan',
    'Terengganu', 'Pahang', 'Melaka', 'Negeri Sembilan', 'Perlis',
  ],
};

const categoryToType = (category) => {
  if (category === 'politicians') return 'PERSON';
  if (category === 'locations') return 'LOCATION';
  return 'ORGANIZATION';
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Cache compiled regex per entity term so we only build them once per process.
const matcherCache = new Map();

const buildMatcher = (term) => {
  if (matcherCache.has(term)) return matcherCache.get(term);
  // Word-boundary, case-insensitive whole-token match.
  // Short uppercase acronyms (e.g. "UN", "PAS", "DAP") must match the exact
  // case to avoid colliding with substrings like "launches" -> "UN".
  const isAcronym = /^[A-Z0-9]{2,5}$/.test(term);
  const flags = isAcronym ? '' : 'i';
  const escaped = escapeRegExp(term);
  // For multi-word terms (e.g. "Anwar Ibrahim"), use \b on both ends.
  // For acronyms, also require boundaries so "USA" doesn't match "USAID".
  const pattern = new RegExp(`\\b${escaped}\\b`, flags);
  matcherCache.set(term, pattern);
  return pattern;
};

/**
 * Extract entities from a text blob.
 * Case-insensitive word-boundary match against the curated pattern list,
 * with case-sensitive matching for short acronyms to avoid false positives
 * like "UN" matching inside "launches".
 *
 * @param {string} text
 * @param {string} [typeFilter] optional category key
 * @param {Array} [customEntities] optional user-defined entities [{name, synonyms, category}]
 * @returns {{name:string, category:string, type:string}[]}
 */
const extractEntities = (text, typeFilter, customEntities = []) => {
  if (!text) return [];
  const found = [];
  const patterns = typeFilter ? { [typeFilter]: entityPatterns[typeFilter] } : entityPatterns;
  
  // Extract from built-in patterns
  for (const [category, entities] of Object.entries(patterns)) {
    if (!entities) continue;
    for (const entity of entities) {
      if (buildMatcher(entity).test(text)) {
        found.push({ name: entity, category, type: categoryToType(category) });
      }
    }
  }
  
  // Extract from custom entities
  customEntities.forEach(ce => {
    if (!ce.isActive) return;
    const terms = [ce.name, ...(ce.synonyms || [])];
    const category = ce.category || 'CUSTOM';
    for (const term of terms) {
      if (buildMatcher(term).test(text)) {
        found.push({ name: ce.name, category: 'custom', type: category });
        break; // Only add once per entity
      }
    }
  });
  
  return found;
};

module.exports = { entityPatterns, extractEntities, categoryToType };
