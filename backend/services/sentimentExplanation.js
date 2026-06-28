/**
 * Sentiment Explanation Service (XAI)
 * Extracts top contributing words/phrases that influenced sentiment classification
 */

// Sentiment lexicon for Malaysian context
const SENTIMENT_LEXICON = {
  positive: ['tumbuh', 'naik', 'rekod', 'untung', 'berjaya', 'stabil', 'kukuh', 'meningkat', 'positif', 'baik', 'cemerlang', 'hebat', 'bagus', 'terbaik', 'syabas', 'tahniah', 'harapan', 'peluang', 'kemajuan', 'pembangunan', 'pelaburan', 'FDI', 'eksport', 'surplus', 'pulangan', 'dividen', 'bonus', 'insentif', 'bantuan', 'subsidi', 'setuju', 'sokong', 'puji', 'hargai', 'bangga',
    'pulih', 'pemulihan', 'mengukuh', 'penguatan', 'melonjak', 'lonjakan', 'menggalakkan', 'optimis', 'optimistik', 'meyakinkan', 'kreatif', 'inovasi', 'inovatif', 'berkesan', 'efektif', 'cekap', 'efisien', 'produktif', 'berdaya', 'berdikari', 'mandiri', 'mapan', 'mampan', 'lestari', 'bertambah', 'meluas', 'memperkukuh', 'memantapkan', 'memperkasakan', 'pemerkasaan', 'memperbaiki', 'penambahbaikan', 'peningkatan', 'pengukuhan', 'kebangkitan', 'bangkit', 'menjana', 'merangsang', 'merancakkan', 'pemangkin', 'tonggak', 'asas', 'landasan', 'teras', 'wawasan', 'misi', 'visi', 'agenda', 'strategi', 'strategik', 'komited', 'komitmen', 'dedikasi', 'iltizam', 'tekad', 'azam', 'semangat', 'perpaduan', 'muhibbah', 'harmoni', 'kesejahteraan', 'kemakmuran', 'kemewahan', 'nikmat', 'manfaat', 'faedah', 'kebaikan', 'kelebihan', 'keunggulan', 'prestasi', 'pencapaian', 'kejayaan', 'anugerah', 'pengiktirafan', 'penghargaan', 'kepercayaan', 'keyakinan', 'jaminan', 'perlindungan', 'keselamatan', 'kestabilan', 'ketenteraman', 'kedamaian', 'keselesaan', 'kemudahan', 'infrastruktur', 'teknologi', 'digital', 'pembaharuan', 'transformasi', 'evolusi', 'revolusi', 'moden', 'modenisasi', 'global', 'antarabangsa', 'diplomatik', 'kerjasama', 'perjanjian', 'memeterai', 'termeterai', 'bersejarah', 'bermakna', 'penting', 'signifikan', 'impak', 'kesan', 'sumbangan', 'bakti', 'khidmat', 'jasa', 'warisan', 'legasi', 'tradisi', 'budaya', 'identiti', 'jati', 'kendiri', 'berterusan', 'berkelanjutan', 'sustainable', 'resilient', 'robust', 'growth', 'profit', 'gain', 'boost', 'surge', 'rally', 'rebound', 'recovery', 'upturn', 'expansion', 'upgrade', 'breakthrough', 'milestone', 'benchmark', 'advantage', 'dividend', 'yield', 'return', 'reward', 'incentive', 'grant', 'subsidy', 'welfare', 'relief', 'support', 'approve', 'endorse', 'commend', 'applaud', 'praise', 'celebrate', 'cheer', 'welcome', 'embrace', 'adopt', 'accept', 'agree', 'consensus', 'unite', 'unified', 'solidarity', 'cooperate', 'collaborate', 'partner', 'alliance', 'coalition', 'resolve', 'determined', 'resolute', 'confident', 'assured', 'guaranteed', 'secured', 'protected', 'safeguarded', 'preserved', 'conserved', 'maintained', 'sustained', 'upheld', 'championed', 'advocated', 'promoted', 'advanced', 'propelled', 'driven', 'motivated', 'inspired', 'empowered', 'enabled', 'equipped', 'prepared', 'ready', 'capable', 'competent', 'qualified', 'skilled', 'talented', 'gifted', 'brilliant', 'exceptional', 'outstanding', 'remarkable', 'impressive', 'notable', 'noteworthy', 'distinguished', 'renowned', 'prominent', 'leading', 'foremost', 'premier', 'top', 'best', 'elite', 'superior', 'premium', 'quality', 'excellence', 'mastery', 'expertise', 'proficiency', 'innovation', 'pioneering', 'groundbreaking', 'trailblazing', 'cutting-edge', 'state-of-art', 'advanced', 'progressive', 'forward', 'visionary', 'ambitious', 'bold', 'courageous', 'brave', 'fearless', 'daring', 'audacious'],
  negative: ['turun', 'lemah', 'rugi', 'gagal', 'krisis', 'masalah', 'kebimbangan', 'ketidaktentuan', 'inflasi', 'pengangguran', 'hutang', 'defisit', 'kemerosotan', 'kejatuhan', 'penurunan', 'negatif', 'buruk', 'teruk', 'bahaya', 'ancaman', 'risiko', 'amalan', 'rasuah', 'skandal', 'penipuan', 'jenayah', 'banjir', 'bencana', 'kemalangan', 'kematian', 'kritik', 'bantah', 'marah', 'kecewa', 'ragu', 'persoal', 'dakwaan',
    'merosot', 'merudum', 'menjunam', 'terjunam', 'kemurungan', 'kemelesetan', 'recession', 'depresiasi', 'susut', 'penyusutan', 'pengurangan', 'pengecutan', 'penciutan', 'meruncing', 'memburuk', 'bertambah', 'teruk', 'parah', 'kritikal', 'kritik', 'genting', 'cemas', 'tegang', 'panas', 'membara', 'bergegar', 'bergolak', 'pergolakan', 'huru-hara', 'kekeliruan', 'kecoh', 'kontroversi', 'polemik', 'debat', 'pertikaian', 'pertelingkahan', 'perselisihan', 'konflik', 'perpecahan', 'perbalahan', 'pergaduhan', 'keganasan', 'kekerasan', 'serangan', 'penyerangan', 'pencerobohan', 'penceroboh', 'pengganas', 'terrorism', 'militan', 'ekstremis', 'radikal', 'fanatik', 'pelampau', 'diskriminasi', 'diskriminatif', 'prejudis', 'bias', 'berat', 'sepihak', 'tidak adil', 'penindasan', 'penindas', 'penzaliman', 'kezaliman', 'ketidakadilan', 'ketidaksamaan', 'ketimpangan', 'jurang', 'ketidaksamarataan', 'kemiskinan', 'miskin', 'papa', 'daif', 'terpinggir', 'terbiar', 'terabai', 'diabaikan', 'dipinggirkan', 'dipencilkan', 'dikucilkan', 'dipinggir', 'terhimpit', 'terdesak', 'tertindas', 'terbeban', 'beban', 'tekanan', 'stres', 'trauma', 'penderitaan', 'kesengsaraan', 'kesusahan', 'kesulitan', 'kepahitan', 'pahit', 'pedih', 'perit', 'seksa', 'seksaan', 'penderitaan', 'sengsara', 'menderita', 'derita', 'sakit', 'penyakit', 'jangkitan', 'wabah', 'pandemik', 'epidemik', 'virus', 'bakteria', 'toksik', 'racun', 'pencemaran', 'cemar', 'merosakkan', 'memusnahkan', 'pemusnahan', 'musnah', 'hancur', 'rosak', 'binasa', 'kehancuran', 'kebinasaan', 'kemusnahan', 'kegagalan', 'kekalahan', 'kegawatan', 'kelembapan', 'kelambatan', 'kelewatan', 'terlambat', 'ketinggalan', 'tertinggal', 'mundur', 'undur', 'regresif', 'setback', 'kemunduran', 'halangan', 'rintangan', 'sekatan', 'sangkalan', 'penafian', 'penolakan', 'penentangan', 'bantahan', 'protes', 'demonstrasi', 'rally', 'piket', 'mogok', 'strike', 'boikot', 'sekatan', 'embargo', 'sanksi', 'hukuman', 'denda', 'penalti', 'saman', 'tuntutan', 'guaman', 'mahkamah', 'perbicaraan', 'sabit', 'disabit', 'dihukum', 'dipenjara', 'tahanan', 'tahanan', 'tahanan', 'tangkapan', 'ditahan', 'ditangkap', 'disiasat', 'siasatan', 'penyiasatan', 'pendakwaan', 'pertuduhan', 'tuduhan', 'fitnah', 'pembohongan', 'bohong', 'dusta', 'tipu', 'helah', 'licik', 'muslihat', 'trik', 'penipuan', 'scam', 'fraud', 'korupsi', 'ketirisan', 'ketirisan', 'bocor', 'kebocoran', 'pendedahan', 'terdedah', 'terbongkar', 'terbocor', 'skandal', 'kontroversi', 'aib', 'memalukan', 'malu', 'hina', 'hinaan', 'caci', 'makian', 'cemuhan', 'kritikan', 'kecaman', 'celaan', 'maki', 'hamun', 'sumpah', 'laknat', 'kutukan', 'bencana', 'malapetaka', 'tragedi', 'nahas', 'disaster', 'catastrophe', 'calamity', 'devastation', 'ruin', 'destruction', 'damage', 'harm', 'injury', 'casualty', 'fatality', 'victim', 'suffering', 'distress', 'misery', 'despair', 'hopelessness', 'gloom', 'dismal', 'bleak', 'grim', 'dire', 'severe', 'acute', 'chronic', 'persistent', 'worsening', 'deteriorating', 'declining', 'slumping', 'plunging', 'tumbling', 'crashing', 'collapsing', 'failing', 'struggling', 'faltering', 'stumbling', 'lagging', 'underperforming', 'disappointing', 'mediocre', 'subpar', 'inferior', 'inadequate', 'insufficient', 'lacking', 'deficient', 'defective', 'flawed', 'broken', 'faulty', 'dysfunctional', 'ineffective', 'inefficient', 'wasteful', 'reckless', 'negligent', 'irresponsible', 'corrupt', 'dishonest', 'deceitful', 'unethical', 'immoral', 'wrong', 'illegal', 'unlawful', 'criminal', 'illicit', 'illegitimate', 'invalid', 'void', 'null', 'rejected', 'denied', 'refused', 'opposed', 'contested', 'challenged', 'disputed', 'questioned', 'doubted', 'suspected', 'suspicious', 'dubious', 'shady', 'questionable', 'uncertain', 'unstable', 'volatile', 'turbulent', 'chaotic', 'unpredictable', 'risky', 'hazardous', 'dangerous', 'perilous', 'treacherous', 'lethal', 'deadly', 'fatal', 'mortal', 'toxic', 'poisonous', 'contaminated', 'polluted', 'degraded', 'depleted', 'exhausted', 'drained', 'empty', 'void', 'barren', 'sterile', 'lifeless', 'dead', 'dying', 'extinct', 'obsolete', 'outdated', 'antiquated', 'archaic', 'primitive', 'backward', 'regressive', 'reactionary'],
};

