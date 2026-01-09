#!/usr/bin/env node

/**
 * Newsletter Generation Script
 * 
 * Fetches articles from the API, uses AI to select the top 3 most interesting ones,
 * and generates a French newsletter with intro, summaries, and key points.
 * 
 * Environment variables:
 * - DATABASE_URL: PostgreSQL connection string (for direct DB access fallback)
 * - OPENROUTER_API_KEY: OpenRouter API key for AI content generation
 * - API_BASE_URL: Optional, defaults to https://news.antkeeper.com
 */

const fs = require('fs');
const path = require('path');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MODEL = 'mistralai/mistral-7b-instruct:free';
const API_BASE_URL = process.env.API_BASE_URL || 'https://news.antkeeper.com';

const NEWSLETTERS_DIR = path.join(__dirname, '..', 'newsletters');

async function fetchArticles() {
  console.log('📰 Fetching articles from the last week...');
  
  try {
    const url = `${API_BASE_URL}/api/articles?dateRange=week&limit=50`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }
    
    const data = await response.json();
    const articles = data.articles || [];
    
    console.log(`✅ Fetched ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error(`❌ Failed to fetch articles: ${error.message}`);
    throw error;
  }
}

async function callOpenRouter(systemPrompt, userPrompt, retryCount = 0) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 5000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://news.antkeeper.com',
        'X-Title': 'Antkeeper News Newsletter'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
        console.warn(`⏳ Rate limit hit, retrying in ${delay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callOpenRouter(systemPrompt, userPrompt, retryCount + 1);
      }
      throw new Error('Rate limit exceeded after max retries');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response content from AI model');
    }

    return content;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

async function selectTopArticles(articles) {
  console.log('🤖 Using AI to select top 3 articles...');

  if (articles.length === 0) {
    console.warn('⚠️ No articles to select from');
    return [];
  }

  if (articles.length <= 3) {
    console.log(`ℹ️ Only ${articles.length} articles available, using all`);
    return articles;
  }

  const articleSummaries = articles.map((article, index) => {
    return `[${index + 1}] ${article.title}
   Category: ${article.category || 'news'}
   Tags: ${(article.tags || []).join(', ')}
   Summary: ${(article.summary || '').substring(0, 200)}...
   Source: ${article.sourceName}
   Date: ${article.publishedAt}`;
  }).join('\n\n');

  const systemPrompt = `Tu es un expert en myrmécologie et rédacteur de newsletter scientifique. 
Ton rôle est de sélectionner les 3 articles les plus intéressants pour une newsletter hebdomadaire.

Critères de sélection:
1. Importance scientifique (nouvelles découvertes, recherche originale)
2. Intérêt pour les passionnés de fourmis (comportement, écologie, conservation)
3. Qualité et fiabilité de la source
4. Originalité du sujet (éviter les sujets trop communs)
5. Variété des thèmes (ne pas prendre 3 articles sur le même sujet)

Réponds UNIQUEMENT avec les numéros des 3 articles sélectionnés, séparés par des virgules.
Exemple: 1, 5, 12`;

  const userPrompt = `Voici les articles de cette semaine:\n\n${articleSummaries}\n\nSélectionne les 3 articles les plus intéressants pour la newsletter.`;

  try {
    const response = await callOpenRouter(systemPrompt, userPrompt);
    
    const numbers = response.match(/\d+/g);
    if (!numbers || numbers.length < 3) {
      console.warn('⚠️ AI selection unclear, using first 3 articles as fallback');
      return articles.slice(0, 3);
    }

    const selectedIndices = numbers.slice(0, 3).map(n => parseInt(n, 10) - 1);
    const selectedArticles = selectedIndices
      .filter(i => i >= 0 && i < articles.length)
      .map(i => articles[i]);

    if (selectedArticles.length < 3) {
      console.warn('⚠️ Some selected indices invalid, filling with first articles');
      while (selectedArticles.length < 3 && selectedArticles.length < articles.length) {
        const nextArticle = articles.find(a => !selectedArticles.includes(a));
        if (nextArticle) selectedArticles.push(nextArticle);
        else break;
      }
    }

    console.log(`✅ Selected articles: ${selectedIndices.map(i => i + 1).join(', ')}`);
    return selectedArticles;
  } catch (error) {
    console.error(`❌ AI selection failed: ${error.message}`);
    console.log('ℹ️ Falling back to first 3 articles');
    return articles.slice(0, 3);
  }
}

async function generateNewsletterContent(articles) {
  console.log('✍️ Generating newsletter content...');

  if (articles.length === 0) {
    return generateEmptyNewsletter();
  }

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRange = `${formatDateFr(weekAgo)} au ${formatDateFr(today)}`;

  const articlesContext = articles.map((article, index) => {
    return `Article ${index + 1}:
Titre: ${article.title}
Source: ${article.sourceName} (${article.sourceUrl})
Date: ${article.publishedAt}
Image: ${article.imageUrl || 'Pas d\'image'}
Catégorie: ${article.category || 'news'}
Tags: ${(article.tags || []).join(', ')}
Résumé: ${article.summary || 'Pas de résumé'}
Contenu: ${(article.content || '').substring(0, 1000)}...`;
  }).join('\n\n---\n\n');

  const systemPrompt = `Tu es le rédacteur de la newsletter "Antkeeper News", une publication hebdomadaire francophone dédiée à l'actualité myrmécologique.

Ton style:
- Passionné mais professionnel
- Accessible aux amateurs tout en restant scientifiquement rigoureux
- Enthousiaste sans être excessif

Tu dois générer le contenu Markdown de la newsletter avec:
1. Un titre avec la plage de dates
2. Une introduction engageante (2-3 phrases) présentant les thèmes de la semaine
3. Pour chaque article:
   - Un titre numéroté accrocheur
   - L'image si disponible (format Markdown)
   - Un paragraphe de présentation captivant
   - 3 points clés en bullet points
   - La source avec lien et date
   - Les "Également couvert par" si pertinent (inventé si non fourni)
4. Une signature de clôture

Format Markdown strict. Pas de balises HTML.`;

  const userPrompt = `Date de la newsletter: Semaine du ${dateRange}

Articles sélectionnés:

${articlesContext}

Génère la newsletter complète en français.`;

  try {
    const content = await callOpenRouter(systemPrompt, userPrompt);
    console.log('✅ Newsletter content generated');
    return content;
  } catch (error) {
    console.error(`❌ Content generation failed: ${error.message}`);
    return generateFallbackNewsletter(articles, dateRange);
  }
}

function generateEmptyNewsletter() {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRange = `${formatDateFr(weekAgo)} au ${formatDateFr(today)}`;

  return `# Newsletter Antkeeper - Semaine du ${dateRange}

Aucun article n'a été publié cette semaine. Revenez la semaine prochaine pour de nouvelles découvertes myrmécologiques !

---

*Newsletter générée automatiquement par Antkeeper News*`;
}

function generateFallbackNewsletter(articles, dateRange) {
  let content = `# Newsletter Antkeeper - Semaine du ${dateRange}

Bienvenue dans cette nouvelle édition de notre newsletter hebdomadaire dédiée à l'actualité myrmécologique !

---

`;

  articles.forEach((article, index) => {
    content += `## ${index + 1}. ${article.title}

`;
    if (article.imageUrl) {
      content += `![Image de l'article](${article.imageUrl})

`;
    }
    content += `${article.summary || 'Résumé non disponible.'}

**Source** : [${article.sourceName}](${article.sourceUrl}) | ${formatDateFr(new Date(article.publishedAt))}

---

`;
  });

  content += `*Newsletter générée automatiquement par Antkeeper News*`;
  return content;
}

function formatDateFr(date) {
  const d = new Date(date);
  const day = d.getDate();
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function writeNewsletter(content) {
  if (!fs.existsSync(NEWSLETTERS_DIR)) {
    fs.mkdirSync(NEWSLETTERS_DIR, { recursive: true });
    console.log(`📁 Created newsletters directory: ${NEWSLETTERS_DIR}`);
  }

  const today = new Date();
  const filename = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.md`;
  const filepath = path.join(NEWSLETTERS_DIR, filename);

  fs.writeFileSync(filepath, content, 'utf-8');
  console.log(`✅ Newsletter written to: ${filepath}`);
  return filepath;
}

async function main() {
  console.log('🐜 Antkeeper News - Newsletter Generator\n');

  try {
    if (!OPENROUTER_API_KEY) {
      console.error('❌ OPENROUTER_API_KEY environment variable is required');
      process.exit(1);
    }

    const articles = await fetchArticles();
    
    const topArticles = await selectTopArticles(articles);
    
    const content = await generateNewsletterContent(topArticles);
    
    const filepath = writeNewsletter(content);

    console.log('\n🎉 Newsletter generation complete!');
    console.log(`📄 File: ${filepath}`);
    
  } catch (error) {
    console.error(`\n❌ Newsletter generation failed: ${error.message}`);
    process.exit(1);
  }
}

main();
