import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { validateUrl } from '../../ui/validation.js';
import { LINK_SOURCE_TYPE } from './constants.js';
import React, { Fragment, useState } from 'react';
import { Button, Form, Input, Radio } from 'antd';
import UrlInput from '../../components/url-input.js';
import ClientConfig from '../../bootstrap/client-config.js';
import { ensureIsExcluded } from '../../utils/array-utils.js';
import MarkdownInput from '../../components/markdown-input.js';
import { useService } from '../../components/container-context.js';
import { isInternalSourceType } from '../../utils/source-utils.js';
import DocumentSelector from '../../components/document-selector.js';
import { FORM_ITEM_LAYOUT, SOURCE_TYPE } from '../../domain/constants.js';

const RadioButton = Radio.Button;
const RadioGroup = Radio.Group;
const FormItem = Form.Item;

function CatalogItemEditor({ item, enableImageEditing, onChange }) {
  const { t } = useTranslation('catalog');
  const clientConfig = useService(ClientConfig);
  const [currentDocumentTitle, setCurrentDocumentTitle] = useState('');

  const { title, link, image } = item;

  const triggerChange = newItemContentValues => {
    onChange({ ...item, ...newItemContentValues });
  };

  const handleInternalImageUrlChange = value => {
    triggerChange({ image: { ...image, sourceUrl: value } });
  };

  const handleTitleChange = event => {
    triggerChange({ title: event.target.value });
  };

  const handleLinkSourceTypeChange = event => {
    triggerChange({ link: { sourceType: event.target.value, sourceUrl: '', documentId: null } });
  };

  const handleExternalLinkUrlValueChange = event => {
    triggerChange({ link: { ...link, sourceUrl: event.target.value, documentId: null } });
  };

  const handleDocumentChange = value => {
    triggerChange({ link: { ...link, sourceUrl: '', documentId: value } });
  };

  const handleDocumentTitleChange = newDocumentTitle => {
    setCurrentDocumentTitle(newDocumentTitle);
  };

  const handleAdoptDocumentTitle = () => {
    triggerChange({ title: currentDocumentTitle });
  };

  const getImageValidationProps = url => isInternalSourceType({ url, cdnRootUrl: clientConfig.cdnRootUrl })
    ? {}
    : validateUrl(url, t, { allowEmpty: true });

  const allowedImageSourceTypes = ensureIsExcluded(Object.values(SOURCE_TYPE), SOURCE_TYPE.youtube);

  return (
    <Fragment>
      <FormItem label={t('common:title')} {...FORM_ITEM_LAYOUT}>
        <MarkdownInput inline value={title} onChange={handleTitleChange} />
      </FormItem>
      <FormItem label={t('linkSource')} {...FORM_ITEM_LAYOUT}>
        <RadioGroup value={link.sourceType} onChange={handleLinkSourceTypeChange}>
          <RadioButton value={LINK_SOURCE_TYPE.document}>{t('documentLink')}</RadioButton>
          <RadioButton value={LINK_SOURCE_TYPE.external}>{t('externalLink')}</RadioButton>
        </RadioGroup>
      </FormItem>
      {link.sourceType === LINK_SOURCE_TYPE.external && (
        <FormItem
          label={t('catalog:externalUrl')}
          {...FORM_ITEM_LAYOUT}
          {...validateUrl(link.sourceUrl, t, { allowHttp: true, allowMailto: true })}
          hasFeedback
          >
          <Input value={link.sourceUrl} onChange={handleExternalLinkUrlValueChange} />
        </FormItem>
      )}
      {link.sourceType === LINK_SOURCE_TYPE.document && (
        <FormItem label={t('common:document')} {...FORM_ITEM_LAYOUT}>
          <div className="u-input-and-button">
            <DocumentSelector
              documentId={link.documentId}
              onChange={handleDocumentChange}
              onTitleChange={handleDocumentTitleChange}
              />
            <Button
              type="primary"
              disabled={!currentDocumentTitle || currentDocumentTitle === title}
              onClick={handleAdoptDocumentTitle}
              >
              {t('adoptDocumentTitle')}
            </Button>
          </div>
        </FormItem>
      )}
      {!!enableImageEditing && (
        <FormItem {...FORM_ITEM_LAYOUT} {...getImageValidationProps(image.sourceUrl)} label={t('common:imageSource')}>
          <UrlInput value={image.sourceUrl} onChange={handleInternalImageUrlChange} allowedSourceTypes={allowedImageSourceTypes} />
        </FormItem>
      )}
    </Fragment>
  );
}

CatalogItemEditor.propTypes = {
  enableImageEditing: PropTypes.bool.isRequired,
  item: PropTypes.shape({
    title: PropTypes.string,
    link: PropTypes.shape({
      sourceType: PropTypes.string.isRequired,
      sourceUrl: PropTypes.string,
      documentId: PropTypes.string
    }).isRequired,
    image: PropTypes.shape({
      sourceUrl: PropTypes.string
    }).isRequired
  }).isRequired,
  onChange: PropTypes.func.isRequired
};

export default CatalogItemEditor;
