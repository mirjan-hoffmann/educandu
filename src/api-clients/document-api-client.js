import HttpClient from './http-client.js';

class DocumentApiClient {
  static inject() { return [HttpClient]; }

  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  getDocument(key) {
    return this.httpClient
      .get(
        `/api/v1/docs/${encodeURIComponent(key)}`,
        { responseType: 'json' }
      )
      .then(res => res.data);
  }

  createDocument(data) {
    return this.httpClient
      .post(
        '/api/v1/docs',
        data,
        { responseType: 'json' }
      )
      .then(res => res.data);
  }

  updateDocumentMetadata({ documentKey, metadata }) {
    return this.httpClient
      .patch(
        `/api/v1/docs/${encodeURIComponent(documentKey)}/metadata`,
        metadata,
        { responseType: 'json' }
      )
      .then(res => res.data);
  }

  updateDocumentSections({ documentKey, sections }) {
    return this.httpClient
      .patch(
        `/api/v1/docs/${encodeURIComponent(documentKey)}/sections`,
        { sections },
        { responseType: 'json' }
      )
      .then(res => res.data);
  }

  restoreDocumentRevision({ documentKey, revisionId }) {
    return this.httpClient
      .patch(
        `/api/v1/docs/${encodeURIComponent(documentKey)}/restore`,
        { revisionId },
        { responseType: 'json' }
      )
      .then(res => res.data);
  }

  getDocumentRevisions(key) {
    return this.httpClient
      .get(
        '/api/v1/docs',
        {
          params: { key },
          responseType: 'json'
        }
      )
      .then(res => res.data);
  }

  hardDeleteSection({ documentKey, sectionKey, sectionRevision, reason, deleteAllRevisions }) {
    return this.httpClient
      .delete(
        '/api/v1/docs/sections',
        {
          data: {
            documentKey,
            sectionKey,
            sectionRevision,
            reason,
            deleteAllRevisions: !!deleteAllRevisions
          },
          responseType: 'json'
        }
      )
      .then(res => res.data);
  }

  hardDeleteDocument(documentKey) {
    return this.httpClient
      .delete(
        '/api/v1/docs',
        {
          data: { documentKey },
          responseType: 'json'
        }
      )
      .then(res => res.data);
  }

  getDocumentTagSuggestions(tagsSuggestionQuery) {
    return this.httpClient
      .get(
        `/api/v1/docs/tags/${encodeURIComponent(tagsSuggestionQuery)}`,
        { responseType: 'json' }
      )
      .then(res => res.data);
  }

  archiveDocument(documentKey) {
    return this.httpClient
      .patch(
        `/api/v1/docs/${encodeURIComponent(documentKey)}/archive`,
        null,
        { responseType: 'json' }
      )
      .then(res => res.data);
  }

  unarchiveDocument(documentKey) {
    return this.httpClient
      .patch(
        `/api/v1/docs/${encodeURIComponent(documentKey)}/unarchive`,
        null,
        { responseType: 'json' }
      )
      .then(res => res.data);
  }

  postDocumentRegenerationBatch() {
    return this.httpClient
      .post(
        '/api/v1/docs/document-regeneration-batch',
        null,
        { responseType: 'json' }
      )
      .then(res => res.data);
  }
}

export default DocumentApiClient;
