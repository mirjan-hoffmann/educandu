import PropTypes from 'prop-types';
import { Button, Card } from 'antd';
import Logger from '../../common/logger.js';
import { useTranslation } from 'react-i18next';
import cloneDeep from '../../utils/clone-deep.js';
import LicenseSettings from './license-settings.js';
import React, { useState, useCallback } from 'react';
import MarkdownTextarea from '../markdown-textarea.js';
import DocumentSelector from '../document-selector.js';
import { handleApiError } from '../../ui/error-helper.js';
import DefaultTagsSettings from './default-tags-settings.js';
import SpecialPageSettings from './special-page-settings.js';
import FooterLinksSettings from './footer-links-settings.js';
import { useSessionAwareApiClient } from '../../ui/api-helper.js';
import SettingsApiClient from '../../api-clients/settings-api-client.js';
import DocumentApiClient from '../../api-clients/document-api-client.js';
import { ensureIsExcluded, ensureIsIncluded } from '../../utils/array-utils.js';
import { documentMetadataShape, settingsShape } from '../../ui/default-prop-types.js';

const logger = new Logger(import.meta.url);

function SettingsTab({ initialSettings, documents, onDirtyStateChange, onSettingsSaved }) {
  const { t } = useTranslation('settingsTab');
  const settingsApiClient = useSessionAwareApiClient(SettingsApiClient);
  const documentApiClient = useSessionAwareApiClient(DocumentApiClient);
  const [settings, setSettings] = useState(cloneDeep(initialSettings));
  const [dirtyKeys, setDirtyKeys] = useState([]);
  const [invalidKeys, setInvalidKeys] = useState([]);
  const [lastSavedSettings, setLastSavedSettings] = useState(settings);

  const handleChange = useCallback((key, value, isValid) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setDirtyKeys(prev => ensureIsIncluded(prev, key));
    setInvalidKeys(prev => isValid ? ensureIsExcluded(prev, key) : ensureIsIncluded(prev, key));
    onDirtyStateChange(true);
  }, [setSettings, setDirtyKeys, setInvalidKeys, onDirtyStateChange]);

  const handleHomepageInfoChange = useCallback(event => {
    handleChange('homepageInfo', event.target.value, true);
  }, [handleChange]);

  const handleTemplateDocumentChange = useCallback(value => {
    const urlPathSegments = value.split('/');
    const documentKey = urlPathSegments[0] || '';
    const documentSlug = urlPathSegments.slice(1).join('/') || '';
    handleChange('templateDocument', { documentKey, documentSlug }, true);
  }, [handleChange]);

  const handleHelpPageChange = useCallback((value, { isValid }) => {
    handleChange('helpPage', value, isValid);
  }, [handleChange]);

  const handleTermsPageChange = useCallback((value, { isValid }) => {
    handleChange('termsPage', value, isValid);
  }, [handleChange]);

  const handleFooterLinksChange = useCallback((value, { isValid }) => {
    handleChange('footerLinks', value, isValid);
  }, [handleChange]);

  const handleDefaultTagsChange = useCallback((value, { isValid }) => {
    handleChange('defaultTags', value, isValid);
  }, [handleChange]);

  const handleLicenseChange = useCallback((value, { isValid }) => {
    handleChange('license', value, isValid);
  }, [handleChange]);

  const handleSaveButtonClick = async () => {
    const changedSettings = dirtyKeys.reduce((map, key) => ({ ...map, [key]: settings[key] }), {});
    try {
      await settingsApiClient.saveSettings({ settings: changedSettings });
      const updatedSettings = { ...lastSavedSettings, ...changedSettings };
      setLastSavedSettings(updatedSettings);
      setDirtyKeys([]);
      onSettingsSaved(updatedSettings);
      onDirtyStateChange(false);
    } catch (error) {
      handleApiError({ error, logger, t });
    }
  };

  const handleCreateDocumentRegenerationBatchClick = async () => {
    try {
      await documentApiClient.postDocumentRegenerationBatch();
    } catch (error) {
      handleApiError({ t, logger, error });
    }
  };

  const templateDocumentURL = settings.templateDocument
    ? `${settings.templateDocument.documentKey}/${settings.templateDocument.documentSlug}`
    : '';

  return (
    <div className="SettingsTab">
      <Card className="Card" title={t('homepageInfoHeader')}>
        <MarkdownTextarea
          value={settings.homepageInfo || ''}
          onChange={handleHomepageInfoChange}
          />
      </Card>
      <Card className="Card" title={t('templateDocumentHeader')}>
        <DocumentSelector
          documents={documents}
          value={templateDocumentURL}
          onChange={handleTemplateDocumentChange}
          />
      </Card>
      <Card className="Card" title={t('helpPageHeader')}>
        <SpecialPageSettings
          settings={settings.helpPage}
          documents={documents}
          onChange={handleHelpPageChange}
          />
      </Card>
      <Card className="Card" title={t('termsPageHeader')}>
        <SpecialPageSettings
          settings={settings.termsPage}
          documents={documents}
          onChange={handleTermsPageChange}
          />
      </Card>
      <Card className="Card" title={t('footerLinksHeader')}>
        <FooterLinksSettings
          footerLinks={settings.footerLinks}
          documents={documents}
          onChange={handleFooterLinksChange}
          />
      </Card>
      <Card className="Card" title={t('defaultTagsHeader')}>
        <DefaultTagsSettings
          defaultTags={settings.defaultTags || []}
          onChange={handleDefaultTagsChange}
          />
      </Card>
      <Card className="Card" title={t('licenseHeader')}>
        <LicenseSettings
          license={settings.license}
          onChange={handleLicenseChange}
          />
      </Card>
      <Card className="Card Card--danger" title={t('createDocumentRegenerationBatchHeader')}>
        <Button
          onClick={handleCreateDocumentRegenerationBatchClick}
          danger
          >
          {t('createDocumentRegenerationBatchButton')}
        </Button>
      </Card>
      <Button
        type="primary"
        onClick={handleSaveButtonClick}
        className="SettingsTab-saveButton"
        disabled={!!invalidKeys.length || !dirtyKeys.length}
        >
        {t('common:save')}
      </Button>
    </div>
  );
}

SettingsTab.propTypes = {
  documents: PropTypes.arrayOf(documentMetadataShape).isRequired,
  initialSettings: settingsShape.isRequired,
  onDirtyStateChange: PropTypes.func.isRequired,
  onSettingsSaved: PropTypes.func.isRequired
};

export default SettingsTab;