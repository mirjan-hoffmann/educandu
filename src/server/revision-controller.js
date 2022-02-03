import urls from '../utils/urls.js';
import httpErrors from 'http-errors';
import PageRenderer from './page-renderer.js';
import { PAGE_NAME } from '../domain/page-name.js';
import ClientDataMapper from './client-data-mapper.js';
import DocumentService from '../services/document-service.js';

const { NotFound } = httpErrors;

class RevisionController {
  static get inject() { return [DocumentService, ClientDataMapper, PageRenderer]; }

  constructor(documentService, clientDataMapper, pageRenderer) {
    this.documentService = documentService;
    this.clientDataMapper = clientDataMapper;
    this.pageRenderer = pageRenderer;
  }

  handleGetArticlePage(req, res) {
    res.redirect(301, urls.getDocumentRevisionUrl(req.params.id));
  }

  async handleGetRevisionPage(req, res) {
    const revision = await this.documentService.getDocumentRevisionById(req.params.id);

    if (!revision) {
      throw new NotFound();
    }

    const mappedRevision = await this.clientDataMapper.mapDocOrRevision(revision, req.user);
    return this.pageRenderer.sendPage(req, res, PAGE_NAME.revision, { revision: mappedRevision });
  }

  registerPages(router) {
    router.get(
      '/revs/articles/:id',
      (req, res) => this.handleGetArticlePage(req, res)
    );

    router.get(
      '/revs/:id',
      (req, res) => this.handleGetRevisionPage(req, res)
    );
  }
}

export default RevisionController;