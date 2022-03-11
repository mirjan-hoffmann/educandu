import by from 'thenby';
import RoomStore from '../stores/room-store.js';
import UserStore from '../stores/user-store.js';
import LessonStore from '../stores/lesson-store.js';
import DocumentStore from '../stores/document-store.js';
import { FAVORITE_TYPE, USER_ACTIVITY_TYPE } from '../domain/constants.js';

class DashboardService {
  static get inject() { return [UserStore, DocumentStore, RoomStore, LessonStore]; }

  constructor(userStore, documentStore, roomStore, lessonStore) {
    this.userStore = userStore;
    this.roomStore = roomStore;
    this.lessonStore = lessonStore;
    this.documentStore = documentStore;
  }

  async getUserActivities({ userId, limit = 30 }) {
    const user = await this.userStore.getUserById(userId);

    const createdRooms = await this.roomStore.getLatestRoomsCreatedByUser(userId, { limit });
    const joinedRooms = await this.roomStore.getLatestRoomsJoinedByUser(userId, { limit });
    const updatedRooms = await this.roomStore.getLatestRoomsUpdatedByUser(userId, { limit });
    const createdDocuments = await this.documentStore.getLatestDocumentsMetadataCreatedByUser(userId, { limit });
    const updatedDocuments = await this.documentStore.getLatestDocumentsMetadataUpdatedByUser(userId, { limit });
    const lessons = await this.lessonStore.getLatestLessonsMetadataCreatedByUser(userId, { limit });

    const createdDocumentActivities = createdDocuments.map(document => ({
      type: USER_ACTIVITY_TYPE.documentCreated,
      timestamp: document.createdOn,
      data: { _id: document._id, title: document.title }
    }));

    const updatedDocumentActivities = updatedDocuments.map(document => ({
      type: USER_ACTIVITY_TYPE.documentUpdated,
      timestamp: document.updatedOn,
      data: { _id: document._id, title: document.title }
    }));

    const createdRoomActivities = createdRooms.map(room => ({
      type: USER_ACTIVITY_TYPE.roomCreated,
      timestamp: room.createdOn,
      data: { _id: room._id, name: room.name }
    }));

    const updatedRoomActivities = updatedRooms.map(room => ({
      type: USER_ACTIVITY_TYPE.roomUpdated,
      timestamp: room.updatedOn,
      data: { _id: room._id, name: room.name }
    }));

    const joinedRoomActivities = joinedRooms.map(room => ({
      type: USER_ACTIVITY_TYPE.roomJoined,
      timestamp: room.members.find(member => member.userId === userId).joinedOn,
      data: { _id: room._id, name: room.name }
    }));

    const lessonActivities = [];
    lessons.forEach(lesson => {
      lessonActivities.push({
        type: USER_ACTIVITY_TYPE.lessonCreated,
        timestamp: lesson.createdOn,
        data: { _id: lesson._id, title: lesson.title }
      });

      if (lesson.createdOn.toISOString() !== lesson.updatedOn.toISOString()) {
        lessonActivities.push({
          type: USER_ACTIVITY_TYPE.lessonUpdated,
          timestamp: lesson.updatedOn,
          data: { _id: lesson._id, title: lesson.title }
        });
      }
    });

    const latestFavorites = user.favorites.sort(by(f => f.setOn, 'desc')).slice(0, limit);
    const favoriteActivitiesMetadata = latestFavorites.map(favorite => {
      switch (favorite.type) {
        case FAVORITE_TYPE.document:
          return {
            type: USER_ACTIVITY_TYPE.documentMarkedFavorite,
            timestamp: favorite.setOn,
            getData: async () => {
              const document = await this.documentStore.getDocumentMetadataByKey(favorite.id);
              return { _id: favorite.id, title: document.title };
            }
          };
        case FAVORITE_TYPE.room:
          return {
            type: USER_ACTIVITY_TYPE.roomMarkedFavorite,
            timestamp: favorite.setOn,
            getData: async () => {
              const room = await this.roomStore.getRoomById(favorite.id);
              return { _id: favorite.id, name: room.name };
            }
          };
        case FAVORITE_TYPE.lesson:
          return {
            type: USER_ACTIVITY_TYPE.lessonMarkedFavorite,
            timestamp: favorite.setOn,
            getData: async () => {
              const lesson = await this.lessonStore.getLessonMetadataById(favorite.id);
              return { _id: favorite.id, title: lesson.title };
            }
          };
        default:
          return null;
      }
    });

    let incompleteActivities = [
      ...createdDocumentActivities,
      ...updatedDocumentActivities,
      ...createdRoomActivities,
      ...updatedRoomActivities,
      ...joinedRoomActivities,
      ...lessonActivities,
      ...favoriteActivitiesMetadata
    ]
      .sort(by(item => item.timestamp, 'desc'));

    if (limit && limit !== 0) {
      incompleteActivities = incompleteActivities.slice(0, limit);
    }

    const activities = [];
    for (const activity of incompleteActivities) {
      if (activity.getData) {
        // eslint-disable-next-line no-await-in-loop
        const data = await activity.getData();
        delete activity.getData;
        activities.push({ ...activity, data: { ...data } });
      } else {
        activities.push(activity);
      }
    }

    return activities;
  }

  async getUserFavorites(userId) {
    const user = await this.userStore.getUserById(userId);

    const documentIds = user.favorites.filter(f => f.type === FAVORITE_TYPE.document).map(d => d.id);
    const roomIds = user.favorites.filter(f => f.type === FAVORITE_TYPE.room).map(r => r.id);
    const lessonIds = user.favorites.filter(f => f.type === FAVORITE_TYPE.lesson).map(l => l.id);

    const documents = documentIds.length ? await this.documentStore.getDocumentsMetadataByKeys(documentIds) : [];
    const rooms = roomIds.length ? await this.roomStore.getRoomsByIds(roomIds) : [];
    const lessons = lessonIds.length ? await this.lessonStore.getLessonsMetadataByIds(lessonIds) : [];

    return user.favorites.map(f => {
      if (f.type === FAVORITE_TYPE.document) {
        const document = documents.find(d => d._id === f.id);
        return { ...f, title: document.title };
      }
      if (f.type === FAVORITE_TYPE.room) {
        const room = rooms.find(r => r._id === f.id);
        return { ...f, title: room.name };
      }
      if (f.type === FAVORITE_TYPE.lesson) {
        const lesson = lessons.find(l => l._id === f.id);
        return { ...f, title: lesson.title };
      }
      return { ...f };
    });
  }
}

export default DashboardService;
