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
        name: 'Science et Avenir - Animaux',
        type: 'rss',
        url: 'https://www.sciencesetavenir.fr/animaux/',
        isActive: true,
        fetchIntervalMinutes: 60,
        config: { feedUrl: 'https://www.sciencesetavenir.fr/nature-environnement/rss.xml', language: 'fr' }
      },
      {
        name: 'Myrmecological News Blog',
        type: 'rss',
        url: 'https://blog.myrmecologicalnews.org/',
        isActive: true,
        fetchIntervalMinutes: 60,
        config: { feedUrl: 'https://blog.myrmecologicalnews.org/feed/', language: 'en' }
      },
      {
        name: 'Google News',
        type: 'api',
        url: 'https://news.google.com/search?q=fourmis+myrmecologie&hl=fr&gl=FR&ceid=FR:fr',
        isActive: true,
        fetchIntervalMinutes: 120,
        config: { feedUrl: 'https://news.google.com/rss/search?q=fourmis+myrmecologie&hl=fr&gl=FR&ceid=FR:fr', language: 'fr' }
      }
    ]

    const insertedSources = await db.insert(schema.sources).values(sources).returning()
    console.log(`✓ Seeded ${insertedSources.length} sources`)

    // Seed sample articles
    const articles = [
      {
        title: 'New Species of Fire Ant Discovered in Amazon Rainforest',
        slug: 'new-species-fire-ant-discovered-amazon',
        content: 'Researchers have identified a previously unknown species of fire ant in the Amazon rainforest. This discovery adds to our understanding of ant biodiversity in tropical regions.',
        summary: 'Scientists discover a new fire ant species in the Amazon, expanding our knowledge of tropical ant diversity.',
        sourceName: 'AntBlog',
        sourceUrl: 'https://antblog.info/2024/new-fire-ant-species',
        author: 'Dr. Maria Santos',
        publishedAt: new Date('2024-11-15T10:30:00Z'),
        language: 'en',
        imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800',
        tags: ['fire ants', 'new species', 'amazon', 'research'],
        category: 'research',
        viewCount: 0,
        featured: true
      },
      {
        title: 'Leafcutter Ants: Master Gardeners of the Insect World',
        slug: 'leafcutter-ants-master-gardeners',
        content: 'Leafcutter ants are fascinating creatures that cultivate fungus gardens to feed their colonies. This article explores their agricultural practices and social structure.',
        summary: 'Learn about the incredible farming techniques of leafcutter ants and their complex societies.',
        sourceName: 'AntWiki',
        sourceUrl: 'https://www.antwiki.org/wiki/Leafcutter_ants',
        author: 'Prof. John Wilson',
        publishedAt: new Date('2024-11-10T14:00:00Z'),
        language: 'en',
        imageUrl: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=800',
        tags: ['leafcutter ants', 'behavior', 'agriculture'],
        category: 'care',
        viewCount: 0,
        featured: false
      },
      {
        title: 'How to Start Your First Ant Colony: A Beginner\'s Guide',
        slug: 'how-to-start-first-ant-colony-beginners-guide',
        content: 'Starting an ant colony can be a rewarding hobby. This comprehensive guide covers everything from selecting the right species to setting up your formicarium.',
        summary: 'Complete beginner\'s guide to starting and maintaining your first ant colony.',
        sourceName: 'AntBlog',
        sourceUrl: 'https://antblog.info/beginners-guide',
        author: 'Mike Anderson',
        publishedAt: new Date('2024-11-05T09:15:00Z'),
        language: 'en',
        imageUrl: 'https://images.unsplash.com/photo-1516934024742-b461fba47600?w=800',
        tags: ['beginner', 'antkeeping', 'setup', 'formicarium'],
        category: 'care',
        viewCount: 0,
        featured: false
      },
      {
        title: 'Argentine Ants Form Mega-Colony Spanning Multiple Continents',
        slug: 'argentine-ants-mega-colony-multiple-continents',
        content: 'A groundbreaking study reveals that Argentine ants have formed a massive supercolony spanning across Europe, North America, and Asia, with individual ants showing no aggression toward members from distant locations.',
        summary: 'Research shows Argentine ants have created an unprecedented intercontinental mega-colony.',
        sourceName: 'Google News',
        sourceUrl: 'https://example.com/argentine-ants-megacolony',
        author: 'Science Daily',
        publishedAt: new Date('2024-11-01T16:45:00Z'),
        language: 'en',
        imageUrl: 'https://images.unsplash.com/photo-1509715513011-e394f0cb20c4?w=800',
        tags: ['argentine ants', 'invasive species', 'supercolony', 'research'],
        category: 'news',
        viewCount: 0,
        featured: true
      },
      {
        title: 'Dans l’univers des influenceurs fourmis : « Il est difficile d’exprimer la joie provoquée par le fait de trouver sa première reine »',
        slug: 'dans-l-univers-des-influenceurs-fourmis',
        content: 'Dans l’univers des influenceurs fourmis : « Il est difficile d’exprimer la joie provoquée par le fait de trouver sa première reine »',
        summary: 'Dans l’univers des influenceurs fourmis : « Il est difficile d’exprimer la joie provoquée par le fait de trouver sa première reine »',
        sourceName: 'Le Monde.fr',
        sourceUrl: 'https://news.google.com/rss/articles/CBMiowJBVV95cUxOVzhtNnRPZFhqSUcwdlhMR04zNnlZUkZPVFlIa0NlMHdFX0Z0WTlVQkgtRjVVQ2l6cGZPczFkMXNyOXpHZmxieS1oRkNleklCYjAyWjU2ZTVFemo3cG81SUdjT0xwZE1OMS1mVzlnZVA4VFdhTDdGWmJNRFlwTW1GamYtZGpKeGRxb0JWQmJJTkRDc0FIYVc0WjBhUG9ZWXRXbk1ZMWJLbkhnY09NUzdLdTZWaEQ3OWdmdXVfUlk5amxkN1NhYk5wWnpQWG9pTFBmWkwtX1UxLVBRNjZiOVBiT2lYbDhSRVMxSFY4VjhhZ2NQdVNkdkVjcXBVakV5UjY0N0ZtZEpFWnBHTXY5eC1kVEhyOHRMTDUyRmtXTHI2a3pmUG8?oc=5',
        author: 'Le Monde.fr',
        publishedAt: new Date('2025-11-02T07:00:00Z'),
        language: 'fr',
        imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800',
        tags: ['fourmis', 'influenceurs', 'reine'],
        category: 'news',
        viewCount: 0,
        featured: false
      },
      {
        title: 'Le monde des mordus de fourmis : « Certains se fichent de savoir à qui ils vendent, tant que l’argent tombe',
        slug: 'le-monde-des-mordus-de-fourmis',
        content: 'Le monde des mordus de fourmis : « Certains se fichent de savoir à qui ils vendent, tant que l’argent tombe',
        summary: 'Le monde des mordus de fourmis : « Certains se fichent de savoir à qui ils vendent, tant que l’argent tombe',
        sourceName: 'Soirmag',
        sourceUrl: 'https://news.google.com/rss/articles/CBMixwFBVV95cUxQd18weFdqSEw0UkF5cG0tZTdGTTBpckFCZGRITDRUblVSNDBkT0Rad25OdThmRDJmMzB2MDQzLUsxLS02VHpQWHFjb0RjZloxTU0wZkF4WlJnVVk4eHU3UTNGYWh2Und0b2Z5cmhCMWRUVUkyQ1lRU0Jsd3VnV2NERm5zTkNUTE1zd3o0WmI2T1o0b0tBbTBYc3ViUURzTl9pR1FRS2pqY1FtT1ZhczJYVmVQeUpmLUJRdExFQ2hLMk9mdkVBdDNz?oc=5',
        author: 'Soirmag',
        publishedAt: new Date('2025-11-20T08:00:00Z'),
        language: 'fr',
        imageUrl: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=800',
        tags: ['fourmis', 'mordus', 'vente'],
        category: 'news',
        viewCount: 0,
        featured: false
      },
      {
        title: 'Fourmis, araignée, serpent, le drôle d\'élevage de Mélanie Bringer et de Florent Gutierrez',
        slug: 'fourmis-araignee-serpent-le-drole-d-elevage',
        content: 'Fourmis, araignée, serpent, le drôle d\'élevage de Mélanie Bringer et de Florent Gutierrez',
        summary: 'Fourmis, araignée, serpent, le drôle d\'élevage de Mélanie Bringer et de Florent Gutierrez',
        sourceName: 'Midi Libre',
        sourceUrl: 'https://news.google.com/rss/articles/CBMizwFBVV95cUxPU0tSZnBzNWtaQnhwQWIzMUhuYWRwMFpJaDFRdTBDWjVLakpoTWJrSFBENWx3Tms2d3RqZWhpNnJLQWtPTlYxcnR0V2sySzZtSGNBR2pqU0RwcWlZYXNMcDFnMF9GdkJKekZ0dzdOZ1gwMnhpX0Q1dVBLUGJicVg5U0s4UUFLck5sdklpTWlKdlNWcmhpQXJwTk1zVC16NlNoUklTcktsZklmMDZjVEVxNEtvenhYYk9pMTVJVmllbk5TYm13TzAybV9Ib0VnM3c?oc=5',
        author: 'Midi Libre',
        publishedAt: new Date('2025-10-30T07:00:00Z'),
        language: 'fr',
        imageUrl: 'https://images.unsplash.com/photo-1516934024742-b461fba47600?w=800',
        tags: ['fourmis', 'elevage', 'araignee', 'serpent'],
        category: 'news',
        viewCount: 0,
        featured: false
      },
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
