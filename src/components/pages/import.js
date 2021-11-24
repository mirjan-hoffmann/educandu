import by from 'thenby';
import Page from '../page.js';
import PropTypes from 'prop-types';
import urls from '../../utils/urls.js';
import React, { useState } from 'react';
import Logger from '../../common/logger.js';
import { useTranslation } from 'react-i18next';
import { Tooltip, Button, Table, Select } from 'antd';
import { handleApiError } from '../../ui/error-helper.js';
import ClientConfig from '../../bootstrap/client-config.js';
import { inject, useService } from '../container-context.js';
import { DOCUMENT_IMPORT_TYPE } from '../../common/constants.js';
import ImportApiClient from '../../services/import-api-client.js';
import { clientConfigProps } from '../../ui/default-prop-types.js';
import { useDateFormat, useLanguage } from '../language-context.js';
import LanguageNameProvider from '../../data/language-name-provider.js';
import CountryFlagAndName from '../localization/country-flag-and-name.js';
import { CloudDownloadOutlined, CloudSyncOutlined } from '@ant-design/icons';

const logger = new Logger(import.meta.url);

function Import({ clientConfig, importApiClient }) {
  const { t } = useTranslation('import');

  const { language } = useLanguage();
  const { formatDate } = useDateFormat();
  const languageNameProvider = useService(LanguageNameProvider);

  const sourceMenuItems = clientConfig.importSources;
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedDocumentKeys, setSelectedDocumentKeys] = useState([]);
  const [importableDocuments, setImportableDocuments] = useState([]);
  const [isFetchingImportableDocuments, setIsFetchingImportableDocuments] = useState(false);

  const handleImportClick = () => {
    const tasks = selectedDocumentKeys
      .map(key => importableDocuments.find(doc => doc.key === key))
      .map(doc => ({
        key: doc.key,
        importedRevision: doc.importedRevision,
        importableRevision: doc.importableRevision
      }));
    logger.info(`Dummy import sets tasks: ${JSON.stringify(tasks)}`);
  };

  const handleSourceMenuChange = async value => {
    setIsFetchingImportableDocuments(true);
    const newSelectedSource = sourceMenuItems.find(source => source.name === value);
    setSelectedSource(newSelectedSource);
    setImportableDocuments([]);
    setSelectedDocumentKeys([]);

    try {
      const { documents } = await importApiClient.getImports(newSelectedSource.name);
      setImportableDocuments(documents);
    } catch (error) {
      handleApiError({ error, t });
    }
    setIsFetchingImportableDocuments(false);
  };

  const renderImportType = doc => {
    let icon = null;
    if (doc.importType === DOCUMENT_IMPORT_TYPE.add) {
      icon = <CloudDownloadOutlined />;
    }
    if (doc.importType === DOCUMENT_IMPORT_TYPE.update) {
      icon = <CloudSyncOutlined />;
    }
    return <Tooltip title={t(doc.importType)} className="ImportPage-importType">{icon}</Tooltip>;
  };

  const renderTitle = doc => {
    if (!doc.slug) {
      return <span>{doc.title}</span>;
    }

    const url = `${selectedSource.baseUrl}${urls.getArticleUrl(doc.slug)}`;
    return <a href={url} target="_blank" rel="noopener noreferrer" >{doc.title}</a>;
  };

  const renderLanguage = doc => {
    const languagesData = languageNameProvider.getData(language);
    const documentLanguageData = languagesData[doc.language];
    return <CountryFlagAndName code={documentLanguageData.flag} name={documentLanguageData.name} flagOnly />;
  };

  const renderUpdateDate = doc => {
    return <span>{formatDate(doc.updatedOn)}</span>;
  };

  const columns = [
    { title: t('importType'), key: 'importType', width: '150px', sorter: by(x => x.importType), render: renderImportType },
    { title: t('title'), key: 'title', sorter: by(x => x.title), render: renderTitle },
    { title: t('language'), key: 'language', width: '150px', sorter: by(x => x.language), render: renderLanguage },
    { title: t('updateDate'), key: 'updateDate', width: '200px', sorter: by(x => x.updatedOn), render: renderUpdateDate }
  ];

  const tableRowSelection = {
    onChange: selectedRowKeys => {
      setSelectedDocumentKeys(selectedRowKeys);
    }
  };

  const importSourceOptions = sourceMenuItems.map(item => ({ label: item.name, value: item.name }));

  return (
    <Page>
      <div className="ImportPage">
        <h1>{t('pageNames:import')}</h1>

        <Select
          placeholder={t('source')}
          className="ImportPage-source"
          onChange={handleSourceMenuChange}
          defaultValue={null}
          disabled={isFetchingImportableDocuments}
          options={importSourceOptions}
          />
        <br /> <br />

        <Table
          bordered
          size="small"
          rowSelection={{
            type: 'checkbox',
            ...tableRowSelection
          }}
          columns={columns}
          pagination={false}
          dataSource={importableDocuments}
          loading={isFetchingImportableDocuments}
          no-data={importableDocuments.length === 0}
          />
        <br />
        <Button type="primary" disabled={!selectedDocumentKeys.length} onClick={handleImportClick}>
          {t('importButton')}
        </Button>
      </div>
    </Page>
  );
}

Import.propTypes = {
  ...clientConfigProps,
  importApiClient: PropTypes.instanceOf(ImportApiClient).isRequired
};

export default inject({
  clientConfig: ClientConfig,
  importApiClient: ImportApiClient
}, Import);