import httpErrors from 'http-errors';
import routes from '../utils/routes.js';
import DocumentStore from '../stores/document-store.js';

const { NotFound } = httpErrors;

class ArticlesController {
  static get inject() { return [DocumentStore]; }

  constructor(documentStore) {
    this.documentStore = documentStore;
  }

  registerPages(router) {
    router.get('/lessons/*', async (req, res) => {
      const slug = req.params[0] || '';
      const doc = await this.documentStore.findOne({ slug });
      if (!doc) {
        throw new NotFound(`Lesson '${slug}' could  not be found`);
      }

      res.redirect(301, routes.getDocUrl({ id: doc._id, slug: doc.slug }));
    });
  }
}

export default ArticlesController;
