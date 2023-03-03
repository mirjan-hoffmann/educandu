import by from 'thenby';
import { Table, Tooltip } from 'antd';
import PropTypes from 'prop-types';
import routes from '../../utils/routes.js';
import FilterInput from '../filter-input.js';
import { useTranslation } from 'react-i18next';
import EditIcon from '../icons/general/edit-icon.js';
import SortingSelector from '../sorting-selector.js';
import DocumentInfoCell from '../document-info-cell.js';
import { replaceItem } from '../../utils/array-utils.js';
import LanguageIcon from '../localization/language-icon.js';
import React, { useEffect, useMemo, useState } from 'react';
import DuplicateIcon from '../icons/general/duplicate-icon.js';
import { DOC_VIEW_QUERY_PARAM } from '../../domain/constants.js';
import DocumentMetadataModal from '../document-metadata-modal.js';
import { documentExtendedMetadataShape } from '../../ui/default-prop-types.js';
import { DOCUMENT_METADATA_MODAL_MODE } from '../document-metadata-modal-utils.js';
import ActionButton, { ActionButtonGroup, ACTION_BUTTON_INTENT } from '../action-button.js';
import { InboxOutlined, LikeOutlined, SafetyCertificateOutlined, TeamOutlined } from '@ant-design/icons';

function getDocumentMetadataModalState({ t, mode = DOCUMENT_METADATA_MODAL_MODE.create, document = null, isOpen = false }) {
  let initialDocumentMetadata;
  switch (mode) {
    case DOCUMENT_METADATA_MODAL_MODE.create:
      initialDocumentMetadata = {};
      break;
    case DOCUMENT_METADATA_MODAL_MODE.update:
      initialDocumentMetadata = { ...document };
      break;
    case DOCUMENT_METADATA_MODAL_MODE.clone:
      initialDocumentMetadata = {
        ...document,
        title: `${document.title} ${t('common:copyTitleSuffix')}`,
        slug: document.slug ? `${document.slug}-${t('common:copySlugSuffix')}` : ''
      };
      break;
    default:
      throw new Error(`Invalid document metadata modal mode: '${mode}'`);
  }
  return {
    mode,
    allowMultiple: false,
    isOpen,
    documentToClone: document,
    initialDocumentMetadata
  };
}

function createTableRows(docs) {
  return docs.map(doc => ({
    key: doc._id,
    _id: doc._id,
    documentId: doc._id,
    title: doc.title,
    createdOn: doc.createdOn,
    updatedOn: doc.updatedOn,
    createdBy: doc.createdBy,
    language: doc.language,
    user: doc.user,
    accreditedEditors: doc.publicContext.accreditedEditors,
    protected: doc.publicContext.protected,
    archived: doc.publicContext.archived,
    verified: doc.publicContext.verified
  }));
}

