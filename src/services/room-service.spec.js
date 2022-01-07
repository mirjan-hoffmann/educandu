import sinon from 'sinon';
import httpErrors from 'http-errors';
import RoomService from './room-service.js';
import uniqueId from '../utils/unique-id.js';
import Database from '../stores/database.js';
import RoomStore from '../stores/room-store.js';
import RoomLockStore from '../stores/room-lock-store.js';
import { ROOM_ACCESS_LEVEL } from '../domain/constants.js';
import { destroyTestEnvironment, setupTestEnvironment, pruneTestEnvironment, setupTestUser, createTestRoom } from '../test-helper.js';

const { BadRequest, NotFound } = httpErrors;

describe('room-service', () => {
  let db;
  let sut;
  let myUser;
  let result;
  let otherUser;
  let roomStore;
  let roomLockStore;
  let container;

  const sandbox = sinon.createSandbox();

  beforeAll(async () => {
    container = await setupTestEnvironment();
    roomStore = container.get(RoomStore);
    roomLockStore = container.get(RoomLockStore);

    sut = container.get(RoomService);
    db = container.get(Database);
  });

  afterAll(async () => {
    await destroyTestEnvironment(container);
  });

  beforeEach(async () => {
    myUser = await setupTestUser(container, { username: 'Me', email: 'i@myself.com' });
    otherUser = await setupTestUser(container, { username: 'Goofy', email: 'goofy@ducktown.com' });
  });

  afterEach(async () => {
    await pruneTestEnvironment(container);
  });

  describe('getRoomsOwnedOrJoinedByUser', () => {
    const now = new Date();

    beforeEach(async () => {
      sandbox.useFakeTimers(now);

      const rooms = [
        {
          name: 'Room 1',
          owner: myUser._id
        },
        {
          name: 'Room 2',
          owner: otherUser._id,
          members: [{ userId: myUser._id, joinedOn: now }]
        },
        {
          name: 'Room 3',
          owner: otherUser._id,
          members: []
        },
        {
          name: 'Room 4',
          owner: otherUser._id,
          members: [{ userId: 'onlyJoiningUser', joinedOn: now }]
        }
      ];
      await Promise.all(rooms.map(room => createTestRoom(container, room)));
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('when called with a user that both owns rooms and has joined rooms', () => {
      beforeEach(async () => {
        result = await sut.getRoomsOwnedOrJoinedByUser(myUser._id);
      });

      it('should return all owned and joined rooms', () => {
        expect(result).toHaveLength(2);
        expect(result.map(room => room.name)).toEqual(expect.arrayContaining(['Room 1', 'Room 2']));
      });
    });

    describe('when called with a user that only owns rooms', () => {
      beforeEach(async () => {
        result = await sut.getRoomsOwnedOrJoinedByUser(otherUser._id);
      });

      it('should return all owned rooms', () => {
        expect(result).toHaveLength(3);
        expect(result.map(room => room.name)).toEqual(expect.arrayContaining(['Room 2', 'Room 3', 'Room 4']));
      });
    });

    describe('when called with a user that has only joined rooms', () => {
      beforeEach(async () => {
        result = await sut.getRoomsOwnedOrJoinedByUser('onlyJoiningUser');
      });

      it('should return all joined rooms', () => {
        expect(result.map(room => room.name)).toEqual(['Room 4']);
      });
    });
  });

  describe('createRoom', () => {
    const now = new Date();
    let createdRoom;

    beforeEach(async () => {
      sandbox.useFakeTimers(now);
      createdRoom = await sut.createRoom({ name: 'my room', access: ROOM_ACCESS_LEVEL.public, user: myUser });
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should create a room', () => {
      expect(createdRoom).toEqual({
        _id: expect.stringMatching(/\w+/),
        name: 'my room',
        owner: myUser._id,
        access: ROOM_ACCESS_LEVEL.public,
        createdOn: now,
        createdBy: myUser._id,
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

    afterEach(() => {
      sandbox.restore();
    });

    it('should create a new invitation if it does not exist', async () => {
      const { invitation } = await sut.createOrUpdateInvitation({ roomId: myPrivateRoom._id, email: 'invited-user@test.com', user: myUser });
      expect(invitation.token).toBeDefined();
    });

    it('should throw a bad request if the owner invites themselves', () => {
      expect(() => sut.createOrUpdateInvitation({ roomId: myPrivateRoom._id, email: myUser.email, user: myUser })).rejects.toThrow(BadRequest);
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
      const lock = { key: 'room' };

      beforeEach(async () => {
        sandbox.stub(roomLockStore, 'takeLock').resolves(lock);
        sandbox.stub(roomLockStore, 'releaseLock').resolves();

        await sut.confirmInvitation({ token: invitation.token, user: otherUser });
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should take a lock on the room', () => {
        sinon.assert.calledWith(roomLockStore.takeLock, invitation.roomId);
      });

      it('should release thelock on the room', () => {
        sinon.assert.calledWith(roomLockStore.releaseLock, lock);
      });

      it('should add the user as a room member if user and token are valid', async () => {
        const roomFromDb = await db.rooms.findOne({ _id: testRoom._id });

        expect(roomFromDb.members).toEqual([
          {
            userId: otherUser._id,
            joinedOn: expect.any(Date)
          }
        ]);
      });

      it('should remove the invitation from the database', async () => {
        const invitationFromDb = await db.roomInvitations.findOne({ _id: invitation._id });
        expect(invitationFromDb).toBeNull();
      });

      describe('and the user gets invited a second time', () => {
        let existingMemberJoinedOn;

        beforeEach(async () => {
          ({ invitation } = await sut.createOrUpdateInvitation({ roomId: testRoom._id, email: otherUser.email, user: myUser }));

          const roomFromDb = await db.rooms.findOne({ _id: testRoom._id });
          existingMemberJoinedOn = roomFromDb.members[0].joinedOn;

          await sut.confirmInvitation({ token: invitation.token, user: otherUser });
        });

        it('should not add the user user a second time', async () => {
          const roomFromDb = await db.rooms.findOne({ _id: testRoom._id });

          expect(roomFromDb.members).toEqual([
            {
              userId: otherUser._id,
              joinedOn: existingMemberJoinedOn
            }
          ]);
        });

        it('should remove the invitation from the database', async () => {
          const invitationFromDb = await db.roomInvitations.findOne({ _id: invitation._id });
          expect(invitationFromDb).toBeNull();
        });
      });
    });
  });

  describe('getRoomInvitations', () => {
    let testRoom = null;
    let invitation = null;

    beforeEach(async () => {
      testRoom = await sut.createRoom({ name: 'test-room', access: ROOM_ACCESS_LEVEL.private, user: myUser });
      ({ invitation } = await sut.createOrUpdateInvitation({ roomId: testRoom._id, email: otherUser.email, user: myUser }));

    });

    it('should retrieve the invitation', async () => {
      delete invitation.roomId;
      delete invitation.token;

      const invitations = await sut.getRoomInvitations(testRoom._id);
      expect(invitations).toEqual([invitation]);
    });

  });

  describe('isRoomOwnerOrMember', () => {
    const roomId = uniqueId.create();
    beforeEach(async () => {
      await roomStore.save({
        _id: roomId,
        name: 'my room',
        access: ROOM_ACCESS_LEVEL.private,
        owner: myUser._id,
        members: [
          {
            userId: otherUser._id,
            joinedOn: new Date()
          }
        ]
      });
    });

    it('should return true when the user is the owner', async () => {
      result = await sut.isRoomOwnerOrMember(roomId, myUser._id);
      expect(result).toBe(true);
    });

    it('should return true when the user is a member', async () => {
      result = await sut.isRoomOwnerOrMember(roomId, otherUser._id);
      expect(result).toBe(true);
    });

    it('should return false when the is not a member', async () => {
      result = await sut.isRoomOwnerOrMember(roomId, uniqueId.create());
      expect(result).toBe(false);
    });
  });
});
