const englishKeywords = ['ants', 'myrmecology']
const frenchKeywords = ['fourmis', 'myrmécologie']
const spanishKeywords = ['hormigas', 'mirmecología']
const germanKeywords = ['ameisen', 'myrmekologie']

export function matchesKeywords(title: string, description: string, language: string): boolean {
  const text = `${title} ${description}`.toLowerCase()

  // Select keywords based on language
  let keywords: string[]
  switch (language) {
    case 'fr':
      keywords = frenchKeywords
      break
    case 'es':
      keywords = spanishKeywords
      break
    case 'de':
      keywords = germanKeywords
      break
    case 'en':
    default:
      keywords = englishKeywords
  }

  // Check if any keyword appears in the text
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      return true
    }
  }

  return false
}
