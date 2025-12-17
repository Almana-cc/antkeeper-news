const englishKeywords = ['ants', 'myrmecology']
const frenchKeywords = ['fourmis', 'myrmécologie']

export function matchesKeywords(title: string, description: string, language: string): boolean {
  const text = `${title} ${description}`.toLowerCase()

  // Select keywords based on language
  const keywords = language === 'fr' ? frenchKeywords : englishKeywords

  // Check if any keyword appears in the text
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      return true
    }
  }

  return false
}
