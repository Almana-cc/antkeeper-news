import { getTranslatedTags, getAllTranslationsForLocale } from '../../services/tag-translation.service'

export default defineCachedEventHandler(async (event) => {
  const query = getQuery(event)
  const locale = (query.locale as string) || 'en'
  const tags = query.tags as string | string[] | undefined

  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags]
    const translations = await getTranslatedTags(tagArray, locale)
    return { translations }
  }

  const translations = await getAllTranslationsForLocale(locale)
  return { translations }
}, { maxAge: 60 * 60 * 5 /* 5 hours */ })
