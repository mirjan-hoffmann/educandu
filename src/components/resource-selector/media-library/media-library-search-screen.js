import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Button, Spin } from 'antd';
import prettyBytes from 'pretty-bytes';
import reactDropzoneNs from 'react-dropzone';
import EmptyState from '../../empty-state.js';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../user-context.js';
import UploadButton from '../shared/upload-button.js';
import EditIcon from '../../icons/general/edit-icon.js';
import FilesGridViewer from '../shared/files-grid-viewer.js';
import MediaLibraryOptions from './media-library-options.js';
import PreviewIcon from '../../icons/general/preview-icon.js';
import ResourceSearchBar from '../shared/resource-search-bar.js';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import { useSessionAwareApiClient } from '../../../ui/api-helper.js';
import { CloudUploadOutlined, SearchOutlined } from '@ant-design/icons';
import SelectedResourceDisplay from '../shared/selected-resource-display.js';
import permissions, { hasUserPermission } from '../../../domain/permissions.js';
import MediaLibraryApiClient from '../../../api-clients/media-library-api-client.js';
import { mediaLibraryItemShape, mediaLibraryItemWithRelevanceShape } from '../../../ui/default-prop-types.js';
import { MEDIA_SEARCH_RESOURCE_TYPE, STORAGE_FILE_UPLOAD_LIMIT_IN_BYTES } from '../../../domain/constants.js';

const ReactDropzone = reactDropzoneNs.default || reactDropzoneNs;

const SCREEN = {
  search: 'search',
  searchInvitation: 'search-invitation',
  initialUrlPreview: 'initial-url-preview'
};

