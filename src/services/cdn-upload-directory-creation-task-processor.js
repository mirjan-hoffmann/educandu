import Logger from '../common/logger.js';
import RoomService from './room-service.js';
import LessonService from './lesson-service.js';
import DocumentService from './document-service.js';
import { CDN_UPLOAD_DIRECTORY_CREATION_TASK_TYPE } from '../domain/constants.js';

const logger = new Logger(import.meta.url);

class CdnUploadDirectoryCreationTaskProcessor {
  static get inject() {
    return [DocumentService, LessonService, RoomService];
  }

  constructor(documentService, lessonService, roomService) {
    this.documentService = documentService;
    this.lessonService = lessonService;
    this.roomService = roomService;
  }

  async process(task, ctx) {
    const { type, documentKey, lessonId, roomId } = task.taskParams;

    if (ctx.cancellationRequested) {
      throw new Error('Cancellation requested');
    }

    switch (type) {
      case CDN_UPLOAD_DIRECTORY_CREATION_TASK_TYPE.document:
        logger.info(`Creating CDN upload directory for document with key ${documentKey}`);
        await this.documentService.createUploadDirectoryMarkerForDocument(documentKey);
        break;
      case CDN_UPLOAD_DIRECTORY_CREATION_TASK_TYPE.lesson:
        logger.info(`Creating CDN upload directory for lesson with ID ${lessonId}`);
        await this.lessonService.createUploadDirectoryMarkerForLesson(lessonId);
        break;
      case CDN_UPLOAD_DIRECTORY_CREATION_TASK_TYPE.room:
        logger.info(`Creating CDN upload directory for room with ID ${roomId}`);
        await this.roomService.createUploadDirectoryMarkerForRoom(roomId);
        break;
      default:
        throw new Error(`Invalid CDN upload directory creation task type '${type}'`);
    }
  }
}

export default CdnUploadDirectoryCreationTaskProcessor;