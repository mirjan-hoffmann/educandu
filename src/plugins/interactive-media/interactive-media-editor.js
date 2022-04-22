import by from 'thenby';
import React, { useState } from 'react';
import { Form, Input, Radio } from 'antd';
import { SOURCE_TYPE } from './constants.js';
import { useTranslation } from 'react-i18next';
import validation from '../../ui/validation.js';
import Timeline from '../../components/timeline.js';
import { removeItemAt } from '../../utils/array-utils.js';
import ClientConfig from '../../bootstrap/client-config.js';
import { useService } from '../../components/container-context.js';
import { sectionEditorProps } from '../../ui/default-prop-types.js';
import StorageFilePicker from '../../components/storage-file-picker.js';

const FormItem = Form.Item;
const RadioGroup = Radio.Group;
const RadioButton = Radio.Button;

const ensurePartsOrder = parts => {
  return parts.sort(by(part => part.startTimecode));
};

function InteractiveMediaEditor({ content, onContentChanged, publicStorage, privateStorage }) {
  const clientConfig = useService(ClientConfig);
  const { t } = useTranslation('interactiveMedia');

  const { sourceType, sourceUrl } = content;

  const formItemLayout = {
    labelCol: { span: 4 },
    wrapperCol: { span: 14 }
  };

  const lastTimecode = 7;
  const initialParts = [
    {
      title: 'the brown fox',
      startTimecode: 0
    },
    {
      title: 'jumped the veeeeeeeeeery looooong fence',
      startTimecode: 2 * 1000
    },
    {
      title: 'the end',
      startTimecode: lastTimecode * 1000
    }
  ].map((part, index) => ({ ...part, key: index.toString() }));

  const [parts, setParts] = useState(ensurePartsOrder(initialParts));
  const length = (lastTimecode * 1000) + 1000;

  const handlePartAdd = startTimecode => {
    const newPart = {
      key: parts.length.toString(),
      title: parts.length.toString(),
      startTimecode
    };
    setParts(ensurePartsOrder([...parts, newPart]));
  };

  const handlePartDelete = key => {
    const part = parts.find(p => p.key === key);
    const partIndex = parts.findIndex(p => p.key === key);
    const nextPart = parts[partIndex + 1];
    if (nextPart) {
      nextPart.startTimecode = part.startTimecode;
    }
    const newParts = removeItemAt(parts, partIndex);
    setParts(newParts);
  };

  const handleStartTimecodeChange = (key, newStartTimecode) => {
    const part = parts.find(p => p.key === key);
    part.startTimecode = newStartTimecode;
    setParts(parts.slice());
  };

  const changeContent = (newContentValues, isInvalid) => {
    onContentChanged({ ...content, ...newContentValues }, isInvalid);
  };

  const handleSourceTypeChange = event => {
    const { value } = event.target;
    changeContent({
      sourceType: value,
      sourceUrl: '',
      showVideo: true
    });
  };

  const handleExternalUrlChange = event => {
    const { value } = event.target;
    const isInvalid = validation.validateUrl(value, t).validateStatus === 'error';
    changeContent({ sourceUrl: value }, isInvalid);
  };

  const handleYoutubeUrlChanged = event => {
    const { value } = event.target;
    const isInvalid = validation.validateUrl(value, t).validateStatus === 'error';
    changeContent({ sourceUrl: value }, isInvalid);
  };

  const handleInternalUrlChanged = event => {
    const { value } = event.target;
    changeContent({ sourceUrl: value });
  };

  const handleInternalUrlFileNameChanged = value => {
    changeContent({ sourceUrl: value });
  };

  return (
    <div className="InteractiveMediaEditor">
      <Form layout="horizontal">
        <FormItem label={t('common:source')} {...formItemLayout}>
          <RadioGroup value={sourceType} onChange={handleSourceTypeChange}>
            <RadioButton value={SOURCE_TYPE.external}>{t('common:externalLink')}</RadioButton>
            <RadioButton value={SOURCE_TYPE.internal}>{t('common:internalLink')}</RadioButton>
            <RadioButton value={SOURCE_TYPE.youtube}>{t('common:youtube')}</RadioButton>
          </RadioGroup>
        </FormItem>
        {sourceType === SOURCE_TYPE.external && (
          <FormItem label={t('common:externalUrl')} {...formItemLayout} {...validation.validateUrl(sourceUrl, t)} hasFeedback>
            <Input value={sourceUrl} onChange={handleExternalUrlChange} />
          </FormItem>
        )}
        {sourceType === SOURCE_TYPE.internal && (
          <FormItem label={t('common:internalUrl')} {...formItemLayout}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Input
                addonBefore={`${clientConfig.cdnRootUrl}/`}
                value={sourceUrl}
                onChange={handleInternalUrlChanged}
                />
              <StorageFilePicker
                publicStorage={publicStorage}
                privateStorage={privateStorage}
                fileName={sourceUrl}
                onFileNameChanged={handleInternalUrlFileNameChanged}
                />
            </div>
          </FormItem>
        )}
        {sourceType === SOURCE_TYPE.youtube && (
          <FormItem label={t('common:youtubeUrl')} {...formItemLayout} {...validation.validateUrl(sourceUrl, t)} hasFeedback>
            <Input value={sourceUrl} onChange={handleYoutubeUrlChanged} />
          </FormItem>
        )}
      </Form>

      <Timeline length={length} parts={parts} onPartAdd={handlePartAdd} onPartDelete={handlePartDelete} onStartTimecodeChange={handleStartTimecodeChange} />
    </div>
  );
}

InteractiveMediaEditor.propTypes = {
  ...sectionEditorProps
};

export default InteractiveMediaEditor;
