import PropTypes from 'prop-types';
import React, { memo } from 'react';
import DeleteButton from '../delete-button.js';
import { useTranslation } from 'react-i18next';
import { PlusOutlined } from '@ant-design/icons';
import { Form, Table, Button, Input } from 'antd';
import MoveUpIcon from '../icons/general/move-up-icon.js';
import MoveDownIcon from '../icons/general/move-down-icon.js';
import inputValidators from '../../utils/input-validators.js';
import { swapItemsAt, removeItemAt, replaceItemAt } from '../../utils/array-utils.js';

const FormItem = Form.Item;

const getRequiredValidateStatus = (allTags, tag) => inputValidators.isValidTag({ allTags, tag }) ? 'success' : 'error';

const mapTableRowsToTags = rows => rows.map(row => row.tag);

const mapTagsToTableRows = tags => tags.map((tag, index) => ({ key: index, tag }));

function DefaultTagsSettings({ defaultTags, onChange }) {
  const { t } = useTranslation('defaultTagsSettings');

  const fireOnChange = rows => {
    const tags = mapTableRowsToTags(rows);
    onChange(tags, { isValid: tags.every(tag => inputValidators.isValidTag({ tag, allTags: tags })) });
  };

  const handleMoveClick = (index, offset) => {
    const rows = mapTagsToTableRows(defaultTags);
    fireOnChange(swapItemsAt(rows, index, index + offset));
  };

  const handleAddClick = () => {
    const rows = mapTagsToTableRows(defaultTags);
    fireOnChange([...rows, { tag: '' }]);
  };

  const handleDeleteClick = index => {
    const rows = mapTagsToTableRows(defaultTags);
    fireOnChange(removeItemAt(rows, index));
  };

  const handleChange = (index, value) => {
    const rows = mapTagsToTableRows(defaultTags);
    const updatedRow = { key: index, tag: value.trim() };
    fireOnChange(replaceItemAt(rows, updatedRow, index));
  };

  const renderRank = (text, record, index) => (
    <span style={{ whiteSpace: 'nowrap' }}>
      <Button size="small" icon={<MoveUpIcon />} disabled={index === 0} onClick={() => handleMoveClick(index, -1)} />
      <Button size="small" icon={<MoveDownIcon />} disabled={index === defaultTags.length - 1} onClick={() => handleMoveClick(index, +1)} />
    </span>
  );

  const renderTag = (text, record, index) => (
    <FormItem validateStatus={getRequiredValidateStatus(defaultTags, record.tag)} style={{ marginBottom: 0 }}>
      <Input value={record.tag} onChange={event => handleChange(index, event.target.value)} />
    </FormItem>
  );

  const renderActions = (text, record, index) => (
    <DeleteButton onClick={() => handleDeleteClick(index)} />
  );

  const renderActionsTitle = () => (
    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={handleAddClick} />
  );

  const columns = [
    { title: t('rank'), key: 'rank', width: '64px', render: renderRank },
    { title: t('tag'), key: 'tag', dataIndex: 'tag', render: renderTag },
    { title: renderActionsTitle, key: 'actions', width: '40px', render: renderActions }
  ];

  const rows = mapTagsToTableRows(defaultTags);

  return (
    <Form>
      <Table
        size="small"
        columns={columns}
        dataSource={rows}
        pagination={false}
        bordered
        />
    </Form>
  );
}

DefaultTagsSettings.propTypes = {
  defaultTags: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired
};

export default memo(DefaultTagsSettings);
