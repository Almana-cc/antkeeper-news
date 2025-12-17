export default eventHandler(async (_) => {
    return await db.query.articles.findMany()
})