function RedactionDocumentsTab({ documents, onDocumentsChange }) {
  const [filterText, setFilterText] = useState('');
  const [allTableRows, setAllTableRows] = useState([]);
  const { t } = useTranslation('redactionDocumentsTab');
  const [displayedTableRows, setDisplayedTableRows] = useState([]);
  const [currentTableSorting, setCurrentTableSorting] = useState({ value: 'updatedOn', direction: 'desc' });
  const [documentMetadataModalState, setDocumentMetadataModalState] = useState(getDocumentMetadataModalState({ t }));

  useEffect(() => {
    setAllTableRows(createTableRows(documents));
  }, [documents]);

  const documentsSortingOptions = useMemo(() => [
    { label: t('common:title'), appliedLabel: t('common:sortedByTitle'), value: 'title' },
    { label: t('common:createdOn'), appliedLabel: t('common:sortedByCreatedOn'), value: 'createdOn' },
    { label: t('common:updatedOn'), appliedLabel: t('common:sortedByUpdatedOn'), value: 'updatedOn' },
    { label: t('common:language'), appliedLabel: t('common:sortedByLanguage'), value: 'language' },
    { label: t('common:user'), appliedLabel: t('common:sortedByUser'), value: 'user' },
    { label: t('common:archived'), appliedLabel: t('common:sortedByArchived'), value: 'archived' },
    { label: t('common:protected'), appliedLabel: t('common:sortedByProtected'), value: 'protected' },
    { label: t('common:verified'), appliedLabel: t('common:sortedByVerified'), value: 'verified' }
  ], [t]);

  const tableSorters = useMemo(() => ({
    title: (rowsToSort, direction) => [...rowsToSort].sort(by(row => row.title, { direction, ignoreCase: true })),
    createdOn: (rowsToSort, direction) => [...rowsToSort].sort(by(row => row.createdOn, direction)),
    updatedOn: (rowsToSort, direction) => [...rowsToSort].sort(by(row => row.updatedOn, direction)),
    language: (rowsToSort, direction) => [...rowsToSort].sort(by(row => row.language, direction)),
    user: (rowsToSort, direction) => [...rowsToSort].sort(by(row => row.createdBy.displayName, { direction, ignoreCase: true })),
    archived: (rowsToSort, direction) => [...rowsToSort].sort(by(row => row.archived, direction)),
    protected: (rowsToSort, direction) => [...rowsToSort].sort(by(row => row.protected, direction)),
    verified: (rowsToSort, direction) => [...rowsToSort].sort(by(row => row.verified, direction))
  }), []);

  useEffect(() => {
    const filter = filterText.toLowerCase();
    const filteredRows = filterText
      ? allTableRows.filter(row => row.title.toLowerCase().includes(filter) || row.createdBy.displayName.toLowerCase().includes(filter))
      : allTableRows;

    const sorter = tableSorters[currentTableSorting.value];
    const sortedRows = sorter ? sorter(filteredRows, currentTableSorting.direction) : filteredRows;

    setDisplayedTableRows(sortedRows);
  }, [allTableRows, filterText, currentTableSorting, tableSorters]);

  const handleCurrentTableSortingChange = ({ value, direction }) => {
    setCurrentTableSorting({ value, direction });
  };

  const handleFilterTextChange = event => {
    const newFilterText = event.target.value;
    setFilterText(newFilterText);
  };

  const handleDocumentEditClick = row => {
    const document = documents.find(d => d._id === row.documentId);
    setDocumentMetadataModalState(getDocumentMetadataModalState({
      t,
      mode: DOCUMENT_METADATA_MODAL_MODE.update,
      document,
      isOpen: true
    }));
  };

  const handleDocumentCloneClick = row => {
    const document = documents.find(d => d._id === row.documentId);
    setDocumentMetadataModalState(getDocumentMetadataModalState({
      t,
      mode: DOCUMENT_METADATA_MODAL_MODE.clone,
      document,
      isOpen: true
    }));
  };

  const handleDocumentMetadataModalSave = (savedDocuments, templateDocumentId) => {
    setDocumentMetadataModalState(prev => ({ ...prev, isOpen: false }));

    if (documentMetadataModalState.mode === DOCUMENT_METADATA_MODAL_MODE.clone) {
      window.location = routes.getDocUrl({
        id: savedDocuments[0]._id,
        slug: savedDocuments[0].slug,
        view: DOC_VIEW_QUERY_PARAM.edit,
        templateDocumentId
      });
    } else if (documentMetadataModalState.mode === DOCUMENT_METADATA_MODAL_MODE.update) {
      onDocumentsChange(savedDocuments.reduce((all, doc) => replaceItem(all, doc), documents));
    }
  };

  const handleDocumentMetadataModalClose = () => {
    setDocumentMetadataModalState(prev => ({ ...prev, isOpen: false }));
  };

  const renderDocumentLanguage = documentLanguage => {
    return <LanguageIcon language={documentLanguage} />;
  };

  const renderDocumentTitle = (_title, row) => {
    const doc = documents.find(d => d._id === row.documentId);
    if (!doc) {
      return null;
    }

    return <DocumentInfoCell doc={doc} />;
  };

  const renderDocumentCreatedBy = (_user, row) => {
    return <a href={routes.getUserProfileUrl(row.createdBy._id)}>{row.createdBy.displayName}</a>;
  };

  const renderDocumentActions = (_actions, row) => {
    return (
      <div>
        <ActionButtonGroup>
          <ActionButton
            title={t('common:edit')}
            icon={<EditIcon />}
            intent={ACTION_BUTTON_INTENT.default}
            onClick={() => handleDocumentEditClick(row)}
            />
          <ActionButton
            title={t('common:duplicate')}
            icon={<DuplicateIcon />}
            intent={ACTION_BUTTON_INTENT.default}
            onClick={() => handleDocumentCloneClick(row)}
            />
        </ActionButtonGroup>
      </div>
    );
  };

  const renderDocumentBadges = (_, row) => {
    return (
      <div className="RedactionDocumentsTab-badges">
        {!!row.archived && (
          <Tooltip title={t('archivedDocumentBadge')}>
            <InboxOutlined className="u-large-badge" />
          </Tooltip>
        )}
        {!!row.verified && (
          <Tooltip title={t('common:verifiedDocumentBadge')}>
            <LikeOutlined className="u-large-badge" />
          </Tooltip>
        )}
        {!!row.protected && (
          <Tooltip title={t('protectedDocumentBadge')}>
            <SafetyCertificateOutlined className="u-large-badge" />
          </Tooltip>
        )}
        {!!row.accreditedEditors.length && (
          <Tooltip title={t('accreditedEditorsBadge')}>
            <TeamOutlined className="u-large-badge" />
          </Tooltip>
        )}
      </div>
    );
  };

  const documentsTableColumns = [
    {
      title: t('common:title'),
      dataIndex: 'title',
      key: 'title',
      render: renderDocumentTitle
    },
    {
      title: t('common:language'),
      dataIndex: 'language',
      key: 'language',
      render: renderDocumentLanguage,
      responsive: ['sm'],
      width: '100px'
    },
    {
      title: t('initialAuthor'),
      dataIndex: 'user',
      key: 'user',
      render: renderDocumentCreatedBy,
      responsive: ['md'],
      width: '200px'
    },
    {
      title: t('badges'),
      dataIndex: 'badges',
      key: 'badges',
      render: renderDocumentBadges,
      responsive: ['lg'],
      width: '140px'
    },
    {
      title: t('common:actions'),
      dataIndex: 'actions',
      key: 'actions',
      render: renderDocumentActions,
      width: '100px'
    }
  ];

  return (
    <div className="RedactionDocumentsTab">
      <div className="RedactionDocumentsTab-controls">
        <FilterInput
          size="large"
          className="RedactionDocumentsTab-filter"
          value={filterText}
          onChange={handleFilterTextChange}
          placeholder={t('filterPlaceholder')}
          />
        <SortingSelector
          size="large"
          sorting={currentTableSorting}
          options={documentsSortingOptions}
          onChange={handleCurrentTableSortingChange}
          />
      </div>
      <Table
        dataSource={[...displayedTableRows]}
        columns={documentsTableColumns}
        />
      <DocumentMetadataModal
        {...documentMetadataModalState}
        onSave={handleDocumentMetadataModalSave}
        onClose={handleDocumentMetadataModalClose}
        />
    </div>
  );
}

RedactionDocumentsTab.propTypes = {
  documents: PropTypes.arrayOf(documentExtendedMetadataShape).isRequired,
  onDocumentsChange: PropTypes.func.isRequired
};

export default RedactionDocumentsTab;
