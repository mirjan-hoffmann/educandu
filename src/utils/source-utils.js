import escapeStringRegexp from 'escape-string-regexp';
import { getUrlValidationStatus, URL_VALIDATION_STATUS } from '../ui/validation.js';
import {
  SOURCE_TYPE,
  CDN_URL_PREFIX,
  INTERNAL_PUBLIC_STORAGE_PATH_PATTERN,
  INTERNAL_PRIVATE_STORAGE_PATH_PATTERN
} from '../domain/constants.js';

export function isCdnUrl({ url = '', cdnRootUrl = '' }) {
  return (cdnRootUrl && url.startsWith(cdnRootUrl)) || url.startsWith(CDN_URL_PREFIX);
}

export function isPortableCdnUrl(url) {
  return url.startsWith(CDN_URL_PREFIX);
}

export function isCdnPath(url = '') {
  return INTERNAL_PUBLIC_STORAGE_PATH_PATTERN.test(url)
    || INTERNAL_PRIVATE_STORAGE_PATH_PATTERN.test(url);
}

export function getCdnPath({ url = '', cdnRootUrl = '' } = { url: '', cdnRootUrl: '' }) {
  return url
    .replace(new RegExp(`^${escapeStringRegexp(cdnRootUrl)}/?`), '')
    .replace(new RegExp(`^${escapeStringRegexp(CDN_URL_PREFIX)}/?`), '');
}

export function getPortableUrl({ url = '', cdnRootUrl = '' } = { url: '', cdnRootUrl: '' }) {
  if (isCdnPath(url)) {
    return `${CDN_URL_PREFIX}${url}`;
  }
  if (isCdnUrl({ url, cdnRootUrl })) {
    return `${CDN_URL_PREFIX}${getCdnPath({ url, cdnRootUrl })}`;
  }
  return url;
}

export function getAccessibleUrl({ url = '', cdnRootUrl = '' } = { url: '', cdnRootUrl: '' }) {
  if (isCdnPath(url)) {
    return `${cdnRootUrl}/${url}`;
  }
  if (isCdnUrl({ url, cdnRootUrl })) {
    return `${cdnRootUrl}/${getCdnPath({ url, cdnRootUrl })}`;
  }
  return url;
}

export function getSourceType({ url, cdnRootUrl }) {
  if (!url) {
    return SOURCE_TYPE.none;
  }

  if (isCdnUrl({ url, cdnRootUrl }) || isCdnPath(url)) {
    const cdnPath = getCdnPath({ url, cdnRootUrl });

    if (INTERNAL_PUBLIC_STORAGE_PATH_PATTERN.test(cdnPath)) {
      return SOURCE_TYPE.internalPublic;
    }
    if (INTERNAL_PRIVATE_STORAGE_PATH_PATTERN.test(cdnPath)) {
      return SOURCE_TYPE.internalPrivate;
    }
  }

  if (url.startsWith('https://www.youtube.com/') || url.startsWith('https://youtu.be/')) {
    return SOURCE_TYPE.youtube;
  }

  if (url.startsWith('https://upload.wikimedia.org/')) {
    return SOURCE_TYPE.wikimediaCommons;
  }

  if (getUrlValidationStatus(url) === URL_VALIDATION_STATUS.valid) {
    return SOURCE_TYPE.external;
  }

  return SOURCE_TYPE.unsupported;
}

export function isInternalSourceType({ url, cdnRootUrl }) {
  const sourceType = getSourceType({ url, cdnRootUrl });
  return sourceType === SOURCE_TYPE.internalPrivate || sourceType === SOURCE_TYPE.internalPublic;
}

export function couldAccessUrlFromRoom(url, targetRoomId) {
  const urlOrCdnPath = getCdnPath({ url });
  const sourceRoomId = urlOrCdnPath.match(INTERNAL_PRIVATE_STORAGE_PATH_PATTERN)?.[1];
  return !sourceRoomId || sourceRoomId === targetRoomId;
}