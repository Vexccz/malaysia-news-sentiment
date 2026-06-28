const Article = require('../models/Article');

const KEYWORDS = {
  politics: ['pilihan raya', 'pru', 'parlimen', 'politik', 'parti', 'bersatu', 'umno', 'dap', 'pas', 'pkr', 'anwar', 'mahathir', 'menteri', 'cabinet', 'election', 'vote', 'polls'],
  economy: ['ekonomi', 'gdp', 'inflasi', 'ringgit', 'bursa', 'market', 'trade', 'export', 'import', 'budget', 'fiscal', 'bank negara', 'oPR', 'interest rate'],
  crime: ['jenayah', 'polis', 'arrest', 'suspect', 'murder', 'robbery', 'fraud', 'scam', 'drug', 'narkoba', 'court', 'mahkamah', 'sentence'],
  sports: ['sukan', 'bola', 'football', 'badminton', 'hockey', 'olympics', 'sea games', 'liga', 'piala', 'tournament', 'pemain', 'coach'],
  tech: ['teknologi', 'ai', 'digital', 'cyber', 'startup', '5g', 'data', 'software', 'app', 'internet', 'tech', 'innovation'],
  health: ['kesihatan', 'hospital', 'covid', 'vaksin', 'disease', 'penyakit', 'kkm', 'medical', 'pandemic', 'mental health'],
  education: ['pendidikan', 'sekolah', 'universiti', 'spm', 'stpm', 'pelajar', 'guru', 'cikgu', 'ministry of education', 'kurikulum'],
  environment: ['alam', 'hutan', 'banjir', 'climate', 'pollution', 'pencemaran', 'deforestation', 'wildlife', 'conservation', 'green']
};

async function suggestCategory(articleId) {
  const article = await Article.findById(articleId).lean();
  if (!article) return { category: null, confidence: 0 };
  
  const text = `${article.title || ''} ${article.description || ''} ${(article.categories || []).join(' ')}`.toLowerCase();
  
  const scores = {};
  for (const [cat, keywords] of Object.entries(KEYWORDS)) {
    scores[cat] = keywords.filter(kw => text.includes(kw)).length;
  }
  
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topCat, topScore] = sorted[0];
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  
  if (topScore === 0) return { category: 'General', confidence: 0 };
  
  return {
    category: topCat.charAt(0).toUpperCase() + topCat.slice(1),
    confidence: total > 0 ? parseFloat((topScore / total).toFixed(2)) : 0,
    scores
  };
}

async function autoAssignFolder(userId, articleId, UserModel) {
  const suggestion = await suggestCategory(articleId);
  if (!suggestion.category || suggestion.category === 'General') {
    return { assigned: false, category: 'General' };
  }
  
  const folderName = suggestion.category;
  const user = await UserModel.findById(userId);
  if (!user) return { assigned: false, error: 'User not found' };
  
  // Find or create folder
  let folder = user.bookmarkFolders?.find(f => f.name === folderName);
  if (!folder) {
    if (!user.bookmarkFolders) user.bookmarkFolders = [];
    user.bookmarkFolders.push({ name: folderName, color: '#6B7280' });
    folder = user.bookmarkFolders[user.bookmarkFolders.length - 1];
  }
  
  // Assign bookmark to folder
  const bookmark = user.bookmarks?.find(b => b.articleId?.toString() === articleId.toString() || b.article?.toString() === articleId.toString());
  if (bookmark && folder._id) {
    bookmark.folder = folder._id;
  }
  
  await user.save();
  
  return { assigned: true, category: folderName, folderId: folder._id };
}

module.exports = { suggestCategory, autoAssignFolder };
