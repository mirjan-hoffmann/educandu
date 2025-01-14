import os from 'node:os';
import multer from 'multer';
import express from 'express';
import httpErrors from 'http-errors';
import PageRenderer from './page-renderer.js';
import permissions from '../domain/permissions.js';
import { PAGE_NAME } from '../domain/page-name.js';
import RoomService from '../services/room-service.js';
import DocumentService from '../services/document-service.js';
import needsPermission from '../domain/needs-permission-middleware.js';
import DocumentInputService from '../services/document-input-service.js';
import { isRoomOwnerOrInvitedCollaborator } from '../utils/room-utils.js';
import ClientDataMappingService from '../services/client-data-mapping-service.js';
import uploadLimitExceededMiddleware from '../domain/upload-limit-exceeded-middleware.js';
import { validateBody, validateFile, validateParams, validateQuery } from '../domain/validation-middleware.js';
import {
  documentInputIdParamsOrQuerySchema,
  getDocumentInputsCreatedByUserParams,
  createDocumentInputDataBodySchema,
  hardDeleteDocumentInputBodySchema,
  getDocumentInputsByDocumentIdParams,
  getDocumentInputsByRoomIdParams,
  createDocumentInputSectionCommentBodySchema,
  createDocumentInputSectionCommentParams,
  deleteDocumentInputSectionCommentParams,
  deleteDocumentInputSectionCommentBodySchema,
  getDocumentInputsByDocumentIdQuery,
  getAuthorizeResourcesAccessParamsSchema
} from '../domain/schemas/document-input-schemas.js';

const { Forbidden, NotFound } = httpErrors;

const jsonParser = express.json();
const jsonParserLargePayload = express.json({ limit: '2MB' });
const multipartParser = multer({ dest: os.tmpdir() });

class DocumentInputController {
  static dependencies = [DocumentInputService, DocumentService, RoomService, ClientDataMappingService, PageRenderer];

  constructor(documentInputService, documentService, roomService, clientDataMappingService, pageRenderer) {
    this.roomService = roomService;
    this.documentService = documentService;
    this.documentInputService = documentInputService;
    this.clientDataMappingService = clientDataMappingService;
    this.pageRenderer = pageRenderer;
  }

  async handleGetDocumentInputPage(req, res) {
    const { user } = req;
    const { documentInputId } = req.params;

    const documentInput = await this.documentInputService.getDocumentInputById({ documentInputId, user });

    if (!documentInput) {
      throw new NotFound();
    }

    const documentRevision = await this.documentService.getDocumentRevisionById(documentInput.documentRevisionId);
    if (!documentRevision) {
      throw new NotFound(`Document revision '${documentInput.documentRevisionId}' not found.`);
    }

    const room = await this.roomService.getRoomById(documentRevision.roomId);
    if (documentInput.createdBy !== user._id && !isRoomOwnerOrInvitedCollaborator({ room, userId: user._id })) {
      throw new Forbidden(`User is not authorized to view document input '${documentInputId}'`);
    }

    const mappedDocumentRevision = await this.clientDataMappingService.mapDocOrRevision(documentRevision, user);
    const mappedDocumentInput = await this.clientDataMappingService.mapDocumentInput({ documentInput, document: documentRevision });

    return this.pageRenderer.sendPage(req, res, PAGE_NAME.documentInput, {
      documentInput: mappedDocumentInput,
      documentRevision: mappedDocumentRevision
    });
  }

  async handleGetDocumentInput(req, res) {
    const { user } = req;
    const { documentInputId } = req.params;

    const documentInput = await this.documentInputService.getDocumentInputById({ documentInputId, user });
    const document = await this.documentService.getDocumentById(documentInput.documentId);
    const mappedDocumentInput = await this.clientDataMappingService.mapDocumentInput({ documentInput, document });

    return res.send({ documentInput: mappedDocumentInput });
  }

  async handleGetAllDocumentInputsCreatedByUser(req, res) {
    const { userId } = req.params;

    const documentInputs = await this.documentInputService.getAllDocumentInputsCreatedByUser(userId);
    const documentIds = documentInputs.map(input => input.documentId);
    const documents = await this.documentService.getDocumentsMetadataByIds(documentIds);

    const mappedDocumentInputs = await this.clientDataMappingService.mapDocumentInputs({ documentInputs, documents });

    return res.send({ documentInputs: mappedDocumentInputs });
  }

  async handleGetDocumentInputsByDocumentId(req, res) {
    const { documentId } = req.params;
    const { createdByUserId } = req.query;

    let documentInputs = await this.documentInputService.getDocumentInputsByDocumentId(documentId);

    if (createdByUserId) {
      documentInputs = documentInputs.filter(input => input.createdBy === createdByUserId);
    }

    const documentIds = documentInputs.map(input => input.documentId);
    const documents = await this.documentService.getDocumentsMetadataByIds(documentIds);

    const mappeddocumentInputs = await this.clientDataMappingService.mapDocumentInputs({ documentInputs, documents });

    return res.send({ documentInputs: mappeddocumentInputs });
  }

  async handleGetDocumentInputsByRoomId(req, res) {
    const { roomId } = req.params;

    const documentInputs = await this.documentInputService.getDocumentInputsByRoomId(roomId);
    const documentIds = documentInputs.map(input => input.documentId);
    const documents = await this.documentService.getDocumentsMetadataByIds(documentIds);

    const mappeddocumentInputs = await this.clientDataMappingService.mapDocumentInputs({ documentInputs, documents });

    return res.send({ documentInputs: mappeddocumentInputs });
  }

