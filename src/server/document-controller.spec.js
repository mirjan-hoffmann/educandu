import httpErrors from 'http-errors';
import httpMocks from 'node-mocks-http';
import { EventEmitter } from 'node:events';
import uniqueId from '../utils/unique-id.js';
import { assert, createSandbox } from 'sinon';
import DocumentController from './document-controller.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const { NotFound, Forbidden, Unauthorized } = httpErrors;

describe('document-controller', () => {
  const sandbox = createSandbox();

  let clientDataMappingService;
  let documentService;
  let settingService;
  let serverConfig;
  let pageRenderer;
  let roomService;

  let user;
  let room;
  let doc;
  let req;
  let res;
  let sut;

  beforeEach(() => {
    documentService = {
      createDocument: sandbox.stub(),
      getDocumentById: sandbox.stub(),
      hardDeletePrivateDocument: sandbox.stub()
    };

    roomService = {
      getRoomById: sandbox.stub(),
      getSingleRoomMediaOverview: sandbox.stub()
    };

    clientDataMappingService = {
      mapRoom: sandbox.stub(),
      mapDocOrRevision: sandbox.stub(),
      mapDocsOrRevisions: sandbox.stub(),
      createProposedSections: sandbox.stub(),
      mapSingleRoomMediaOverview: sandbox.stub()
    };

    settingService = {
      getAllSettings: sandbox.stub()
    };

    pageRenderer = {
      sendPage: sandbox.stub()
    };

    serverConfig = {
      disabledFeatures: []
    };

    user = { _id: uniqueId.create() };
    room = { _id: uniqueId.create() };
    doc = {
      _id: uniqueId.create(),
      roomId: null,
      slug: '',
      sections: [],
      publicContext: {
        protected: false
      }
    };

    sut = new DocumentController(documentService, roomService, clientDataMappingService, settingService, pageRenderer, serverConfig);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('handleGetDocPage', () => {
    let mappedRoom;
    let mappedDocument;
    let templateSections;
    let templateDocument;
    let mappedTemplateDocument;
    let roomMediaOverview;
    let roomMediaContext;
    let mappedRoomMediaOverview;

    describe('when the document does not exist', () => {
      beforeEach(() => {
        req = {
          user,
          params: { 0: '', documentId: doc._id },
          query: {}
        };

        documentService.getDocumentById.withArgs(doc._id).resolves(null);
      });

      it('should throw NotFound', async () => {
        await expect(() => sut.handleGetDocPage(req, {})).rejects.toThrow(NotFound);
      });
    });

    describe('when the document slug is different than the URL slug', () => {
      beforeEach(() => new Promise((resolve, reject) => {
        req = {
          user,
          params: { 0: '/other-slug', documentId: doc._id },
          query: { view: 'edit', templateDocumentId: uniqueId.create() }
        };
        res = httpMocks.createResponse({ eventEmitter: EventEmitter });
        res.on('end', resolve);

        doc.slug = 'doc-slug';

        documentService.getDocumentById.withArgs(doc._id).resolves(doc);

        sut.handleGetDocPage(req, res).catch(reject);
      }));

      it('should redirect to the correct document url', () => {
        expect(res.statusCode).toBe(301);
        expect(res._getRedirectUrl())
          .toBe(`/docs/${doc._id}/${doc.slug}?view=${req.query.view}&templateDocumentId=${req.query.templateDocumentId}`);
      });
    });

    describe('when the template document does not exist', () => {
      beforeEach(() => {
        req = {
          user,
          params: { 0: '', documentId: doc._id },
          query: { templateDocumentId: uniqueId.create() }
        };

        documentService.getDocumentById.withArgs(doc._id).resolves(doc);
        documentService.getDocumentById.withArgs(req.query.templateDocumentId).resolves(null);
      });

      it('should throw NotFound', async () => {
        await expect(() => sut.handleGetDocPage(req, {})).rejects.toThrow(NotFound);
      });
    });

    describe('when the template document exists but the document already contains sections', () => {
      beforeEach(() => new Promise((resolve, reject) => {
        templateDocument = { _id: uniqueId.create(), roomId: null };
        req = {
          user,
          params: { 0: '/doc-slug', documentId: doc._id },
          query: { templateDocumentId: templateDocument._id }
        };
        res = httpMocks.createResponse({ eventEmitter: EventEmitter });
        res.on('end', resolve);

        doc.slug = 'doc-slug';
        doc.sections = [{}];

        documentService.getDocumentById.withArgs(doc._id).resolves(doc);
        documentService.getDocumentById.withArgs(templateDocument._id).resolves(templateDocument);

        sut.handleGetDocPage(req, res).catch(reject);
      }));

      it('should redirect to the original document url', () => {
        expect(res.statusCode).toBe(302);
        expect(res._getRedirectUrl()).toBe(`/docs/${doc._id}/${doc.slug}`);
      });
    });

    describe('when the view query param is not \'edit\'', () => {
      beforeEach(() => {
        templateDocument = { _id: uniqueId.create(), roomId: null };
        req = {
          user,
          params: { 0: '/doc-slug', documentId: doc._id },
          query: { view: 'other', templateDocumentId: templateDocument._id }
        };
        res = {};

        doc.slug = 'doc-slug';

        roomMediaOverview = null;
        mappedRoomMediaOverview = null;
        templateSections = [{}];
        mappedDocument = { ...doc };
        mappedTemplateDocument = { ...templateDocument };
        roomMediaContext = null;

        documentService.getDocumentById.withArgs(doc._id).resolves(doc);
        documentService.getDocumentById.withArgs(templateDocument._id).resolves(templateDocument);

        roomService.getSingleRoomMediaOverview.resolves(roomMediaOverview);

        clientDataMappingService.mapDocsOrRevisions.resolves([mappedDocument, mappedTemplateDocument]);
        clientDataMappingService.createProposedSections.returns(templateSections);
        clientDataMappingService.mapSingleRoomMediaOverview.returns(roomMediaOverview);
        pageRenderer.sendPage.resolves();

        return sut.handleGetDocPage(req, res);
      });

      it('should call clientDataMappingService.mapDocsOrRevisions', () => {
        assert.calledWith(clientDataMappingService.mapDocsOrRevisions, [doc, templateDocument], user);
      });

      it('should call clientDataMappingService.createProposedSections', () => {
        assert.calledWith(clientDataMappingService.createProposedSections, mappedTemplateDocument, null);
      });

      it('should call pageRenderer.sendPage', () => {
        assert.calledWith(pageRenderer.sendPage, req, res, 'document', { doc: mappedDocument, room: null, templateSections, roomMediaContext });
      });
    });

    describe('when the template document belongs to a room and the user is not authenticated', () => {
      beforeEach(() => {
        templateDocument = { _id: uniqueId.create(), roomId: room._id };
        req = {
          user: null,
          params: { 0: '/doc-slug', documentId: doc._id },
          query: { view: 'view', templateDocumentId: templateDocument._id }
        };
        res = {};

        doc.slug = 'doc-slug';
        doc.roomId = null;
        room.ownedBy = uniqueId.create();
        room.members = [];
        roomMediaOverview = { storagePlan: { maxBytes: 50 }, usedBytes: 25 };
        mappedRoomMediaOverview = { ...roomMediaOverview };

        roomService.getSingleRoomMediaOverview.resolves(roomMediaOverview);
        roomService.getRoomById.withArgs(room._id).resolves(room);
        documentService.getDocumentById.withArgs(doc._id).resolves(doc);
        documentService.getDocumentById.withArgs(templateDocument._id).resolves(templateDocument);
        clientDataMappingService.mapSingleRoomMediaOverview.returns(mappedRoomMediaOverview);

        pageRenderer.sendPage.resolves();
      });

      it('should throw Unauthorized', async () => {
        await expect(() => sut.handleGetDocPage(req, {})).rejects.toThrow(Unauthorized);
      });
    });

    describe('when the template document belongs to a room and the user is not a room owner or member', () => {
      beforeEach(() => {
        templateDocument = { _id: uniqueId.create(), roomId: room._id };
        req = {
          user,
          params: { 0: '/doc-slug', documentId: doc._id },
          query: { view: 'view', templateDocumentId: templateDocument._id }
        };
        res = {};

        doc.slug = 'doc-slug';
        doc.roomId = null;
        room.ownedBy = uniqueId.create();
        room.members = [];
        roomMediaOverview = { storagePlan: { maxBytes: 50 }, usedBytes: 25 };
        mappedRoomMediaOverview = { ...roomMediaOverview };

        roomService.getSingleRoomMediaOverview.resolves(roomMediaOverview);
        roomService.getRoomById.withArgs(room._id).resolves(room);
        documentService.getDocumentById.withArgs(doc._id).resolves(doc);
        documentService.getDocumentById.withArgs(templateDocument._id).resolves(templateDocument);
        clientDataMappingService.mapSingleRoomMediaOverview.returns(mappedRoomMediaOverview);

        pageRenderer.sendPage.resolves();
      });

      it('should throw Forbidden', async () => {
        await expect(() => sut.handleGetDocPage(req, {})).rejects.toThrow(Forbidden);
      });
    });

    describe('when the template document belongs to a room and the user is the room owner', () => {
      beforeEach(() => {
        templateDocument = { _id: uniqueId.create(), roomId: room._id };
        req = {
          user,
          params: { 0: '/doc-slug', documentId: doc._id },
          query: { view: 'view', templateDocumentId: templateDocument._id }
        };
        res = {};

        doc.slug = 'doc-slug';
        doc.roomId = null;
        room.ownedBy = user._id;
        room.members = [];

        templateSections = [{}];
        mappedRoom = { ...room };
        mappedDocument = { ...doc };
        mappedTemplateDocument = { ...templateDocument };

        roomService.getSingleRoomMediaOverview.resolves(roomMediaOverview);
        roomService.getRoomById.withArgs(room._id).resolves(room);
        documentService.getDocumentById.withArgs(doc._id).resolves(doc);
        documentService.getDocumentById.withArgs(templateDocument._id).resolves(templateDocument);

        clientDataMappingService.mapRoom.resolves(mappedRoom);
        clientDataMappingService.mapDocsOrRevisions.resolves([mappedDocument, mappedTemplateDocument]);
        clientDataMappingService.createProposedSections.returns(templateSections);
        clientDataMappingService.mapSingleRoomMediaOverview.returns(mappedRoomMediaOverview);
        pageRenderer.sendPage.resolves();

        return sut.handleGetDocPage(req, res);
      });

      it('should call pageRenderer.sendPage', () => {
        assert.calledWith(pageRenderer.sendPage, req, res, 'document', { doc: mappedDocument, room: null, templateSections, roomMediaContext: null });
      });
    });

    describe('when the template document belongs to a room and the user is a room member', () => {
      beforeEach(() => {
        templateDocument = { _id: uniqueId.create(), roomId: room._id };
        req = {
          user,
          params: { 0: '/doc-slug', documentId: doc._id },
          query: { view: 'view', templateDocumentId: templateDocument._id }
        };
        res = {};

        doc.slug = 'doc-slug';
        doc.roomId = null;
        room.ownedBy = uniqueId.create();
        room.members = [{ userId: user._id }];

        templateSections = [{}];
        mappedRoom = { ...room };
        mappedDocument = { ...doc };
        mappedTemplateDocument = { ...templateDocument };

        roomService.getSingleRoomMediaOverview.resolves(roomMediaOverview);
        roomService.getRoomById.withArgs(room._id).resolves(room);
        documentService.getDocumentById.withArgs(doc._id).resolves(doc);
        documentService.getDocumentById.withArgs(templateDocument._id).resolves(templateDocument);

        clientDataMappingService.mapRoom.resolves(mappedRoom);
        clientDataMappingService.mapDocsOrRevisions.resolves([mappedDocument, mappedTemplateDocument]);
        clientDataMappingService.createProposedSections.returns(templateSections);
        clientDataMappingService.mapSingleRoomMediaOverview.returns(mappedRoomMediaOverview);
        pageRenderer.sendPage.resolves();

        return sut.handleGetDocPage(req, res);
      });

      it('should call pageRenderer.sendPage', () => {
        assert.calledWith(pageRenderer.sendPage, req, res, 'document', { doc: mappedDocument, room: null, templateSections, roomMediaContext: null });
      });
    });

    describe('when the document belongs to a room and the user is not authenticated', () => {
      beforeEach(() => {
        templateDocument = { _id: uniqueId.create(), roomId: null };
        req = {
          user: null,
          params: { 0: '/doc-slug', documentId: doc._id },
          query: { view: 'view', templateDocumentId: templateDocument._id }
        };
        res = {};

        doc.slug = 'doc-slug';
        doc.roomId = room._id;
        doc.roomContext = { draft: false, inputSubmittingDisabled: false };
        room.ownedBy = user._id;
        room.members = [];

        templateSections = [{}];
        mappedRoom = { ...room };
        mappedDocument = { ...doc };
        mappedTemplateDocument = { ...templateDocument };

        roomService.getRoomById.withArgs(room._id).resolves(room);
        documentService.getDocumentById.withArgs(doc._id).resolves(doc);
        documentService.getDocumentById.withArgs(templateDocument._id).resolves(templateDocument);

        clientDataMappingService.mapRoom.resolves(mappedRoom);
        clientDataMappingService.mapDocsOrRevisions.resolves([mappedDocument, mappedTemplateDocument]);
        clientDataMappingService.createProposedSections.returns(templateSections);
        pageRenderer.sendPage.resolves();
      });

      it('should throw Unauthorized', async () => {
        await expect(() => sut.handleGetDocPage(req, {})).rejects.toThrow(Unauthorized);
      });
    });

    describe('when the document belongs to a room and the user is not a room owner or member', () => {
      beforeEach(() => {
        req = {
          user,
          params: { 0: '/doc-slug', documentId: doc._id },
          query: { view: 'view' }
        };
        res = {};

        doc.slug = 'doc-slug';
        doc.roomId = room._id;
        doc.roomContext = { draft: false, inputSubmittingDisabled: false };
        room.ownedBy = uniqueId.create();
        room.members = [];

        mappedRoom = { ...room };
        mappedDocument = { ...doc };

        roomService.getRoomById.withArgs(room._id).resolves(room);
        documentService.getDocumentById.withArgs(doc._id).resolves(doc);

        clientDataMappingService.mapRoom.resolves(mappedRoom);
        clientDataMappingService.mapDocsOrRevisions.resolves([mappedDocument]);
        pageRenderer.sendPage.resolves();
      });

      it('should throw Forbidden', async () => {
        await expect(() => sut.handleGetDocPage(req, {})).rejects.toThrow(Forbidden);
      });
    });

    describe('when the document belongs to a room, is in draft state, and the user is a room member', () => {
      beforeEach(() => {
        req = {
          user,
          params: { 0: '/doc-slug', documentId: doc._id },
          query: { view: 'view' }
        };
        res = {};

        doc.slug = 'doc-slug';
        doc.roomId = room._id;
        doc.roomContext = { draft: true, inputSubmittingDisabled: false };
        room.ownedBy = uniqueId.create();
        room.members = [{ userId: user._id }];

        mappedRoom = { ...room };
        mappedDocument = { ...doc };

        roomService.getRoomById.withArgs(room._id).resolves(room);
        documentService.getDocumentById.withArgs(doc._id).resolves(doc);

        clientDataMappingService.mapRoom.resolves(mappedRoom);
        clientDataMappingService.mapDocsOrRevisions.resolves([mappedDocument]);
        pageRenderer.sendPage.resolves();
      });

      it('should throw Forbidden', async () => {
        await expect(() => sut.handleGetDocPage(req, {})).rejects.toThrow(Forbidden);
      });
    });

    describe('when the document belongs to a room, is in draft state, and the user is the room owner', () => {
      beforeEach(() => {
        templateDocument = { _id: uniqueId.create(), roomId: null };
        req = {
          user,
          params: { 0: '/doc-slug', documentId: doc._id },
          query: { view: 'view', templateDocumentId: templateDocument._id }
        };
        res = {};

        doc.slug = 'doc-slug';
        doc.roomId = room._id;
        doc.roomContext = { draft: true, inputSubmittingDisabled: false };
        room.ownedBy = user._id;
        room.members = [];

        templateSections = [{}];
        mappedRoom = { ...room };
        mappedDocument = { ...doc };
        mappedTemplateDocument = { ...templateDocument };
        roomMediaOverview = { storagePlan: { maxBytes: 50 }, usedBytes: 25 };
        mappedRoomMediaOverview = { ...roomMediaOverview };
        roomMediaContext = {
          singleRoomMediaOverview: roomMediaOverview,
          isDeletionEnabled: true
        };

        roomService.getSingleRoomMediaOverview.resolves(roomMediaOverview);
        roomService.getRoomById.withArgs(room._id).resolves(room);
        documentService.getDocumentById.withArgs(doc._id).resolves(doc);
        documentService.getDocumentById.withArgs(templateDocument._id).resolves(templateDocument);

        clientDataMappingService.mapRoom.resolves(mappedRoom);
        clientDataMappingService.mapDocsOrRevisions.resolves([mappedDocument, mappedTemplateDocument]);
        clientDataMappingService.createProposedSections.returns(templateSections);
        clientDataMappingService.mapSingleRoomMediaOverview.returns(mappedRoomMediaOverview);

        pageRenderer.sendPage.resolves();

        return sut.handleGetDocPage(req, res);
      });

      it('should call pageRenderer.sendPage', () => {
        assert.calledWith(pageRenderer.sendPage, req, res, 'document', { doc: mappedDocument, room: mappedRoom, templateSections, roomMediaContext });
      });
    });

    describe('when the document belongs to a room and the user is the room owner', () => {
      beforeEach(() => {
        templateDocument = { _id: uniqueId.create(), roomId: null };
        req = {
          user,
          params: { 0: '/doc-slug', documentId: doc._id },
          query: { view: 'view', templateDocumentId: templateDocument._id }
        };
        res = {};

        doc.slug = 'doc-slug';
        doc.roomId = room._id;
        doc.roomContext = { draft: false, inputSubmittingDisabled: false };
        room.ownedBy = user._id;
        room.members = [];

        templateSections = [{}];
        mappedRoom = { ...room };
        mappedDocument = { ...doc };
        mappedTemplateDocument = { ...templateDocument };
        roomMediaOverview = { storagePlan: { maxBytes: 50 }, usedBytes: 25 };
        mappedRoomMediaOverview = { ...roomMediaOverview };
        roomMediaContext = {
          singleRoomMediaOverview: roomMediaOverview,
          isDeletionEnabled: true
        };

        roomService.getSingleRoomMediaOverview.resolves(roomMediaOverview);
        roomService.getRoomById.withArgs(room._id).resolves(room);
        documentService.getDocumentById.withArgs(doc._id).resolves(doc);
        documentService.getDocumentById.withArgs(templateDocument._id).resolves(templateDocument);

        clientDataMappingService.mapRoom.resolves(mappedRoom);
        clientDataMappingService.mapDocsOrRevisions.resolves([mappedDocument, mappedTemplateDocument]);
        clientDataMappingService.createProposedSections.returns(templateSections);
        clientDataMappingService.mapSingleRoomMediaOverview.returns(mappedRoomMediaOverview);

        pageRenderer.sendPage.resolves();

        return sut.handleGetDocPage(req, res);
      });

      it('should call pageRenderer.sendPage', () => {
        assert.calledWith(pageRenderer.sendPage, req, res, 'document', { doc: mappedDocument, room: mappedRoom, templateSections, roomMediaContext });
      });
    });

    describe('when the document belongs to a room and the user is a room member', () => {
      beforeEach(() => {
        templateDocument = { _id: uniqueId.create(), roomId: null };
        req = {
          user,
          params: { 0: '/doc-slug', documentId: doc._id },
          query: { view: 'view', templateDocumentId: templateDocument._id }
        };
        res = {};

        doc.slug = 'doc-slug';
        doc.roomId = room._id;
        doc.roomContext = { draft: false, inputSubmittingDisabled: false };
        room.ownedBy = uniqueId.create();
        room.members = [{ userId: user._id }];

        templateSections = [{}];
        mappedRoom = { ...room };
        mappedDocument = { ...doc };
        mappedTemplateDocument = { ...templateDocument };
        roomMediaOverview = { storagePlan: { maxBytes: 50 }, usedBytes: 25 };
        mappedRoomMediaOverview = { ...roomMediaOverview };
        roomMediaContext = {
          singleRoomMediaOverview: roomMediaOverview,
          isDeletionEnabled: false
        };

        roomService.getSingleRoomMediaOverview.resolves(roomMediaOverview);
        roomService.getRoomById.withArgs(room._id).resolves(room);
        documentService.getDocumentById.withArgs(doc._id).resolves(doc);
        documentService.getDocumentById.withArgs(templateDocument._id).resolves(templateDocument);

        clientDataMappingService.mapRoom.resolves(mappedRoom);
        clientDataMappingService.mapDocsOrRevisions.resolves([mappedDocument, mappedTemplateDocument]);
        clientDataMappingService.createProposedSections.returns(templateSections);
        clientDataMappingService.mapSingleRoomMediaOverview.returns(mappedRoomMediaOverview);

        pageRenderer.sendPage.resolves();

        return sut.handleGetDocPage(req, res);
      });

      it('should call pageRenderer.sendPage', () => {
        assert.calledWith(pageRenderer.sendPage, req, res, 'document', { doc: mappedDocument, room: mappedRoom, templateSections, roomMediaContext });
      });
    });

    describe('when the view query param is \'edit\'', () => {
      let documentRevision;

      beforeEach(() => {
        templateDocument = { _id: uniqueId.create(), roomId: null };
        req = {
          user,
          params: { 0: '/doc-slug', documentId: doc._id },
          query: { view: 'edit', templateDocumentId: templateDocument._id }
        };
        res = {};

        documentRevision = { _id: uniqueId.create() };

        doc.slug = 'doc-slug';
        doc.revision = documentRevision._id;

        templateSections = [{}];
        mappedDocument = { ...doc };
        mappedTemplateDocument = { ...templateDocument };

        documentService.getDocumentById.withArgs(doc._id).resolves(doc);
        documentService.getDocumentById.withArgs(templateDocument._id).resolves(templateDocument);

        clientDataMappingService.mapDocsOrRevisions.resolves([mappedDocument, mappedTemplateDocument]);

        clientDataMappingService.createProposedSections.returns(templateSections);
        pageRenderer.sendPage.resolves();

        return sut.handleGetDocPage(req, res);
      });

      it('should call clientDataMappingService.mapDocsOrRevisions', () => {
        assert.calledWith(clientDataMappingService.mapDocsOrRevisions, [doc, templateDocument], user);
      });

      it('should call clientDataMappingService.createProposedSections', () => {
        assert.calledWith(clientDataMappingService.createProposedSections, mappedTemplateDocument, null);
      });

      it('should call pageRenderer.sendPage', () => {
        assert.calledWith(pageRenderer.sendPage, req, res, 'document', { doc: mappedDocument, room: null, templateSections, roomMediaContext: null });
      });
    });

    describe('when the view query param is \'edit\' but the doc is archived (thus non-editable)', () => {
      beforeEach(() => new Promise((resolve, reject) => {
        req = {
          user,
          params: { 0: '/doc-slug', documentId: doc._id },
          query: { view: 'edit' }
        };
        res = httpMocks.createResponse({ eventEmitter: EventEmitter });
        res.on('end', resolve);

        doc.slug = 'doc-slug';
        doc.publicContext.archived = true;

        documentService.getDocumentById.withArgs(doc._id).resolves(doc);

        pageRenderer.sendPage.resolves();

        sut.handleGetDocPage(req, res).catch(reject);
      }));

      it('should redirect to the document url in display mode', () => {
        expect(res._getRedirectUrl()).toBe(`/docs/${doc._id}/${doc.slug}`);
      });
    });

    describe('when the view query param is \'edit\' but no templateDocumentId is provided', () => {
      let documentRevision;

      beforeEach(() => {
        templateDocument = { _id: uniqueId.create(), roomId: null };
        req = {
          user,
          params: { 0: '/doc-slug', documentId: doc._id },
          query: { view: 'edit' }
        };
        res = {};

        documentRevision = { _id: uniqueId.create() };

        doc.slug = 'doc-slug';
        doc.revision = documentRevision._id;

        mappedDocument = { ...doc };

        documentService.getDocumentById.withArgs(doc._id).resolves(doc);
        documentService.getDocumentById.withArgs(templateDocument._id).resolves(templateDocument);

        clientDataMappingService.mapDocsOrRevisions.resolves([mappedDocument, null]);

        pageRenderer.sendPage.resolves();

        return sut.handleGetDocPage(req, res);
      });

      it('should call clientDataMappingService.mapDocsOrRevisions', () => {
        assert.calledWith(clientDataMappingService.mapDocsOrRevisions, [doc, null], user);
      });

      it('should not call clientDataMappingService.createProposedSections', () => {
        assert.notCalled(clientDataMappingService.createProposedSections);
      });

      it('should call pageRenderer.sendPage', () => {
        assert.calledWith(pageRenderer.sendPage, req, res, 'document', { doc: mappedDocument, room: null, templateSections: [], roomMediaContext: null });
      });
    });
  });

  describe('handlePostDocument', () => {
    describe('when the user owns the room to contain the document', () => {
      let newDoc;
      let mappedDoc;

      beforeEach(() => new Promise((resolve, reject) => {
        room.ownedBy = user._id;
        room.isCollaborative = false;
        room.members = [{ userId: uniqueId.create() }];

        doc.roomId = room._id;
        doc.roomContext = { draft: false, inputSubmittingDisabled: false };
        newDoc = { ...doc };
        mappedDoc = { ...doc };

        req = { user, body: doc };
        res = httpMocks.createResponse({ eventEmitter: EventEmitter });
        res.on('end', resolve);

        roomService.getRoomById.withArgs(room._id).resolves(room);
        documentService.createDocument.resolves(newDoc);
        clientDataMappingService.mapDocOrRevision.resolves(mappedDoc);

        sut.handlePostDocument(req, res).catch(reject);
      }));

      it('should create the document', () => {
        assert.calledWith(documentService.createDocument, { data: doc, user });
      });

      it('should return the document', () => {
        expect(res.statusCode).toBe(201);
        expect(res._getData()).toBe(mappedDoc);
      });
    });

    describe('when the user owns the room to contain the draft document', () => {
      let newDoc;
      let mappedDoc;

      beforeEach(() => new Promise((resolve, reject) => {
        room.ownedBy = user._id;
        room.isCollaborative = false;
        room.members = [{ userId: uniqueId.create() }];

        doc.roomId = room._id;
        doc.roomContext = { draft: true, inputSubmittingDisabled: false };
        newDoc = { ...doc };
        mappedDoc = { ...doc };

        req = { user, body: doc };
        res = httpMocks.createResponse({ eventEmitter: EventEmitter });
        res.on('end', resolve);

        roomService.getRoomById.withArgs(room._id).resolves(room);
        documentService.createDocument.resolves(newDoc);
        clientDataMappingService.mapDocOrRevision.resolves(mappedDoc);

        sut.handlePostDocument(req, res).catch(reject);
      }));

      it('should create the document', () => {
        assert.calledWith(documentService.createDocument, { data: doc, user });
      });

      it('should return the document', () => {
        expect(res.statusCode).toBe(201);
        expect(res._getData()).toBe(mappedDoc);
      });
    });

    describe('when the user is a collaborator of the room to contain the document', () => {
      let newDoc;
      let mappedDoc;

      beforeEach(() => new Promise((resolve, reject) => {
        room.ownedBy = uniqueId.create();
        room.isCollaborative = true;
        room.members = [{ userId: user._id }];

        doc.roomId = room._id;
        doc.roomContext = { draft: false, inputSubmittingDisabled: false };
        newDoc = { ...doc };
        mappedDoc = { ...doc };

        req = { user, body: doc };
        res = httpMocks.createResponse({ eventEmitter: EventEmitter });
        res.on('end', resolve);

        roomService.getRoomById.withArgs(room._id).resolves(room);
        documentService.createDocument.resolves(newDoc);
        clientDataMappingService.mapDocOrRevision.resolves(mappedDoc);

        sut.handlePostDocument(req, res).catch(reject);
      }));

      it('should create the document', () => {
        assert.calledWith(documentService.createDocument, { data: doc, user });
      });

      it('should return the document', () => {
        expect(res.statusCode).toBe(201);
        expect(res._getData()).toBe(mappedDoc);
      });
    });

    describe('when the document does not belong to a room', () => {
      let newDoc;
      let mappedDoc;

      beforeEach(() => new Promise((resolve, reject) => {
        doc = { title: 'title', slug: 'slug', language: 'language' };
        newDoc = { ...doc };
        mappedDoc = { ...mappedDoc };

        req = { user, body: doc };
        res = httpMocks.createResponse({ eventEmitter: EventEmitter });
        res.on('end', resolve);

        documentService.createDocument.resolves(newDoc);
        clientDataMappingService.mapDocOrRevision.resolves(mappedDoc);

        sut.handlePostDocument(req, res).catch(reject);
      }));

      it('should create the document', () => {
        assert.calledWith(documentService.createDocument, { data: doc, user });
      });

      it('should return the document', () => {
        expect(res.statusCode).toBe(201);
        expect(res._getData()).toBe(mappedDoc);
      });
    });
  });

  describe('handleDeletePrivateDoc', () => {
    describe('when the document belongs to a room of which the user is owner', () => {
      beforeEach(() => new Promise((resolve, reject) => {
        req = { user, body: { documentId: doc._id } };
        res = httpMocks.createResponse({ eventEmitter: EventEmitter });
        res.on('end', resolve);

        doc.roomId = room._id;

        room.ownedBy = user._id;
        room.members = [{ userId: uniqueId.create() }];

        roomService.getRoomById.withArgs(room._id).resolves(room);
        documentService.getDocumentById.withArgs(doc._id).resolves(doc);
        documentService.hardDeletePrivateDocument.resolves();

        sut.handleDeletePrivateDoc(req, res).catch(reject);
      }));

      it('should call documentService.hardDeletePrivateDocument', () => {
        assert.calledWith(documentService.hardDeletePrivateDocument, { documentId: doc._id, user });
      });
    });
  });

});