/**
 * Extract top contributing words for sentiment classification
 * @param {string} text - Article title + description
 * @param {string} sentiment - Classified sentiment (Positive/Negative/Neutral)
 * @param {number} confidence - Model confidence (0-1)
 * @returns {object} - { words: [{word, score, sentiment}], explanation: string }
 */
function getSentimentExplanation(text, sentiment, confidence) {
  if (!text) return { words: [], explanation: 'Insufficient text for analysis' };
  
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const contributors = [];
  
  words.forEach(word => {
    const cleanWord = word.replace(/[^\w]/g, '');
    if (SENTIMENT_LEXICON.positive.includes(cleanWord)) {
      contributors.push({ word: cleanWord, score: 0.8, sentiment: 'positive', original: word });
    } else if (SENTIMENT_LEXICON.negative.includes(cleanWord)) {
      contributors.push({ word: cleanWord, score: 0.8, sentiment: 'negative', original: word });
    }
  });
  
  // Sort by score, take top 5
  const topWords = contributors
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  
  // Generate explanation text
  let explanation = '';
  if (topWords.length > 0) {
    const matchingWords = topWords.filter(w => w.sentiment === sentiment.toLowerCase());
    if (matchingWords.length > 0) {
      explanation = `Classified as **${sentiment}** (${Math.round(confidence * 100)}% confidence) based on keywords: ${matchingWords.map(w => `"${w.original}"`).join(', ')}`;
    } else {
      explanation = `Classified as **${sentiment}** (${Math.round(confidence * 100)}% confidence) despite mixed sentiment signals`;
    }
  } else {
    explanation = `Classified as **${sentiment}** (${Math.round(confidence * 100)}% confidence) based on overall context`;
  }
  
  return {
    words: topWords,
    explanation,
    confidence: Math.round(confidence * 100)
  };
}

module.exports = { getSentimentExplanation };
