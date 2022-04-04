import PropTypes from 'prop-types';
import React, { memo } from 'react';
import DeleteButton from '../delete-button.js';
import { useTranslation } from 'react-i18next';
import { PlusOutlined } from '@ant-design/icons';
import { Form, Table, Button, Input } from 'antd';
import DocumentSelector from '../document-selector.js';
import MoveUpIcon from '../icons/general/move-up-icon.js';
import MoveDownIcon from '../icons/general/move-down-icon.js';
import { swapItemsAt, removeItemAt } from '../../utils/array-utils.js';
import { documentMetadataShape, documentShape, settingsDocumentShape } from '../../ui/default-prop-types.js';

const FormItem = Form.Item;

const hasValue = value => value && String(value).trim();

const getRequiredValidateStatus = value => hasValue(value) ? 'success' : 'error';

const isValidLinkListItem = item => [item.linkTitle, item.urlPath].every(hasValue);

const newLinkListItem = { linkTitle: '', urlPath: '' };

const settingsDocumentsToLinkList = settingsDocuments => {
  return settingsDocuments.map((sd, idx) => ({
    key: idx.toString(),
    linkTitle: sd?.linkTitle || '',
    urlPath: [sd?.documentKey || '', sd?.documentSlug || ''].filter(x => x).join('/') || ''
  }));
};

const linkListToSettingsDocuments = linkList => {
  return linkList.map(item => {
    const urlPathSegments = item.urlPath.split('/');
    return {
      linkTitle: item.linkTitle,
      documentKey: urlPathSegments[0] || '',
      documentSlug: urlPathSegments.slice(1).join('/') || ''
    };
  });
};

function SettingsDocumentsTable({ settingsDocuments, documents, onChange }) {
  const { t } = useTranslation('settingsDocumentsTable');

  const fireOnChange = updatedLinkList => {
    onChange(linkListToSettingsDocuments(updatedLinkList), { isValid: updatedLinkList.every(isValidLinkListItem) });
  };

  const handleMoveClick = (index, offset) => {
    const linkList = settingsDocumentsToLinkList(settingsDocuments);
    fireOnChange(swapItemsAt(linkList, index, index + offset));
  };

  const handleAddClick = () => {
    const linkList = settingsDocumentsToLinkList(settingsDocuments);
    fireOnChange([...linkList, { ...newLinkListItem }]);
  };

  const handleDeleteClick = index => {
    const linkList = settingsDocumentsToLinkList(settingsDocuments);
    fireOnChange(removeItemAt(linkList, index));
  };

  const handleChange = (index, key, value) => {
    const linkList = settingsDocumentsToLinkList(settingsDocuments);
    const updatedLinkList = linkList.map((item, idx) => idx !== index ? item : { ...item, [key]: value });
    fireOnChange(updatedLinkList);
  };

  const renderRank = (text, record, index) => (
    <span style={{ whiteSpace: 'nowrap' }}>
      <Button size="small" icon={<MoveUpIcon />} disabled={index === 0} onClick={() => handleMoveClick(index, -1)} />
      <Button size="small" icon={<MoveDownIcon />} disabled={index === settingsDocuments.length - 1} onClick={() => handleMoveClick(index, +1)} />
    </span>
  );

  const renderLinkTitle = (text, record, index) => (
    <FormItem validateStatus={getRequiredValidateStatus(record.linkTitle)} style={{ marginBottom: 0 }}>
      <Input value={record.linkTitle} onChange={event => handleChange(index, 'linkTitle', event.target.value)} />
    </FormItem>
  );

  const renderUrlPath = (text, record, index) => (
    <FormItem validateStatus={getRequiredValidateStatus(record.urlPath)} style={{ marginBottom: 0 }}>
      <DocumentSelector
        documents={documents}
        value={record.urlPath}
        onChange={value => handleChange(index, 'urlPath', value)}
        />
    </FormItem>
  );

  const renderActions = (text, record, index) => (
    <DeleteButton onClick={() => handleDeleteClick(index)} />
  );

  const renderActionsTitle = () => (
    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => handleAddClick()} />
  );

  const columns = [
    { title: t('rank'), key: 'rank', width: '64px', render: renderRank },
    { title: t('linkTitle'), key: 'linkTitle', dataIndex: 'linkTitle', render: renderLinkTitle },
    { title: t('urlPath'), key: 'urlPath', dataIndex: 'urlPath', ellipsis: true, render: renderUrlPath },
    { title: renderActionsTitle, key: 'actions', width: '40px', render: renderActions }
  ];

  const data = settingsDocumentsToLinkList(settingsDocuments);

  return (
    <Form>
      <Table
        size="small"
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
        />
    </Form>
  );
}

SettingsDocumentsTable.propTypes = {
  documents: PropTypes.arrayOf(PropTypes.oneOfType([
    documentMetadataShape,
    documentShape
  ])).isRequired,
  onChange: PropTypes.func.isRequired,
  settingsDocuments: PropTypes.arrayOf(settingsDocumentShape).isRequired
};

export default memo(SettingsDocumentsTable);