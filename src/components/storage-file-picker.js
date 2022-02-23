import PropTypes from 'prop-types';
import { Modal, Button } from 'antd';
import React, { useState } from 'react';
import selection from '../ui/selection.js';
import { useTranslation } from 'react-i18next';
import StorageBrowser from './storage-browser.js';
import { filePickerStorageShape } from '../ui/default-prop-types.js';

function StorageFilePicker({ publicStorage, privateStorage, onFileNameChanged }) {
  const { t } = useTranslation('storageFilePicker');

  const [state, setState] = useState({
    isModalVisible: false,
    currentSelectedFile: null
  });

  const applySelection = currentSelectedFile => {
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

  const { isModalVisible, currentSelectedFile } = state;

  const handleModalOverlayClick = event => event.stopPropagation();

  return (
    <div className="StorageFilePicker">
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
        bodyStyle={{ maxHeight: 'calc(90vh - 110px)', overflowY: 'auto' }}
        footer={[
          <Button key="back" onClick={handleCancel}>
            {t('common:cancel')}
          </Button>,
          <Button key="submit" type="primary" onClick={handleApply} disabled={!currentSelectedFile}>
            {t('common:apply')}
          </Button>
        ]}
        centered
        >
        <div className="StorageFilePicker-eventCapturingModalOverlay" onClick={handleModalOverlayClick} />
        <StorageBrowser
          publicStorage={publicStorage}
          privateStorage={privateStorage}
          selectionMode={selection.SINGLE}
          onSelectionChanged={handleSelectionChanged}
          />
      </Modal>
    </div>
  );
}

StorageFilePicker.propTypes = {
  onFileNameChanged: PropTypes.func,
  privateStorage: filePickerStorageShape,
  publicStorage: filePickerStorageShape.isRequired
};

StorageFilePicker.defaultProps = {
  onFileNameChanged: () => {},
  privateStorage: null
};

export default StorageFilePicker;