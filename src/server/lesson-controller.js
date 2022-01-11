import urls from '../utils/urls.js';
import httpErrors from 'http-errors';
import PageRenderer from './page-renderer.js';
import { PAGE_NAME } from '../domain/page-name.js';
import ServerConfig from '../bootstrap/server-config.js';
import LessonService from '../services/lesson-service.js';
import { validateParams } from '../domain/validation-middleware.js';
import { getLessonParamsSchema } from '../domain/schemas/lesson-schemas.js';

const { NotFound } = httpErrors;

export default class LessonController {
  static get inject() { return [ServerConfig, LessonService, PageRenderer]; }

  constructor(serverConfig, lessonService, pageRenderer) {
    this.serverConfig = serverConfig;
    this.lessonService = lessonService;
    this.pageRenderer = pageRenderer;
  }

  async handleGetLessonPage(req, res) {
    const { lessonId, lessonSlug } = req.params;

    const lesson = await this.lessonService.getLesson(lessonId);

    if (!lesson) {
      throw new NotFound();
    }

    if (lesson.slug && lessonSlug !== lesson.slug) {
      return res.redirect(301, urls.getLessonUrl(lesson._id, lesson.slug));
    }

    return this.pageRenderer.sendPage(req, res, PAGE_NAME.lesson, { lesson });
  }

  registerPages(router) {
    if (!this.serverConfig.areRoomsEnabled) {
      return;
    }

    router.get(
      '/lessons/:lessonId',
      [validateParams(getLessonParamsSchema)],
      (req, res) => this.handleGetLessonPage(req, res)
    );

    router.get(
      '/lessons/:lessonId/:lessonSlug*',
      [validateParams(getLessonParamsSchema)],
      (req, res) => this.handleGetLessonPage(req, res)
    );
  }
}
