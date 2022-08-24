import { isRoomOwnerOrCollaborator } from './room-utils.js';
import permissions, { hasUserPermission } from '../domain/permissions.js';
import { DOCUMENT_ALLOWED_OPEN_CONTRIBUTION, DOCUMENT_ORIGIN } from '../domain/constants.js';

export function canEditDocContent({ user, doc, room }) {
  const isExternalDocument = doc.origin.startsWith(DOCUMENT_ORIGIN.external);
  const docIsEditable = !isExternalDocument && !doc.archived;
  const userHasPermission = hasUserPermission(user, permissions.RESTRICT_OPEN_CONTRIBUTION);
  const docAllowsContribution = doc.allowedOpenContribution === DOCUMENT_ALLOWED_OPEN_CONTRIBUTION.metadataAndContent
    || doc.allowedOpenContribution === DOCUMENT_ALLOWED_OPEN_CONTRIBUTION.content;
  const docAllowsContributionWithinRoom = room ? isRoomOwnerOrCollaborator({ room, userId: user?._id }) : true;

  return docIsEditable && (userHasPermission || (docAllowsContribution && docAllowsContributionWithinRoom));
}

export function canEditDocMetadata({ user, doc, room }) {
  const isExternalDocument = doc.origin.startsWith(DOCUMENT_ORIGIN.external);
  const docIsEditable = !isExternalDocument && !doc.archived;
  const userHasPermission = hasUserPermission(user, permissions.RESTRICT_OPEN_CONTRIBUTION);
  const docAllowsMetadataContribution = doc.allowedOpenContribution === DOCUMENT_ALLOWED_OPEN_CONTRIBUTION.metadataAndContent;
  const docAllowsContributionWithinRoom = room ? isRoomOwnerOrCollaborator({ room, userId: user?._id }) : true;

  return docIsEditable && (userHasPermission || (docAllowsMetadataContribution && docAllowsContributionWithinRoom));
}
