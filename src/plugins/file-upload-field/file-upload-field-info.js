import joi from 'joi';
import React from 'react';
import cloneDeep from '../../utils/clone-deep.js';
import { MAXIMUM_ALLOWED_UPLOAD_FILE_COUNT } from './constants.js';
import { FileUploadFieldIcon } from '../../components/icons/icons.js';

class FileUploadFieldInfo {
  static typeName = 'file-upload-field';

  allowsInput = true;

  getDisplayName(t) {
    return t('fileUploadField:name');
  }

  getIcon() {
    return <FileUploadFieldIcon />;
  }

  async resolveDisplayComponent() {
    return (await import('./file-upload-field-display.js')).default;
  }

  async resolveEditorComponent() {
    return (await import('./file-upload-field-editor.js')).default;
  }

  getDefaultContent() {
    return {
      label: '',
      maxCount: 1,
      width: 100
    };
  }

  validateContent(content) {
    const schema = joi.object({
      label: joi.string().allow('').required(),
      maxCount: joi.number().integer().min(1).max(MAXIMUM_ALLOWED_UPLOAD_FILE_COUNT).required(),
      width: joi.number().integer().min(0).max(100).required()
    });

    joi.attempt(content, schema, { abortEarly: false, convert: false, noDefaults: true });
  }

  cloneContent(content) {
    return cloneDeep(content);
  }

  redactContent(content) {
    return cloneDeep(content);
  }

  getCdnResources() {
    return [];
  }
}

export default FileUploadFieldInfo;
