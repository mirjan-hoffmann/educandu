import PropTypes from 'prop-types';
import { Modal, Button } from 'antd';
import React, { useState } from 'react';
import selection from '../ui/selection.js';
import { useTranslation } from 'react-i18next';
import RepositoryBrowser from './repository-browser.js';

export default function CdnFilePicker(props) {
  const { t } = useTranslation('cdnFilePicker');

  const [state, setState] = useState({
    isModalVisible: false,
    currentSelectedFile: null
  });

  const applySelection = currentSelectedFile => {
    const { onFileNameChanged } = props;
    onFileNameChanged(currentSelectedFile);

    setState(prevState => ({ ...prevState, isModalVisible: false }));
  };

  const handleSelectButtonClick = () => {
    setState(prevState => ({ ...prevState, isModalVisible: true }));
  };

  const handleApply = () => {
    const { currentSelectedFile } = state;
    applySelection(currentSelectedFile);
  };

  const handleCancel = () => {
    setState(prevState => ({ ...prevState, isModalVisible: false }));
  };

  const handleSelectionChanged = (objects, shouldApplySelection) => {
    const newSelectedFile = objects.length ? objects[0].name : null;
    setState(prevState => ({ ...prevState, currentSelectedFile: newSelectedFile }));

    if (shouldApplySelection) {
      applySelection(newSelectedFile);
    }
  };

  const { rootPrefix, uploadPrefix, initialPrefix } = props;
  const { isModalVisible, currentSelectedFile } = state;

  return (
    <div className="CdnFilePicker">
      <Button
        type="primary"
        onClick={handleSelectButtonClick}
        >
        {t('common:select')}
      </Button>
      <Modal
        width="80%"
        visible={isModalVisible}
        title={t('modalTitle')}
        onOk={handleApply}
        onCancel={handleCancel}
        footer={[
          <Button
            key="back"
            onClick={handleCancel}
            >
            {t('common:cancel')}
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleApply}
            disabled={!currentSelectedFile}
            >
            {t('common:apply')}
          </Button>
        ]}
        >
        <RepositoryBrowser
          rootPrefix={rootPrefix}
          uploadPrefix={uploadPrefix}
          initialPrefix={initialPrefix}
          selectionMode={selection.SINGLE}
          onSelectionChanged={handleSelectionChanged}
          />
      </Modal>
    </div>
  );
}

CdnFilePicker.propTypes = {
  initialPrefix: PropTypes.string,
  onFileNameChanged: PropTypes.func,
  rootPrefix: PropTypes.string.isRequired,
  uploadPrefix: PropTypes.string
};

CdnFilePicker.defaultProps = {
  initialPrefix: null,
  onFileNameChanged: () => {},
  uploadPrefix: null
};
