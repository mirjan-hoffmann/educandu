import moment from 'moment';
import httpErrors from 'http-errors';
import Logger from '../common/logger.js';
import Cdn from '../repositories/cdn.js';
import uniqueId from '../utils/unique-id.js';
import urlUtils from '../utils/url-utils.js';
import RoomStore from '../stores/room-store.js';
import LockStore from '../stores/lock-store.js';
import UserStore from '../stores/user-store.js';
import DocumentStore from '../stores/document-store.js';
import TransactionRunner from '../stores/transaction-runner.js';
import { getPathForPrivateRoom } from '../utils/storage-utils.js';
import RoomInvitationStore from '../stores/room-invitation-store.js';
import { ensureIsExcluded, getSymmetricalDifference } from '../utils/array-utils.js';
import {
  STORAGE_DIRECTORY_MARKER_NAME,
  INVALID_ROOM_INVITATION_REASON,
  PENDING_ROOM_INVITATION_EXPIRATION_IN_DAYS
} from '../domain/constants.js';

const { BadRequest, NotFound } = httpErrors;

const logger = new Logger(import.meta.url);

export default class RoomService {
  static get inject() {
    return [Cdn, RoomStore, RoomInvitationStore, LockStore, UserStore, DocumentStore, TransactionRunner];
  }

  constructor(cdn, roomStore, roomInvitationStore, lockStore, userStore, documentStore, transactionRunner) {
    this.cdn = cdn;
    this.roomStore = roomStore;
    this.lockStore = lockStore;
    this.userStore = userStore;
    this.documentStore = documentStore;
    this.transactionRunner = transactionRunner;
    this.roomInvitationStore = roomInvitationStore;
  }

  getRoomById(roomId) {
    return this.roomStore.getRoomById(roomId);
  }

  getRoomInvitationById(roomInvitationId) {
    return this.roomInvitationStore.getRoomInvitationById(roomInvitationId);
  }

  getRoomsOwnedByUser(userId) {
    return this.roomStore.getRoomsByOwnerId(userId);
  }

  getRoomsOwnedOrJoinedByUser(userId) {
    return this.roomStore.getRoomsOwnedOrJoinedByUser(userId);
  }

  getRoomsByOwnerOrCollaboratorUser(userId) {
    return this.roomStore.getRoomsByOwnerOrCollaboratorUser({ userId });
  }

  getRoomInvitationsByEmail(email) {
    return this.roomInvitationStore.getRoomInvitationsByEmail(email);
  }

  async isRoomOwnerOrMember(roomId, userId) {
    const room = await this.roomStore.getRoomsByIdOwnedOrJoinedByUser({ roomId, userId });
    return !!room;
  }

  async createRoom({ name, slug, documentsMode, user }) {
    const roomId = uniqueId.create();

    await this.createUploadDirectoryMarkerForRoom(roomId);

    const newRoom = {
      _id: roomId,
      name,
      slug: slug?.trim() || '',
      documentsMode,
      description: '',
      owner: user._id,
      createdBy: user._id,
      createdOn: new Date(),
      updatedOn: new Date(),
      members: [],
      documents: []
    };

    try {
      await this.roomStore.saveRoom(newRoom);
    } catch (error) {
      await this.deleteUploadDirectoryMarkerForRoom(roomId);
      throw error;
    }

    return newRoom;
  }

  async createUploadDirectoryMarkerForRoom(roomId) {
    const homePath = getPathForPrivateRoom(roomId);
    const directoryMarkerPath = urlUtils.concatParts(homePath, STORAGE_DIRECTORY_MARKER_NAME);
    await this.cdn.uploadEmptyObject(directoryMarkerPath);
  }

  async deleteUploadDirectoryMarkerForRoom(roomId) {
    const homePath = getPathForPrivateRoom(roomId);
    const directoryMarkerPath = urlUtils.concatParts(homePath, STORAGE_DIRECTORY_MARKER_NAME);
    await this.cdn.deleteObject(directoryMarkerPath);
  }

  async updateRoomMetadata(roomId, { name, slug, documentsMode, description }) {
    await this.roomStore.updateRoomMetadata(
      roomId,
      {
        name: name.trim(),
        slug: (slug || '').trim(),
        documentsMode,
        description: (description || '').trim(),
        updatedOn: new Date()
      }
    );
    const updatedRoom = await this.roomStore.getRoomById(roomId);

    return updatedRoom;
  }