  async handlePostDocumentInput(req, res) {
    const { user, files } = req;
    const { documentId, documentRevisionId, sections } = req.body;

    const documentInput = await this.documentInputService.createDocumentInput({ documentId, documentRevisionId, sections, files, user });
    const document = await this.documentService.getDocumentById(documentInput.documentId);

    const mappedNewDocumentInput = await this.clientDataMappingService.mapDocumentInput({ documentInput, document });

    return res.status(201).send({ documentInput: mappedNewDocumentInput });
  }

  async handlePostDocumentInputSectionComment(req, res) {
    const { user } = req;
    const { text } = req.body;
    const { documentInputId, sectionKey } = req.params;

    const documentInput = await this.documentInputService.createDocumentInputSectionComment({ documentInputId, sectionKey, text, user });
    const mappedDocumentInput = await this.clientDataMappingService.mapDocumentInput({ documentInput });

    return res.status(201).send({ documentInput: mappedDocumentInput });
  }

  async handleDeleteDocumentInputSectionComment(req, res) {
    const { user } = req;
    const { documentInputId, sectionKey } = req.params;
    const { commentKey } = req.body;

    const documentInput = await this.documentInputService.deleteDocumentInputSectionComment({ documentInputId, sectionKey, commentKey, user });
    const mappedDocumentInput = await this.clientDataMappingService.mapDocumentInput({ documentInput });

    return res.send({ documentInput: mappedDocumentInput });
  }

  async handleHardDeleteDocumentInput(req, res) {
    const { user } = req;
    const { documentInputId } = req.body;
    await this.documentInputService.hardDeleteDocumentInput({ documentInputId, user });
    return res.send({});
  }

  async handleAuthorizeResourcesAccess(req, res) {
    const { user } = req;
    const { documentInputId } = req.params;

    if (!user) {
      return res.status(401).end();
    }

    let notFoundOrForbidden;
    try {
      await this.documentInputService.getDocumentInputById({ documentInputId, user });
      notFoundOrForbidden = false;
    } catch {
      notFoundOrForbidden = true;
    }

    return res.status(notFoundOrForbidden ? 403 : 200).end();
  }

  registerPages(router) {
    router.get(
      '/doc-inputs/:documentInputId',
      needsPermission(permissions.CREATE_CONTENT),
      (req, res) => this.handleGetDocumentInputPage(req, res)
    );
  }

  registerApi(router) {
    router.get(
      '/api/v1/doc-inputs/:documentInputId',
      needsPermission(permissions.CREATE_CONTENT),
      validateParams(documentInputIdParamsOrQuerySchema),
      (req, res) => this.handleGetDocumentInput(req, res)
    );

    router.get(
      '/api/v1/doc-inputs/users/:userId',
      needsPermission(permissions.CREATE_CONTENT),
      validateParams(getDocumentInputsCreatedByUserParams),
      (req, res) => this.handleGetAllDocumentInputsCreatedByUser(req, res)
    );

    router.get(
      '/api/v1/doc-inputs/documents/:documentId',
      needsPermission(permissions.CREATE_CONTENT),
      validateParams(getDocumentInputsByDocumentIdParams),
      validateQuery(getDocumentInputsByDocumentIdQuery),
      (req, res) => this.handleGetDocumentInputsByDocumentId(req, res)
    );

    router.get(
      '/api/v1/doc-inputs/rooms/:roomId',
      needsPermission(permissions.CREATE_CONTENT),
      validateParams(getDocumentInputsByRoomIdParams),
      (req, res) => this.handleGetDocumentInputsByRoomId(req, res)
    );

    router.post(
      '/api/v1/doc-inputs',
      needsPermission(permissions.CREATE_CONTENT),
      uploadLimitExceededMiddleware(),
      multipartParser.array('files[]'),
      validateFile('files'),
      (req, _res, next) => {
        // Transform the body as if it were a REST call,
        // so we can nicely validate it and work with it
        req.body = JSON.parse(req.body.documentInput || 'null') || {};
        next();
      },
      validateBody(createDocumentInputDataBodySchema),
      (req, res) => this.handlePostDocumentInput(req, res)
    );

    router.post(
      '/api/v1/doc-inputs/:documentInputId/sections/:sectionKey/comments',
      jsonParserLargePayload,
      needsPermission(permissions.CREATE_CONTENT),
      validateParams(createDocumentInputSectionCommentParams),
      validateBody(createDocumentInputSectionCommentBodySchema),
      (req, res) => this.handlePostDocumentInputSectionComment(req, res)
    );

    router.delete(
      '/api/v1/doc-inputs/:documentInputId/sections/:sectionKey/comments',
      jsonParserLargePayload,
      needsPermission(permissions.DELETE_OWN_PRIVATE_CONTENT),
      validateParams(deleteDocumentInputSectionCommentParams),
      validateBody(deleteDocumentInputSectionCommentBodySchema),
      (req, res) => this.handleDeleteDocumentInputSectionComment(req, res)
    );

    router.delete(
      '/api/v1/doc-inputs',
      jsonParser,
      needsPermission(permissions.DELETE_OWN_PRIVATE_CONTENT),
      validateBody(hardDeleteDocumentInputBodySchema),
      (req, res) => this.handleHardDeleteDocumentInput(req, res)
    );

    router.get(
      '/api/v1/doc-inputs/:documentInputId/authorize-resources-access',
      validateParams(getAuthorizeResourcesAccessParamsSchema),
      (req, res) => this.handleAuthorizeResourcesAccess(req, res)
    );
  }
}

export default DocumentInputController;
