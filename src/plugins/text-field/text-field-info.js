import joi from 'joi';
import React from 'react';
import { TEXT_FIELD_MODE } from './constants.js';
import cloneDeep from '../../utils/clone-deep.js';
import { TextFieldIcon } from '../../components/icons/icons.js';

class TextFieldInfo {
  static typeName = 'text-field';

  allowsInput = true;

  getDisplayName(t) {
    return t('textField:name');
  }

  getIcon() {
    return <TextFieldIcon />;
  }

  async resolveDisplayComponent() {
    return (await import('./text-field-display.js')).default;
  }

  async resolveEditorComponent() {
    return (await import('./text-field-editor.js')).default;
  }

  getDefaultContent() {
    return {
      mode: TEXT_FIELD_MODE.singleLine,
      label: '',
      maxLength: 0,
      width: 100
    };
  }

  validateContent(content) {
    const schema = joi.object({
      mode: joi.string().valid(...Object.values(TEXT_FIELD_MODE)).required(),
      label: joi.string().allow('').required(),
      maxLength: joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER).required(),
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

export default TextFieldInfo;
