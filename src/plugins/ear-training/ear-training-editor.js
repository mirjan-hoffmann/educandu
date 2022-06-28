import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import validation from '../../ui/validation.js';
import { PlusOutlined } from '@ant-design/icons';
import { Form, Input, Button, Radio } from 'antd';
import cloneDeep from '../../utils/clone-deep.js';
import EarTrainingInfo from './ear-training-info.js';
import ItemPanel from '../../components/item-panel.js';
import { TESTS_ORDER, TEST_MODE } from './constants.js';
import ClientConfig from '../../bootstrap/client-config.js';
import { IMAGE_SOURCE_TYPE } from '../../domain/constants.js';
import MarkdownInput from '../../components/markdown-input.js';
import ResourcePicker from '../../components/resource-picker.js';
import { useService } from '../../components/container-context.js';
import EarTrainingSoundEditor from './ear-training-sound-editor.js';
import { sectionEditorProps } from '../../ui/default-prop-types.js';
import { swapItemsAt, removeItemAt } from '../../utils/array-utils.js';
import ObjectWidthSlider from '../../components/object-width-slider.js';
import { storageLocationPathToUrl, urlToStorageLocationPath } from '../../utils/storage-utils.js';

const { TextArea } = Input;
const FormItem = Form.Item;
const RadioGroup = Radio.Group;
const RadioButton = Radio.Button;

