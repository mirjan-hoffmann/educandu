import PropTypes from 'prop-types';
import classNames from 'classnames';
import UsedStorage from './used-storage.js';
import FilePreview from './file-preview.js';
import reactDropzoneNs from 'react-dropzone';
import cloneDeep from '../utils/clone-deep.js';
import { useService } from './container-context.js';
import { Trans, useTranslation } from 'react-i18next';
import UploadIcon from './icons/general/upload-icon.js';
import ClientConfig from '../bootstrap/client-config.js';
import FilesUploadOverview from './files-upload-overview.js';
import { useSetStorageLocation } from './storage-context.js';
import { useSessionAwareApiClient } from '../ui/api-helper.js';
import { getResourceFullName } from '../utils/resource-utils.js';
import { getCookie, setSessionCookie } from '../common/cookie.js';
import { storageLocationShape } from '../ui/default-prop-types.js';
import StorageApiClient from '../api-clients/storage-api-client.js';
import { Alert, Button, Input, message, Modal, Select } from 'antd';
import FilesViewer, { FILES_VIEWER_DISPLAY } from './files-viewer.js';
import { DoubleLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { confirmPublicUploadLiability } from './confirmation-dialogs.js';
import { CDN_OBJECT_TYPE, STORAGE_LOCATION_TYPE } from '../domain/constants.js';
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { canUploadToPath, getParentPathForStorageLocationPath, getStorageLocationPathForUrl } from '../utils/storage-utils.js';

const ReactDropzone = reactDropzoneNs.default || reactDropzoneNs;

const { Search } = Input;

const MIN_SEARCH_TERM_LENGTH = 3;

const SCREEN = {
  directory: 'directory',
  search: 'search',
  preview: 'preview',
  uploadOverview: 'upload-overview'
};

function StorageLocation({ storageLocation, initialUrl, onSelect, onCancel }) {
  const { t } = useTranslation('storageLocation');
  const setStorageLocation = useSetStorageLocation();
  const { uploadLiabilityCookieName } = useService(ClientConfig);
  const storageApiClient = useSessionAwareApiClient(StorageApiClient);

  const dropzoneRef = useRef();
  const isMounted = useRef(false);
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [searchResult, setSearchResult] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parentDirectory, setParentDirectory] = useState(null);
  const [currentDirectory, setCurrentDirectory] = useState(null);
  const [screenStack, setScreenStack] = useState([SCREEN.directory]);
  const [currentDirectoryPath, setCurrentDirectoryPath] = useState(null);
  const [showInitialFileSelection, setShowInitialFileSelection] = useState(true);
  const [canUploadToCurrentDirectory, setCanUploadToCurrentDirectory] = useState(false);
  const [filesViewerDisplay, setFilesViewerDisplay] = useState(FILES_VIEWER_DISPLAY.grid);

  const screen = screenStack[screenStack.length - 1];
  const pushScreen = newScreen => setScreenStack(oldVal => oldVal[oldVal.length - 1] !== newScreen ? [...oldVal, newScreen] : oldVal);
  const popScreen = () => setScreenStack(oldVal => oldVal.length > 1 ? oldVal.slice(0, -1) : oldVal);

  const canAcceptFiles = screen === SCREEN.directory && canUploadToCurrentDirectory && !isLoading;

  const fetchStorageContent = useCallback(async searchText => {
    if (!currentDirectoryPath || !isMounted.current) {
      return;
    }

    try {
      setIsLoading(true);
      const result = await storageApiClient.getCdnObjects({
        parentPath: searchText ? storageLocation.rootPath : currentDirectoryPath,
        searchTerm: searchText ?? null,
        recursive: !!searchText
      });

      if (!isMounted.current) {
        return;
      }

      if (searchText) {
        setSearchResult(result.objects);
      } else {
        setCanUploadToCurrentDirectory(canUploadToPath(result.currentDirectory.path));
        setParentDirectory(result.parentDirectory);
        setCurrentDirectory(result.currentDirectory);
        setFiles(result.objects);
      }

      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      if (err.status === 404 && !searchText) {
        setCurrentDirectoryPath(storageLocation.homePath);
      } else {
        message.error(err.message);
      }
    }
  }, [currentDirectoryPath, storageLocation.homePath, storageLocation.rootPath, storageApiClient, isMounted]);

  const handleFileClick = newFile => {
    setShowInitialFileSelection(false);
    if (newFile.type === CDN_OBJECT_TYPE.directory) {
      setCurrentDirectoryPath(newFile.path);
    } else {
      setSelectedFile(oldFile => oldFile?.url === newFile.url ? null : newFile);
    }
  };

  const handleFileDoubleClick = newFile => {
    if (newFile.type === CDN_OBJECT_TYPE.directory) {
      setCurrentDirectoryPath(newFile.path);
    } else {
      onSelect(newFile.portableUrl);
    }
  };

  const handleSelectClick = () => {
    onSelect(selectedFile.portableUrl);
  };

  const handleDeleteClick = async file => {
    const { usedBytes } = await storageApiClient.deleteCdnObject(file.path);
    await fetchStorageContent();
    setStorageLocation({ ...cloneDeep(storageLocation), usedBytes });
  };

  const handlePreviewClick = () => {
    pushScreen(SCREEN.preview);
  };

  const handleUploadButtonClick = () => {
    dropzoneRef.current.open();
  };

  const handleUploadStart = useCallback(() => {
    setIsUploading(true);
    pushScreen(SCREEN.uploadOverview);
  }, []);

  const handleUploadFinish = () => {
    setIsUploading(false);
  };

  const handlePreviewScreenBackClick = () => {
    popScreen();
  };

  const handleUploadOverviewScreenBackClick = async () => {
    popScreen();
    setUploadQueue([]);
    await fetchStorageContent();
  };

  const handleSearchTermChange = event => {
    setSearchTerm(event.target.value);
  };

  const handleSearchClick = async () => {
    if (searchTerm.length < MIN_SEARCH_TERM_LENGTH) {
      Modal.error({
        title: t('common:error'),
        content: t('common:searchTextTooShort', { minCharCount: MIN_SEARCH_TERM_LENGTH })
      });

      return;
    }

    pushScreen(SCREEN.search);
    await fetchStorageContent(searchTerm);
  };

  const handleCloseSearchClick = () => {
    setSearchResult([]);
    setSearchTerm('');
    popScreen();
  };

  const renderSelectButton = () => (
    <Button
      type="primary"
      onClick={handleSelectClick}
      disabled={!selectedFile || isLoading}
      >
      {t('common:select')}
    </Button>
  );

  const renderScreenBackButton = ({ onClick, disabled }) => {
    const renderText = () => (
      <div className={classNames('StorageLocation-screenBack', { 'is-disabled': disabled })}>
        <DoubleLeftOutlined />
        {t('common:back')}
      </div>
    );

    return disabled ? renderText() : <a onClick={onClick}>{renderText()}</a>;
  };

  const renderStorageInfo = () => {
    if (screen === SCREEN.search) {
      return (
        <Alert
          type="info"
          message={<Trans t={t} i18nKey="searchResultInfo" values={{ searchTerm }} components={[<i key="0" />]} />}
          action={<Button type="link" onClick={handleCloseSearchClick}>{t('closeSearchResult')}</Button>}
          showIcon
          />
      );
    }

    if (storageLocation.type === STORAGE_LOCATION_TYPE.private && (storageLocation.usedBytes > 0 || storageLocation.maxBytes > 0)) {
      return <UsedStorage usedBytes={storageLocation.usedBytes} maxBytes={storageLocation.maxBytes} showLabel />;
    }

    if (storageLocation.type === STORAGE_LOCATION_TYPE.public) {
      return <Alert message={t('publicStorageWarning')} type="warning" showIcon />;
    }

    return null;
  };

  useEffect(() => {
    const checkPreconditions = () => {
      return storageLocation.type === STORAGE_LOCATION_TYPE.public
        ? new Promise(resolve => {
          if (!getCookie(uploadLiabilityCookieName)) {
            confirmPublicUploadLiability(t, () => {
              setSessionCookie(uploadLiabilityCookieName, 'true');
              resolve(true);
            }, () => resolve(false));
          } else {
            resolve(true);
          }
        })
        : true;
    };

    const startUpload = async () => {
      if (!uploadQueue.length) {
        return;
      }

      const preMet = await checkPreconditions();
      if (!preMet || !uploadQueue.length) {
        return;
      }

      await handleUploadStart();
    };

    startUpload();

  }, [uploadQueue, handleUploadStart, storageLocation.type, uploadLiabilityCookieName, t]);

  useEffect(() => {
    if (!selectedFile) {
      return;
    }

    let collectionToUse;
    switch (screen) {
      case SCREEN.directory:
        collectionToUse = files;
        break;
      case SCREEN.search:
        collectionToUse = searchResult;
        break;
      default:
        collectionToUse = null;
        break;
    }

    if (!collectionToUse) {
      return;
    }

    const previouslySelectedFileStillExists = collectionToUse.some(file => file.portableUrl === selectedFile.portableUrl);
    if (!previouslySelectedFileStillExists) {
      setSelectedFile(null);
    }
  }, [screen, selectedFile, files, searchResult]);

  useEffect(() => {
    if (!files.length || !showInitialFileSelection) {
      return;
    }

    const initialResourceName = getResourceFullName(initialUrl);

    if (initialResourceName) {
      const preSelectedFile = files.find(file => file.displayName === initialResourceName);
      setSelectedFile(preSelectedFile);
    }
  }, [initialUrl, showInitialFileSelection, files]);

  useEffect(() => {
    const initialResourcePath = getStorageLocationPathForUrl(initialUrl);
    const initialResourceParentDirectoryPath = getParentPathForStorageLocationPath(initialResourcePath);

    setCurrentDirectoryPath(initialResourceParentDirectoryPath.startsWith(storageLocation.rootPath)
      ? initialResourceParentDirectoryPath
      : storageLocation.homePath);
  }, [initialUrl, storageLocation.homePath, storageLocation.rootPath]);

  useEffect(() => {
    fetchStorageContent();
  }, [fetchStorageContent]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const getFilesViewerClasses = isDragActive => classNames({
    'StorageLocation-filesViewer': true,
    'u-can-drop': isDragActive && canAcceptFiles,
    'u-cannot-drop': isDragActive && !canAcceptFiles
  });

  return (
    <div className="StorageLocation">
      {(screen === SCREEN.directory || screen === SCREEN.search) && (
        <Fragment>
          <div className="StorageLocation-buttonsLine">
            <div>
              <Search
                placeholder={t('common:search')}
                value={searchTerm}
                onSearch={handleSearchClick}
                onChange={handleSearchTermChange}
                enterButton={<SearchOutlined />}
                />
            </div>
            <div className="StorageLocation-filesViewerSelectContainer">
              <Select
                value={filesViewerDisplay}
                onChange={setFilesViewerDisplay}
                className="StorageLocation-filesViewerSelect"
                options={Object.values(FILES_VIEWER_DISPLAY).map(v => ({ label: t(`filesView_${v}`), value: v }))}
                />
            </div>
          </div>
          <ReactDropzone
            ref={dropzoneRef}
            onDrop={canAcceptFiles ? setUploadQueue : null}
            noKeyboard
            noClick
            >
            {({ getRootProps, getInputProps, isDragActive }) => (
              <div {...getRootProps({ className: getFilesViewerClasses(isDragActive) })}>
                <input {...getInputProps()} hidden />
                <FilesViewer
                  files={screen === SCREEN.search ? searchResult : files}
                  parentDirectory={screen === SCREEN.search ? null : parentDirectory}
                  display={filesViewerDisplay}
                  onFileClick={handleFileClick}
                  onFileDoubleClick={handleFileDoubleClick}
                  selectedFileUrl={selectedFile?.portableUrl}
                  onDeleteClick={handleDeleteClick}
                  onNavigateToParentClick={() => setCurrentDirectoryPath(getParentPathForStorageLocationPath(currentDirectory.path))}
                  onPreviewClick={handlePreviewClick}
                  canNavigateToParent={screen === SCREEN.directory && currentDirectory?.path?.length > storageLocation.rootPath.length}
                  canDelete={storageLocation.isDeletionEnabled}
                  isLoading={isLoading}
                  />
              </div>
            )}
          </ReactDropzone>
          <div className="StorageLocation-storageInfo">
            {renderStorageInfo()}
          </div>
          <div className="StorageLocation-buttonsLine">
            <Button
              icon={<UploadIcon />}
              onClick={handleUploadButtonClick}
              disabled={!canAcceptFiles}
              >
              {t('uploadFiles')}
            </Button>
            <div className="StorageLocation-buttonsGroup">
              <Button onClick={onCancel}>{t('common:cancel')}</Button>
              {renderSelectButton()}
            </div>
          </div>
        </Fragment>
      )}

      {screen === SCREEN.preview && (
      <div className="StorageLocation-screen">
        {renderScreenBackButton({ onClick: handlePreviewScreenBackClick })}
        <FilePreview
          url={selectedFile.url}
          size={selectedFile.size}
          createdOn={selectedFile.createdOn}
          />
        <div className="StorageLocation-screenSelect">{renderSelectButton()}</div>
      </div>
      )}

      {screen === SCREEN.uploadOverview && (
      <div className="StorageLocation-screen">
        {renderScreenBackButton({ onClick: handleUploadOverviewScreenBackClick, disabled: isUploading })}
        <FilesUploadOverview
          files={uploadQueue}
          directory={currentDirectory}
          storageLocation={storageLocation}
          onUploadFinish={handleUploadFinish}
          />
      </div>
      )}
    </div>
  );
}

StorageLocation.propTypes = {
  initialUrl: PropTypes.string,
  onCancel: PropTypes.func,
  onSelect: PropTypes.func,
  storageLocation: storageLocationShape.isRequired
};

StorageLocation.defaultProps = {
  initialUrl: null,
  onCancel: () => {},
  onSelect: () => {}
};

export default StorageLocation;
