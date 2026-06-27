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

/**
 * Extract entities from a text blob.
 * Case-insensitive substring match against the curated pattern list.
 * @param {string} text
 * @param {string} [typeFilter] optional category key
 * @returns {{name:string, category:string, type:string}[]}
 */
const extractEntities = (text, typeFilter) => {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = [];
  const patterns = typeFilter ? { [typeFilter]: entityPatterns[typeFilter] } : entityPatterns;
  for (const [category, entities] of Object.entries(patterns)) {
    if (!entities) continue;
    for (const entity of entities) {
      if (lower.includes(entity.toLowerCase())) {
        found.push({ name: entity, category, type: categoryToType(category) });
      }
    }
  }
  return found;
};

module.exports = { entityPatterns, extractEntities, categoryToType };
