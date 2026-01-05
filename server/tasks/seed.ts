import { db, schema } from 'hub:db'

export default defineTask({
  meta: {
    name: 'db:seed',
    description: 'Seed database with initial data'
  },
  async run() {
    console.log('Seeding database...')

    // Seed sources
    const sources = [
      {
        "name": "Google News - Fourmis",
        "type": "rss",
        "url": "https://news.google.com/",
        "language": "fr",
        "isActive": true,
        "fetchIntervalMinutes": 60,
        "config": {
          "feedUrl": "https://news.google.com/rss/search?q=fourmis&hl=fr&gl=FR&ceid=FR:fr",
          "needsDecoding": true
        }
      },
      {
        "name": "Google News - Ants",
        "type": "rss",
        "url": "https://news.google.com/",
        "language": "en",
        "isActive": true,
        "fetchIntervalMinutes": 60,
        "config": {
          "feedUrl": "https://news.google.com/rss/search?q=ants&hl=en&gl=GB&ceid=GB:en",
          "needsDecoding": true
        }
      },
      {
        "name": "Google News - Hormigas",
        "type": "rss",
        "url": "https://news.google.com/",
        "language": "es",
        "isActive": true,
        "fetchIntervalMinutes": 60,
        "config": {
          "feedUrl": "https://news.google.com/rss/search?q=hormigas&hl=es&gl=ES&ceid=ES:es",
          "needsDecoding": true
        }
      },
      {
        "name": "Google News - Ameisen",
        "type": "rss",
        "url": "https://news.google.com/",
        "language": "de",
        "isActive": true,
        "fetchIntervalMinutes": 60,
        "config": {
          "feedUrl": "https://news.google.com/rss/search?q=ameisen&hl=de&gl=DE&ceid=DE:de",
          "needsDecoding": true
        }
      },
      {
        "name": "Passion Entomologie",
        "type": "rss",
        "url": "https://passion-entomologie.fr/",
        "language": "fr",
        "isActive": true,
        "fetchIntervalMinutes": 60,
        "config": {
          "feedUrl": "https://passion-entomologie.fr/feed/"
        }
      },
      {
        "name": "Entomology Today",
        "type": "rss",
        "url": "https://entomologytoday.org/",
        "language": "en",
        "isActive": true,
        "fetchIntervalMinutes": 60,
        "config": {
          "feedUrl": "https://entomologytoday.org/feed/"
        }
      },
      {
        "name": "ScienceDaily - Insects",
        "type": "rss",
        "url": "https://www.sciencedaily.com/news/plants_animals/insects_and_butterflies/",
        "language": "en",
        "isActive": true,
        "fetchIntervalMinutes": 60,
        "config": {
          "feedUrl": "https://www.sciencedaily.com/rss/plants_animals/insects_and_butterflies.xml"
        }
      },
      {
        name: 'Science et Avenir - Animaux',
        type: 'rss',
        url: 'https://www.sciencesetavenir.fr/animaux/',
        language: 'fr',
        isActive: true,
        fetchIntervalMinutes: 60,
        config: { feedUrl: 'https://www.sciencesetavenir.fr/nature-environnement/rss.xml' }
      },
      {
        name: 'Flipboard - Animaux',
        type: 'rss',
        url: 'https://flipboard.com/topic/fr-animaux',
        language: 'fr',
        isActive: true,
        fetchIntervalMinutes: 60,
        config: { feedUrl: 'https://flipboard.com/topic/fr-animaux.rss' }
      },
      {
        name: 'Myrmecological News Blog',
        type: 'rss',
        url: 'https://blog.myrmecologicalnews.org/',
        language: 'en',
        isActive: true,
        fetchIntervalMinutes: 60,
        config: { feedUrl: 'https://blog.myrmecologicalnews.org/feed/' }
      },
      {
        name: "Le Blob",
        type: "rss",
        url: "https://leblob.fr/",
        language: "fr",
        isActive: true,
        fetchIntervalMinutes: 60,
        config: {
          "feedUrl": "https://leblob.fr/rss/blob"
        },
      },
      {
        name: "CNRS Le Journal",
        type: "rss",
        url: "https://lejournal.cnrs.fr",
        language: "fr",
        isActive: true,
        fetchIntervalMinutes: 60,
        config: {
          "feedUrl": "https://lejournal.cnrs.fr/rss/7551"
        },
      },
      {
        name: "Les dernières actualités de Futura-Nature",
        type: "rss",
        url: "https://www.futura-sciences.com",
        language: "fr",
        isActive: true,
        fetchIntervalMinutes: 60,
        config: {
          "feedUrl": "https://www.futura-sciences.com/rss/nature/actualites.xml"
        },
      }
    ]

    const insertedSources = await db.insert(schema.sources).values(sources).returning()
    console.log(`✓ Seeded ${insertedSources.length} sources`)

    // Seed sample articles
    const articles = [
      {
        title: 'Régicide et usurpation du trône chez les fourmis',
        slug: 'regicide-et-usurpation-du-trone-chez-les-fourmis',
        content: 'Manipuler les esprits n\'est pas réservé aux humains. Des fourmis le font aussi très bien, ont découvert des chercheurs japonais chez deux espèces parasites. A découvrir en vidéo.',
        summary: 'Manipuler les esprits n\'est pas réservé aux humains. Des fourmis le font aussi très bien, ont découvert des chercheurs japonais chez deux espèces parasites. A découvrir en vidéo.',
        sourceName: 'Science et Avenir - Animaux',
        sourceUrl: 'https://www.sciencesetavenir.fr/animaux/arthropodes/manipuler-les-esprits-n-est-pas-le-propre-des-humains-les-fourmis-y-parviennent-aussi_189330?xtor=RSS-26',
        author: 'Hervé Ratel',
        publishedAt: new Date('2025-11-17T16:00:00Z'),
        language: 'fr',
        imageUrl: 'https://www.sciencesetavenir.fr/assets/img/2025/11/17/cover-r4x3w1200-691b2bd662ace-takasuka-ants-1.jpg',
        tags: ['fourmis', 'parasites', 'recherche', 'comportement', 'manipulation'],
        category: 'research',
        viewCount: 0,
        featured: true
      }
    ]

    const insertedArticles = await db.insert(schema.articles).values(articles).returning()
    console.log(`✓ Seeded ${insertedArticles.length} articles`)

    return {
      result: 'Database seeded successfully',
      sources: insertedSources.length,
      articles: insertedArticles.length
    }
  }
})