function MediaLibrarySearchScreen({
  files,
  isHidden,
  isLoading,
  initialUrl,
  searchParams,
  highlightedFile,
  onFileDrop,
  onFileClick,
  onCancelClick,
  onFileDoubleClick,
  onDeleteFileClick,
  onEditFileClick,
  onPreviewFileClick,
  onSearchParamsChange,
  onSelectInitialUrlClick,
  onSelectHighlightedFileClick
}) {
  const user = useUser();
  const dropzoneRef = useRef();
  const { t } = useTranslation('mediaLibrarySearchScreen');
  const mediaLibraryApiClient = useSessionAwareApiClient(MediaLibraryApiClient);

  const [hasSearchedAtLeastOnce, setHasSearchedAtLeastOnce] = useState(false);
  const [initialMediaLibraryItem, setInitialMediaLibraryItem] = useState(null);

  useEffect(() => {
    const shouldReFetchInitialItem = initialUrl && !highlightedFile;

    if (shouldReFetchInitialItem) {
      (async () => {
        const item = await mediaLibraryApiClient.findMediaLibraryItem({ url: initialUrl });
        setInitialMediaLibraryItem(item);
      })();
    }
  }, [initialUrl, mediaLibraryApiClient, highlightedFile]);

  let currentScreen;
  let canSelectUrl;
  if (hasSearchedAtLeastOnce) {
    currentScreen = SCREEN.search;
    canSelectUrl = !!highlightedFile;
  } else if (initialUrl) {
    currentScreen = SCREEN.initialUrlPreview;
    canSelectUrl = true;
  } else {
    currentScreen = SCREEN.searchInvitation;
    canSelectUrl = false;
  }

  const handleSearch = newSearchParams => {
    setHasSearchedAtLeastOnce(true);
    onSearchParamsChange(newSearchParams);
  };

  const handleSelectClick = () => {
    switch (currentScreen) {
      case SCREEN.search:
        return onSelectHighlightedFileClick();
      case SCREEN.initialUrlPreview:
        return onSelectInitialUrlClick();
      default:
        throw new Error('No file selected');
    }
  };

  const handleUploadButtonClick = () => {
    dropzoneRef.current.open();
  };

  const getFilesViewerClasses = isDragActive => classNames(
    'MediaLibrarySearchScreen-filesViewer',
    { 'is-dropping': isDragActive && !isLoading },
    { 'is-drop-rejected': isDragActive && isLoading }
  );

  const getNoSearchClasses = isDragActive => classNames(
    'MediaLibrarySearchScreen-noSearch',
    { 'is-dropping': isDragActive && !isLoading },
    { 'is-drop-rejected': isDragActive && isLoading }
  );

  const showEmptyState = !initialUrl;

  return (
    <div className={classNames('MediaLibrarySearchScreen', { 'is-hidden': isHidden })}>
      <div className="u-resource-selector-screen">
        <div className="MediaLibrarySearchScreen-searchBar">
          <ResourceSearchBar isLoading={isLoading} initialSearchParams={searchParams} onSearch={handleSearch} />
        </div>
        {currentScreen === SCREEN.search && (
          <div className="MediaLibrarySearchScreen-searchContent u-resource-selector-screen-content">

            <ReactDropzone ref={dropzoneRef} noClick noKeyboard onDrop={fs => fs.length && onFileDrop(fs[0])}>
              {({ getRootProps, getInputProps, isDragActive }) => (
                <div {...getRootProps({ className: getFilesViewerClasses(isDragActive) })}>
                  <input {...getInputProps()} hidden />
                  <div className="MediaLibrarySearchScreen-filesViewerContent">
                    <FilesGridViewer
                      files={files}
                      searchTerm={searchParams.searchTerm}
                      selectedFileUrl={highlightedFile?.portableUrl}
                      canEdit
                      canDelete={hasUserPermission(user, permissions.MANAGE_PUBLIC_CONTENT)}
                      onFileClick={onFileClick}
                      onFileDoubleClick={onFileDoubleClick}
                      onDeleteFileClick={onDeleteFileClick}
                      onEditFileClick={onEditFileClick}
                      onPreviewFileClick={onPreviewFileClick}
                      />
                  </div>
                  {!!isLoading && (
                  <div className={classNames('MediaLibrarySearchScreen-filesViewerOverlay')}>
                    <Spin size="large" />
                  </div>
                  )}
                </div>
              )}
            </ReactDropzone>
          </div>
        )}

        {currentScreen !== SCREEN.search && (
          <ReactDropzone ref={dropzoneRef} noClick noKeyboard onDrop={fs => fs.length && onFileDrop(fs[0])}>
            {({ getRootProps, getInputProps, isDragActive }) => (
              <div {...getRootProps({ className: getNoSearchClasses(isDragActive) })}>
                <MediaLibraryOptions
                  option1={
                    <Fragment>
                      <input {...getInputProps()} hidden />
                      {!!showEmptyState && (
                        <EmptyState
                          compact
                          icon={<SearchOutlined />}
                          title={t('emptyStateTitle')}
                          subtitle={t('common:mediaLibraryEmptyStateSubtitle')}
                          />
                      )}
                      {!showEmptyState && (
                        <SelectedResourceDisplay
                          urlOrFile={initialUrl}
                          actions={!!initialMediaLibraryItem && (
                            <Fragment>
                              <Button icon={<PreviewIcon />} onClick={() => onPreviewFileClick(initialMediaLibraryItem)}>
                                {t('common:preview')}
                              </Button>
                              <Button icon={<EditIcon />} onClick={() => onEditFileClick(initialMediaLibraryItem)}>
                                {t('common:edit')}
                              </Button>
                            </Fragment>
                          )}
                          footer={t('common:useSearchToChangeFile')}
                          />
                      )}
                    </Fragment>
                  }
                  option2={
                    <EmptyState
                      compact
                      icon={<CloudUploadOutlined />}
                      title={initialUrl ? t('common:mediaUploadAlternativeTitle') : t('common:mediaUploadEmptyStateTitle')}
                      subtitle={t('common:mediaUploadEmptyStateSubtitle')}
                      button={{
                        isDefaultType: true,
                        text: t('common:browse'),
                        subtext: t('common:uploadLimitInfo', { limit: prettyBytes(STORAGE_FILE_UPLOAD_LIMIT_IN_BYTES), maxFiles: 1 }),
                        onClick: handleUploadButtonClick
                      }}
                      />
                  }
                  />
              </div>
            )}
          </ReactDropzone>
        )}
        <div className={currentScreen === SCREEN.search ? 'u-resource-selector-screen-footer' : 'u-resource-selector-screen-footer-right-aligned'}>
          {currentScreen === SCREEN.search && (
            <UploadButton onClick={handleUploadButtonClick} />
          )}
          <div className="u-resource-selector-screen-footer-buttons">
            <Button onClick={onCancelClick}>{t('common:cancel')}</Button>
            <Button onClick={handleSelectClick} disabled={!canSelectUrl}>{t('common:select')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

MediaLibrarySearchScreen.propTypes = {
  files: PropTypes.arrayOf(mediaLibraryItemWithRelevanceShape).isRequired,
  highlightedFile: mediaLibraryItemShape,
  initialUrl: PropTypes.string,
  isHidden: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  searchParams: PropTypes.shape({
    searchTerm: PropTypes.string.isRequired,
    searchResourceType: PropTypes.oneOf(Object.values(MEDIA_SEARCH_RESOURCE_TYPE)).isRequired
  }).isRequired,
  onFileDrop: PropTypes.func.isRequired,
  onFileClick: PropTypes.func.isRequired,
  onCancelClick: PropTypes.func.isRequired,
  onFileDoubleClick: PropTypes.func.isRequired,
  onDeleteFileClick: PropTypes.func.isRequired,
  onEditFileClick: PropTypes.func.isRequired,
  onPreviewFileClick: PropTypes.func.isRequired,
  onSearchParamsChange: PropTypes.func.isRequired,
  onSelectInitialUrlClick: PropTypes.func.isRequired,
  onSelectHighlightedFileClick: PropTypes.func.isRequired
};

MediaLibrarySearchScreen.defaultProps = {
  highlightedFile: null,
  initialUrl: null
};

export default MediaLibrarySearchScreen;