const DEFAULT_ABC_CODE = 'X:1';
function EarTrainingEditor({ content, onContentChanged }) {
  const { t } = useTranslation('earTraining');
  const clientConfig = useService(ClientConfig);
  const earTrainingInfo = useService(EarTrainingInfo);

  const { tests } = content;

  const formItemLayout = {
    labelCol: { span: 4 },
    wrapperCol: { span: 14 }
  };

  const changeContent = newContentValues => {
    onContentChanged({ ...content, ...newContentValues }, false);
  };

  const handleTitleChanged = event => {
    const { value } = event.target;
    changeContent({ title: value });
  };

  const handleWidthChanged = newValue => {
    changeContent({ width: newValue });
  };

  const handleQuestionAbcCodeChanged = (event, index) => {
    const { value } = event.target;
    const newTests = tests.map((test, i) => i === index ? { ...test, questionAbcCode: value } : test);
    changeContent({ tests: newTests });
  };

  const handleAnswerAbcCodeChanged = (event, index) => {
    const { value } = event.target;
    const newTests = tests.map((test, i) => i === index ? { ...test, answerAbcCode: value } : test);
    changeContent({ tests: newTests });
  };

  const handleSoundChanged = (value, index) => {
    const newTests = tests.map((test, i) => i === index ? { ...test, sound: value } : test);
    changeContent({ tests: newTests });
  };

  const handleDeleteTest = index => {
    const newTests = removeItemAt(tests, index);
    changeContent({ tests: newTests });
  };

  const handleAddButtonClick = () => {
    const newTests = cloneDeep(tests);
    newTests.push(earTrainingInfo.getDefaultTest());
    changeContent({ tests: newTests });
  };

  const handleMoveTestUp = index => {
    const newTests = swapItemsAt(tests, index, index - 1);
    changeContent({ tests: newTests });
  };

  const handleMoveTestDown = index => {
    const newTests = swapItemsAt(tests, index, index + 1);
    changeContent({ tests: newTests });
  };

  const handleTestsOrderChange = event => {
    changeContent({ testsOrder: event.target.value });
  };

  const handleTestModeChange = (event, index) => {
    const { value } = event.target;
    const newTests = cloneDeep(tests);

    if (value === TEST_MODE.image) {
      newTests[index].questionImage = earTrainingInfo.getDefaultImage();
      newTests[index].answerImage = earTrainingInfo.getDefaultImage();
      newTests[index].questionAbcCode = '';
      newTests[index].answerAbcCode = '';
    } else {
      newTests[index].questionImage = null;
      newTests[index].answerImage = null;
      newTests[index].questionAbcCode = DEFAULT_ABC_CODE;
      newTests[index].answerAbcCode = DEFAULT_ABC_CODE;
    }

    newTests[index].mode = value;
    changeContent({ tests: newTests });
  };

  const handleQuestionImageSourceTypeChange = (event, index) => {
    const { value } = event.target;
    const newTests = cloneDeep(tests);
    newTests[index].questionImage.sourceType = value;
    changeContent({ tests: newTests });
  };

  const handleQuestionImageSourceUrlChange = (event, index) => {
    const { value } = event.target;
    const newTests = cloneDeep(tests);
    newTests[index].questionImage.sourceUrl = value;
    changeContent({ tests: newTests });
  };

  const handleQuestionImageSourceUrlFileNameChange = (value, index) => {
    const newTests = cloneDeep(tests);
    newTests[index].questionImage.sourceUrl = value;
    changeContent({ tests: newTests });
  };

  const handleQuestionImageTextChange = (event, index) => {
    const { value } = event.target;
    const newTests = cloneDeep(tests);
    newTests[index].questionImage.text = value;
    changeContent({ tests: newTests });
  };

  const handleAnswerImageSourceTypeChange = (event, index) => {
    const { value } = event.target;
    const newTests = cloneDeep(tests);
    newTests[index].answerImage.sourceType = value;
    changeContent({ tests: newTests });
  };

  const handleAnswerImageSourceUrlChange = (event, index) => {
    const { value } = event.target;
    const newTests = cloneDeep(tests);
    newTests[index].answerImage.sourceUrl = value;
    changeContent({ tests: newTests });
  };

  const handleAnswerImageSourceUrlFileNameChange = (value, index) => {
    const newTests = cloneDeep(tests);
    newTests[index].answerImage.sourceUrl = value;
    changeContent({ tests: newTests });
  };

  const handleAnswerImageTextChange = (event, index) => {
    const { value } = event.target;
    const newTests = cloneDeep(tests);
    newTests[index].answerImage.text = value;
    changeContent({ tests: newTests });
  };

  return (
    <div>
      <Form layout="horizontal">
        <FormItem label={t('common:title')} {...formItemLayout}>
          <MarkdownInput inline value={content.title} onChange={handleTitleChanged} />
        </FormItem>
        <Form.Item label={t('common:width')} {...formItemLayout}>
          <ObjectWidthSlider value={content.width} onChange={handleWidthChanged} />
        </Form.Item>
        <FormItem label={t('testsOrder')} {...formItemLayout}>
          <RadioGroup value={content.testsOrder} onChange={handleTestsOrderChange}>
            <RadioButton value={TESTS_ORDER.given}>{t('testsOrderGiven')}</RadioButton>
            <RadioButton value={TESTS_ORDER.random}>{t('testsOrderRandom')}</RadioButton>
          </RadioGroup>
        </FormItem>

        {tests.map((test, index) => (
          <ItemPanel
            index={index}
            key={index.toString()}
            itemsCount={tests.length}
            header={t('testNumber', { number: index + 1 })}
            onMoveUp={handleMoveTestUp}
            onMoveDown={handleMoveTestDown}
            onDelete={handleDeleteTest}
            >
            <FormItem label={t('testMode')} {...formItemLayout}>
              <RadioGroup value={test.mode} onChange={event => handleTestModeChange(event, index)}>
                <RadioButton value={TEST_MODE.image}>{t('testModeImage')}</RadioButton>
                <RadioButton value={TEST_MODE.abcCode}>{t('testModeAbcCode')}</RadioButton>
              </RadioGroup>
            </FormItem>

            {test.mode === TEST_MODE.image && (
              <Fragment>
                <span>{t('testQuestionImage')}</span>
                <FormItem label={t('common:source')} {...formItemLayout}>
                  <RadioGroup value={test.questionImage.sourceType} onChange={event => handleQuestionImageSourceTypeChange(event, index)}>
                    <RadioButton value={IMAGE_SOURCE_TYPE.external}>{t('common:externalLink')}</RadioButton>
                    <RadioButton value={IMAGE_SOURCE_TYPE.internal}>{t('common:internalCdn')}</RadioButton>
                  </RadioGroup>
                </FormItem>
                {test.questionImage.sourceType === IMAGE_SOURCE_TYPE.external && (
                  <FormItem label={t('common:externalUrl')} {...formItemLayout} {...validation.validateUrl(test.questionImage.sourceUrl, t)} hasFeedback>
                    <Input value={test.questionImage.sourceUrl} onChange={event => handleQuestionImageSourceUrlChange(event, index)} />
                  </FormItem>
                )}
                {test.questionImage.sourceType === IMAGE_SOURCE_TYPE.internal && (
                  <FormItem label={t('common:internalUrl')} {...formItemLayout}>
                    <div className="u-input-and-button">
                      <Input
                        addonBefore={`${clientConfig.cdnRootUrl}/`}
                        value={test.questionImage.sourceUrl}
                        onChange={event => handleQuestionImageSourceUrlChange(event, index)}
                        />
                      <ResourcePicker
                        url={storageLocationPathToUrl(test.questionImage.sourceUrl)}
                        onUrlChange={url => handleQuestionImageSourceUrlFileNameChange(urlToStorageLocationPath(url), index)}
                        />
                    </div>
                  </FormItem>
                )}
                <Form.Item label={t('common:copyrightInfos')} {...formItemLayout}>
                  <MarkdownInput value={test.questionImage.text} onChange={event => handleQuestionImageTextChange(event, index)} />
                </Form.Item>
                <span>{t('testAnswerImage')}</span>
                <FormItem label={t('common:source')} {...formItemLayout}>
                  <RadioGroup value={test.answerImage.sourceType} onChange={event => handleAnswerImageSourceTypeChange(event, index)}>
                    <RadioButton value={IMAGE_SOURCE_TYPE.external}>{t('common:externalLink')}</RadioButton>
                    <RadioButton value={IMAGE_SOURCE_TYPE.internal}>{t('common:internalCdn')}</RadioButton>
                  </RadioGroup>
                </FormItem>
                {test.answerImage.sourceType === IMAGE_SOURCE_TYPE.external && (
                  <FormItem label={t('common:externalUrl')} {...formItemLayout} {...validation.validateUrl(test.answerImage.sourceUrl, t)} hasFeedback>
                    <Input value={test.answerImage.sourceUrl} onChange={event => handleAnswerImageSourceUrlChange(event, index)} />
                  </FormItem>
                )}
                {test.answerImage.sourceType === IMAGE_SOURCE_TYPE.internal && (
                  <FormItem label={t('common:internalUrl')} {...formItemLayout}>
                    <div className="u-input-and-button">
                      <Input
                        addonBefore={`${clientConfig.cdnRootUrl}/`}
                        value={test.answerImage.sourceUrl}
                        onChange={event => handleAnswerImageSourceUrlChange(event, index)}
                        />
                      <ResourcePicker
                        url={storageLocationPathToUrl(test.answerImage.sourceUrl)}
                        onUrlChange={url => handleAnswerImageSourceUrlFileNameChange(urlToStorageLocationPath(url), index)}
                        />
                    </div>
                  </FormItem>
                )}
                <Form.Item label={t('common:copyrightInfos')} {...formItemLayout}>
                  <MarkdownInput value={test.answerImage.text} onChange={event => handleAnswerImageTextChange(event, index)} />
                </Form.Item>
              </Fragment>
            )}
            {test.mode === TEST_MODE.abcCode && (
              <Fragment>
                <FormItem label={t('questionAbcCode')} {...formItemLayout}>
                  <TextArea
                    value={test.questionAbcCode}
                    onChange={event => handleQuestionAbcCodeChanged(event, index)}
                    rows={6}
                    />
                </FormItem>
                <FormItem label={t('answerAbcCode')} {...formItemLayout}>
                  <TextArea
                    value={test.answerAbcCode}
                    onChange={event => handleAnswerAbcCodeChanged(event, index)}
                    rows={6}
                    />
                </FormItem>
                <EarTrainingSoundEditor
                  sound={test.sound || { ...earTrainingInfo.getDefaultSound() }}
                  onSoundChanged={value => handleSoundChanged(value, index)}
                  />
              </Fragment>
            )}
          </ItemPanel>
        ))}
      </Form>

      <Button type="primary" icon={<PlusOutlined />} onClick={handleAddButtonClick}>
        {t('addTest')}
      </Button>
    </div>
  );
}

EarTrainingEditor.propTypes = {
  ...sectionEditorProps
};

export default EarTrainingEditor;