  async updateRoomDocumentsOrder(roomId, documentIds) {
    let lock;

    try {
      lock = await this.lockStore.takeRoomLock(roomId);
      const room = await this.roomStore.getRoomById(roomId);
      const roomDocuments = await this.documentStore.getDocumentsExtendedMetadataByIds(room.documents);
      const draftDocumentIds = roomDocuments.filter(doc => doc.roomContext.draft).map(doc => doc._id);
      const nonDraftDocumentIds = roomDocuments.filter(doc => !doc.roomContext.draft).map(doc => doc._id);

      const allNonDraftDocumentIdsCorrectlyProvided = getSymmetricalDifference(documentIds, nonDraftDocumentIds).length === 0;
      const allDocumentIdsCorrectlyProvided = getSymmetricalDifference(documentIds, room.documents).length === 0;

      if (!allNonDraftDocumentIdsCorrectlyProvided && !allDocumentIdsCorrectlyProvided) {
        throw new BadRequest('Incorrect list of document ids was provided.');
      }

      const reorderedNonDraftDocumentIds = documentIds.map(docId => {
        const document = roomDocuments.find(doc => doc._id === docId);
        return document.roomContext.draft ? null : document._id;
      }).filter(doc => doc);
      const reorderedDocumentIds = [
        ...reorderedNonDraftDocumentIds,
        ...draftDocumentIds
      ];

      await this.roomStore.updateRoomDocuments(roomId, reorderedDocumentIds);
    } finally {
      await this.lockStore.releaseLock(lock);
    }

    const updatedRoom = await this.roomStore.getRoomById(roomId);
    return updatedRoom;
  }

  getRoomInvitations(roomId) {
    return this.roomInvitationStore.getRoomInvitationMetadataByRoomId(roomId);
  }

  async createOrUpdateInvitations({ roomId, emails, user }) {
    const now = new Date();
    const lowerCasedEmails = [...new Set(emails.map(email => email.toLowerCase()))];

    const room = await this.roomStore.getRoomByIdAndOwnerId({ roomId, ownerId: user._id });
    if (!room) {
      throw new NotFound(`A room with ID '${roomId}' owned by '${user._id}' could not be found`);
    }

    const owner = await this.userStore.getUserById(room.owner);
    const lowerCasedOwnerEmail = owner.email.toLowerCase();
    if (lowerCasedEmails.some(email => email === lowerCasedOwnerEmail)) {
      throw new BadRequest('Invited user is the same as room owner');
    }

    const invitations = await Promise.all(lowerCasedEmails.map(async email => {
      let invitation = await this.roomInvitationStore.getRoomInvitationByRoomIdAndEmail({ roomId, email });
      if (!invitation) {
        invitation = {
          _id: uniqueId.create(),
          token: uniqueId.create(),
          roomId,
          email
        };
      }

      invitation.sentOn = now;
      invitation.expires = moment(now).add(PENDING_ROOM_INVITATION_EXPIRATION_IN_DAYS, 'days').toDate();

      logger.info(`Creating or updating room invitation with ID ${invitation._id}`);
      await this.roomInvitationStore.saveRoomInvitation(invitation);
      return invitation;
    }));

    return { room, owner, invitations };
  }

  async verifyInvitationToken({ token, user }) {
    const response = {
      roomId: null,
      roomName: null,
      roomSlug: null,
      invalidInvitationReason: null
    };

    const invitation = await this.roomInvitationStore.getRoomInvitationByToken(token);
    if (!invitation) {
      response.invalidInvitationReason = INVALID_ROOM_INVITATION_REASON.token;
      return response;
    }

    if (invitation.email !== user.email) {
      response.invalidInvitationReason = INVALID_ROOM_INVITATION_REASON.user;
      logger.debug(`Invitation ${invitation._id} was sent to email '${invitation?.email}' but accessed by user with email '${user.email}'`);
      return response;
    }

    const room = await this.roomStore.getRoomById(invitation.roomId);
    if (!room) {
      response.invalidInvitationReason = INVALID_ROOM_INVITATION_REASON.room;
      return response;
    }

    response.roomId = room._id;
    response.roomName = room.name;
    response.roomSlug = room.slug;
    return response;
  }

  async confirmInvitation({ token, user }) {
    const invitation = await this.roomInvitationStore.getRoomInvitationByToken(token);
    if (invitation?.email !== user.email) {
      throw new NotFound();
    }

    await this.transactionRunner.run(async session => {
      const newMember = {
        userId: user._id,
        joinedOn: new Date()
      };

      let lock;

      try {
        lock = await this.lockStore.takeRoomLock(invitation.roomId);

        const roomContainingNewMember = await this.roomStore.getRoomByIdJoinedByUser(
          { roomId: invitation.roomId, userId: newMember.userId },
          { session }
        );

        if (!roomContainingNewMember) {
          await this.roomStore.appendRoomMember({ roomId: invitation.roomId, member: newMember }, { session });
        }

        await this.roomInvitationStore.deleteRoomInvitationById(invitation._id, { session });
      } finally {
        await this.lockStore.releaseLock(lock);
      }
    });
  }

  async removeRoomMember({ room, memberUserId }) {
    const member = room.members.find(m => m.userId === memberUserId);
    const remainingMembers = ensureIsExcluded(room.members, member);
    await this.roomStore.updateRoomMembers(room._id, remainingMembers);

    const updatedRoom = await this.roomStore.getRoomById(room._id);

    return updatedRoom;
  }

  async removeMembershipFromAllRoomsForUser(memberUserId) {
    await this.roomStore.deleteRoomsMemberById(memberUserId);
  }

  async deleteRoomInvitation({ room, invitation }) {
    await this.roomInvitationStore.deleteRoomInvitationById(invitation._id);
    const remainingRoomInvitations = await this.getRoomInvitations(room._id);

    return remainingRoomInvitations;
  }
}
