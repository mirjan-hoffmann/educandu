import PropTypes from 'prop-types';
import React, { memo } from 'react';
import { useLanguage } from '../language-context.js';
import LanguageFlagAndName from '../language-flag-and-name.js';
import SettingsDocumentsTable from './settings-documents-table.js';
import { documentMetadataShape, documentRevisionShape, documentShape, settingsDocumentShape } from '../../ui/default-prop-types.js';

const hasValue = value => value && String(value).trim();

const isValidFooterLinkItem = item => [item.linkTitle, item.documentKey, item.documentSlug].every(hasValue);

function FooterLinksSettings({ footerLinks, documents, onChange }) {
  const { supportedLanguages } = useLanguage();

  const handleChange = (lang, items) => {
    const updatedFooterLinks = supportedLanguages.reduce((map, sl) => {
      map[sl] = sl !== lang ? footerLinks?.[sl] || [] : items;
      return map;
    }, {});
    const isInvalid = Object.values(updatedFooterLinks).some(fl => {
      return fl.some(item => !isValidFooterLinkItem(item));
    });
    onChange(updatedFooterLinks, { isValid: !isInvalid });
  };

  return (
    <div>
      {supportedLanguages.map((lang, idx) => (
        <React.Fragment key={lang}>
          {idx !== 0 && <br />}
          <h3>
            <LanguageFlagAndName
              language={lang}
              />
          </h3>
          <SettingsDocumentsTable
            documents={documents}
            settingsDocuments={footerLinks?.[lang] || []}
            onChange={items => handleChange(lang, items)}
            />
        </React.Fragment>
      ))}
    </div>
  );
}

FooterLinksSettings.propTypes = {
  documents: PropTypes.arrayOf(PropTypes.oneOfType([
    documentMetadataShape,
    documentRevisionShape,
    documentShape
  ])).isRequired,
  footerLinks: PropTypes.objectOf(PropTypes.arrayOf(settingsDocumentShape)),
  onChange: PropTypes.func.isRequired
};

FooterLinksSettings.defaultProps = {
  footerLinks: {}
};

export default memo(FooterLinksSettings);
