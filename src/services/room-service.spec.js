import httpErrors from 'http-errors';
import RoomService from './room-service.js';
import Database from '../stores/database.js';
import { ROOM_ACCESS_LEVEL } from '../common/constants.js';
import { destroyTestEnvironment, setupTestEnvironment, pruneTestEnvironment, setupTestUser } from '../test-helper.js';

const { BadRequest, NotFound } = httpErrors;

describe('room-service', () => {
  let myUser;
  let otherUser;
  let container;
  let sut;
  let db;

  beforeAll(async () => {
    container = await setupTestEnvironment();
    myUser = await setupTestUser(container, { username: 'Me', email: 'i@myself.com' });
    otherUser = await setupTestUser(container, { username: 'Goofy', email: 'goofy@ducktown.com' });
    sut = container.get(RoomService);
    db = container.get(Database);
  });

  afterAll(async () => {
    await destroyTestEnvironment(container);
  });

  afterEach(async () => {
    await pruneTestEnvironment(container);
  });

  describe('createRoom', () => {
    let createdRoom;
    beforeEach(async () => {
      createdRoom = await sut.createRoom({ name: 'my room', access: ROOM_ACCESS_LEVEL.public, user: myUser });
    });

    it('should create a room', () => {
      expect(createdRoom).toEqual({
        _id: expect.stringMatching(/\w+/),
        name: 'my room',
        owner: myUser._id,
        access: ROOM_ACCESS_LEVEL.public,
        members: []
      });
    });

    describe('when retrieving the room', () => {
      it('should retrieve the room', async () => {
        const retrievedRoom = await sut.getRoomById(createdRoom._id);
        expect(retrievedRoom).toEqual(createdRoom);
      });
    });
  });

  describe('findOwnedRoomById', () => {
    let myRoom = null;
    let otherRoom = null;

    beforeEach(async () => {
      [myRoom, otherRoom] = await Promise.all([
        sut.createRoom({ name: 'my room', access: ROOM_ACCESS_LEVEL.public, user: myUser }),
        sut.createRoom({ name: 'not my room', access: ROOM_ACCESS_LEVEL.public, user: otherUser })
      ]);
    });

    it('should find rooms owned by the specified user ID', async () => {
      const room = await sut.findOwnedRoomById({ roomId: myRoom._id, ownerId: myUser._id });
      expect(room.name).toBe('my room');
    });

    it('should throw when trying to find rooms owned by other users', async () => {
      await expect(async () => {
        await sut.findOwnedRoomById({ roomId: otherRoom._id, ownerId: myUser._id });
      }).rejects.toThrow(NotFound);
    });
  });

  describe('createOrUpdateInvitation', () => {
    let myPublicRoom = null;
    let myPrivateRoom = null;

    beforeEach(async () => {
      [myPublicRoom, myPrivateRoom] = await Promise.all([
        await sut.createRoom({ name: 'my public room', access: ROOM_ACCESS_LEVEL.public, user: myUser }),
        await sut.createRoom({ name: 'my private room', access: ROOM_ACCESS_LEVEL.private, user: myUser })
      ]);
    });

    it('should create a new invitation if it does not exist', async () => {
      const { invitation } = await sut.createOrUpdateInvitation({ roomId: myPrivateRoom._id, email: 'invited-user@test.com', user: myUser });
      expect(invitation.token).toBeDefined();
    });

    it('should update an invitation if it already exists', async () => {
      const { invitation: originalInvitation } = await sut.createOrUpdateInvitation({ roomId: myPrivateRoom._id, email: 'invited-user@test.com', user: myUser });
      const { invitation: updatedInvitation } = await sut.createOrUpdateInvitation({ roomId: myPrivateRoom._id, email: 'invited-user@test.com', user: myUser });
      expect(updatedInvitation._id).toBe(originalInvitation._id);
      expect(updatedInvitation.token).not.toBe(originalInvitation.token);
      expect(updatedInvitation.sentOn).not.toBe(originalInvitation.sentOn);
      expect(updatedInvitation.expires.getTime()).toBeGreaterThan(originalInvitation.expires.getTime());
    });

    it('should throw a BadRequest error when the room is public', async () => {
      await expect(async () => {
        await sut.createOrUpdateInvitation({ roomId: myPublicRoom._id, email: 'invited-user@test.com', user: myUser });
      }).rejects.toThrow(BadRequest);
    });

    it('should throw a NotFound error when the room does not exist', async () => {
      await expect(async () => {
        await sut.createOrUpdateInvitation({ roomId: 'abcabcabcabcabc', email: 'invited-user@test.com', user: myUser });
      }).rejects.toThrow(NotFound);
    });

    it('should throw a NotFound error when the room exists, but belongs to a different user', async () => {
      await expect(async () => {
        await sut.createOrUpdateInvitation({ roomId: 'abcabcabcabcabc', email: 'invited-user@test.com', user: { _id: 'xyzxyzxyzxyzxyz' } });
      }).rejects.toThrow(NotFound);
    });
  });

  describe('verifyInvitationToken', () => {
    let testRoom = null;
    let invitation = null;

    beforeEach(async () => {
      testRoom = await sut.createRoom({ name: 'test-room', access: ROOM_ACCESS_LEVEL.private, user: myUser });
      ({ invitation } = await sut.createOrUpdateInvitation({ roomId: testRoom._id, email: otherUser.email, user: myUser }));
    });

    it('should be valid if user and token are valid', async () => {
      const { roomId, roomName, isValid } = await sut.verifyInvitationToken({ token: invitation.token, user: otherUser });
      expect(isValid).toBe(true);
      expect(roomId).toBe(testRoom._id);
      expect(roomName).toBe(testRoom.name);
    });

    it('should be invalid if user is valid but token is invalid', async () => {
      const { roomId, roomName, isValid } = await sut.verifyInvitationToken({ token: '34z5c7z47z92234z592qz', user: otherUser });
      expect(isValid).toBe(false);
      expect(roomId).toBeNull();
      expect(roomName).toBeNull();
    });

    it('should be invalid if token is valid but user is invalid', async () => {
      const { roomId, roomName, isValid } = await sut.verifyInvitationToken({ token: invitation.token, user: myUser });
      expect(isValid).toBe(false);
      expect(roomId).toBeNull();
      expect(roomName).toBeNull();
    });
  });

  describe('confirmInvitation', () => {
    let testRoom = null;
    let invitation = null;

    beforeEach(async () => {
      testRoom = await sut.createRoom({ name: 'test-room', access: ROOM_ACCESS_LEVEL.private, user: myUser });
      ({ invitation } = await sut.createOrUpdateInvitation({ roomId: testRoom._id, email: otherUser.email, user: myUser }));
    });

    it('should throw NotFound if invitation does not exist', async () => {
      await expect(async () => {
        await sut.confirmInvitation({ token: '34z5c7z47z92234z592qz', user: otherUser });
      }).rejects.toThrow(NotFound);
    });

    it('should throw NotFound if the email is not the email used in the invitation', async () => {
      await expect(async () => {
        await sut.confirmInvitation({ token: invitation.token, user: { ...otherUser, email: 'changed@test.com' } });
      }).rejects.toThrow(NotFound);
    });

    describe('when user and token are valid', () => {
      beforeEach(async () => {
        await sut.confirmInvitation({ token: invitation.token, user: otherUser });
      });

      it('should add the user as a room member if user and token are valid', async () => {
        const roomFromDb = await db.rooms.findOne({ _id: testRoom._id });
        expect(roomFromDb.members).toHaveLength(1);
        expect(roomFromDb.members[0]).toEqual({
          userId: otherUser._id,
          joinedOn: expect.any(Date)
        });
      });

      it('should remove the invitation from the database', async () => {
        const invitationFromDb = await db.roomInvitations.findOne({ _id: invitation._id });
        expect(invitationFromDb).toBeNull();
      });
    });
  });

});
