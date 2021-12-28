import joi from 'joi';
import { idOrKeySchema } from './shared-schemas.js';
import { ROOM_ACCESS_LEVEL } from '../../common/constants.js';

export const getRoomMembershipConfirmationParamsSchema = joi.object({
  token: idOrKeySchema.required()
});

export const postRoomBodySchema = joi.object({
  name: joi.string().required(),
  access: joi.string().valid(...Object.values(ROOM_ACCESS_LEVEL)).required()
});

export const postRoomInvitationBodySchema = joi.object({
  roomId: idOrKeySchema.required(),
  email: joi.string().required()
});

export const postRoomInvitationConfirmBodySchema = joi.object({
  token: idOrKeySchema.required()
});

export const getRoomParamsSchema = joi.object({
  roomId: joi.string().required()
});

export const getAuthorizeResourcesAccessParamsSchema = joi.object({
  roomId: joi.string().required()
});