import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlusOutlined } from '@ant-design/icons';
import { Form, Input, Table, Button, Radio } from 'antd';
import DeleteButton from '../../components/delete-button.js';
import MarkdownInput from '../../components/markdown-input.js';
import { SOUND_SOURCE_TYPE, TESTS_ORDER } from './constants.js';
import EarTrainingSoundEditor from './ear-training-sound-editor.js';
import { sectionEditorProps } from '../../ui/default-prop-types.js';
import { swapItemsAt, removeItemAt } from '../../utils/array-utils.js';
import MoveUpIcon from '../../components/icons/general/move-up-icon.js';
import ObjectWidthSlider from '../../components/object-width-slider.js';
import MoveDownIcon from '../../components/icons/general/move-down-icon.js';

const { TextArea } = Input;
const FormItem = Form.Item;
const RadioGroup = Radio.Group;
const RadioButton = Radio.Button;
const ButtonGroup = Button.Group;

const defaultSound = { sourceType: SOUND_SOURCE_TYPE.midi, sourceUrl: null, text: null };

function EarTrainingEditor({ content, onContentChanged }) {
  const { t } = useTranslation('earTraining');

  const { tests } = content;

  const formItemLayout = {
    labelCol: { span: 4 },
    wrapperCol: { span: 14 }
  };

  const dataSource = tests.map((test, i) => ({ key: i, ...test }));
  const expandedRowKeys = dataSource.map(record => record.key);

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

  const handleStartAbcCodeChanged = (index, newValue) => {
    const newTests = tests.map((test, i) => i === index ? { ...test, startAbcCode: newValue } : test);
    changeContent({ tests: newTests });
  };

  const handleFullAbcCodeChanged = (index, newValue) => {
    const newTests = tests.map((test, i) => i === index ? { ...test, fullAbcCode: newValue } : test);
    changeContent({ tests: newTests });
  };

  const handleSoundChanged = (index, newValue) => {
    const newTests = tests.map((test, i) => i === index ? { ...test, sound: newValue } : test);
    changeContent({ tests: newTests });
  };

  const handleDeleteButtonClick = index => {
    const newTests = removeItemAt(tests, index);
    changeContent({ tests: newTests });
  };

  const handleAddButtonClick = () => {
    const newTests = tests.slice();
    newTests.push({ startAbcCode: 'X:1', fullAbcCode: 'X:1' });
    changeContent({ tests: newTests });
  };

  const handleUpCircleButtonClick = index => {
    const newTests = swapItemsAt(tests, index, index - 1);
    changeContent({ tests: newTests });
  };

  const handleDownCircleButtonClick = index => {
    const newTests = swapItemsAt(tests, index, index + 1);
    changeContent({ tests: newTests });
  };

  const handleTestsOrderChanged = event => {
    changeContent({ testsOrder: event.target.value });
  };

  const renderExpandedRow = (record, index) => (
    <EarTrainingSoundEditor
      sound={record.sound || { ...defaultSound }}
      onSoundChanged={newValue => handleSoundChanged(index, newValue)}
      />
  );

  const renderColumns = () => [
    {
      width: 80,
      key: 'upDown',
      render: (upDown, item, index) => (
        <ButtonGroup>
          <Button
            disabled={index === 0}
            icon={<MoveUpIcon />}
            onClick={() => handleUpCircleButtonClick(index)}
            />
          <Button
            disabled={index === tests.length - 1}
            icon={<MoveDownIcon />}
            onClick={() => handleDownCircleButtonClick(index)}
            />
        </ButtonGroup>
      )
    }, {
      title: () => t('startAbcCode'),
      key: 'startAbcCode',
      render: (val, item, index) => (
        <TextArea
          value={item.startAbcCode}
          onChange={event => handleStartAbcCodeChanged(index, event.target.value)}
          rows={6}
          />
      )
    }, {
      title: () => t('fullAbcCode'),
      key: 'fullAbcCode',
      render: (val, item, index) => (
        <TextArea
          value={item.fullAbcCode}
          onChange={event => handleFullAbcCodeChanged(index, event.target.value)}
          rows={6}
          />
      )
    }, {
      title: (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddButtonClick}
          />
      ),
      width: 48,
      key: 'button',
      render: (value, item, index) => (
        <DeleteButton onClick={() => handleDeleteButtonClick(index)} disabled={tests.length < 2} />
      )
    }
  ];

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
          <RadioGroup value={content.testsOrder} onChange={handleTestsOrderChanged}>
            <RadioButton value={TESTS_ORDER.given}>{t('testsOrderGiven')}</RadioButton>
            <RadioButton value={TESTS_ORDER.random}>{t('testsOrderRandom')}</RadioButton>
          </RadioGroup>
        </FormItem>
      </Form>
      <Table
        dataSource={dataSource}
        columns={renderColumns()}
        expandable={{
          expandIconColumnIndex: -1,
          expandedRowClassName: () => 'EarTraining-expandedEditorRow',
          expandedRowRender: renderExpandedRow,
          expandedRowKeys
        }}
        pagination={false}
        size="small"
        />
    </div>
  );
}

EarTrainingEditor.propTypes = {
  ...sectionEditorProps
};

export default EarTrainingEditor;
