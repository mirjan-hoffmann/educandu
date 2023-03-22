import PropTypes from 'prop-types';
import routes from '../../utils/routes.js';
import Logger from '../../common/logger.js';
import { useUser } from '../user-context.js';
import FocusHeader from '../focus-header.js';
import FavoriteStar from '../favorite-star.js';
import { useTranslation } from 'react-i18next';
import urlUtils from '../../utils/url-utils.js';
import uniqueId from '../../utils/unique-id.js';
import { ALERT_TYPE } from '../custom-alert.js';
import CommentsPanel from '../comments-panel.js';
import CreditsFooter from '../credits-footer.js';
import { useIsMounted } from '../../ui/hooks.js';
import cloneDeep from '../../utils/clone-deep.js';
import { useRequest } from '../request-context.js';
import EditIcon from '../icons/general/edit-icon.js';
import SaveIcon from '../icons/general/save-icon.js';
import { useService } from '../container-context.js';
import SectionsDisplay from '../sections-display.js';
import HistoryIcon from '../icons/general/history-icon.js';
import CommentIcon from '../icons/general/comment-icon.js';
import EditDocIcon from '../icons/general/edit-doc-icon.js';
import PluginRegistry from '../../plugins/plugin-registry.js';
import DuplicateIcon from '../icons/general/duplicate-icon.js';
import DocumentMetadataModal from '../document-metadata-modal.js';
import { useSessionAwareApiClient } from '../../ui/api-helper.js';
import { supportsClipboardPaste } from '../../ui/browser-helper.js';
import { RoomMediaContextProvider } from '../room-media-context.js';
import CommentApiClient from '../../api-clients/comment-api-client.js';
import { handleApiError, handleError } from '../../ui/error-helper.js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Breadcrumb, Button, message, Tooltip, FloatButton } from 'antd';
import DocumentApiClient from '../../api-clients/document-api-client.js';
import permissions, { hasUserPermission } from '../../domain/permissions.js';
import { DOC_VIEW_QUERY_PARAM, FAVORITE_TYPE } from '../../domain/constants.js';
import { DOCUMENT_METADATA_MODAL_MODE } from '../document-metadata-modal-utils.js';
import { CloudOutlined, CloudUploadOutlined, LikeOutlined } from '@ant-design/icons';
import { ensurePluginComponentAreLoadedForSections } from '../../utils/plugin-utils.js';
import { documentShape, roomMediaContextShape, roomShape, sectionShape } from '../../ui/default-prop-types.js';
import { ensureIsExcluded, ensureIsIncluded, insertItemAt, moveItem, removeItemAt, replaceItemAt } from '../../utils/array-utils.js';
import { createClipboardTextForSection, createNewSectionFromClipboardText, redactSectionContent } from '../../services/section-helper.js';
import {
  confirmDiscardUnsavedChanges,
  confirmDocumentRevisionRestoration,
  confirmSectionDelete,
  confirmSectionHardDelete
} from '../confirmation-dialogs.js';
import {
  canEditDoc,
  findCurrentlyWorkedOnSectionKey,
  getEditDocRestrictionTooltip,
  tryBringSectionIntoView
} from '../../utils/doc-utils.js';

const logger = new Logger(import.meta.url);

const VIEW = {
  display: 'display',
  edit: DOC_VIEW_QUERY_PARAM.edit,
  history: DOC_VIEW_QUERY_PARAM.history,
  comments: DOC_VIEW_QUERY_PARAM.comments
};

function createPageAlerts({ doc, docRevision, view, hasPendingTemplateSectionKeys, t }) {
  const alerts = [];
  const review = docRevision ? docRevision.publicContext?.review : doc.publicContext?.review;

  if (view === VIEW.edit && hasPendingTemplateSectionKeys) {
    alerts.push({ message: t('common:proposedSectionsAlert') });
  }

  if (review) {
    alerts.push({ message: review, type: ALERT_TYPE.warning });
  }

  return alerts;
}

function getDocumentMetadataModalState({ t, doc, room, isCloning, isOpen = false }) {
  return {
    isOpen,
    mode: isCloning ? DOCUMENT_METADATA_MODAL_MODE.clone : DOCUMENT_METADATA_MODAL_MODE.update,
    documentToClone: isCloning ? doc : null,
    allowMultiple: false,
    initialDocumentRoomMetadata: room ? { ...room } : null,
    initialDocumentMetadata: isCloning
      ? {
        ...doc,
        title: `${doc.title} ${t('common:copyTitleSuffix')}`,
        slug: doc.slug ? `${doc.slug}-${t('common:copySlugSuffix')}` : '',
        tags: [...doc.tags]
      }
      : { ...doc }
  };
}

const determineInitialViewState = request => {
  const requestView = Object.values(VIEW).find(v => v === request.query.view);
  if (!requestView) {
    return { preSetView: null, view: VIEW.display };
  }

  return { preSetView: requestView, view: requestView };
};

class DocumentPreloader {
  static dependencies = [PluginRegistry];

  constructor(pluginRegistry) {
    this.pluginRegistry = pluginRegistry;
  }

  preload({ initialState, request }) {
    const startsInEditMode = determineInitialViewState(request).view === VIEW.edit;
    return ensurePluginComponentAreLoadedForSections({
      sections: [...initialState.doc.sections, ...initialState.templateSections],
      pluginRegistry: this.pluginRegistry,
      displayOnly: !startsInEditMode
    });
  }
}

function Document({ initialState, PageTemplate }) {
  const user = useUser();
  const pageRef = useRef(null);
  const request = useRequest();
  const isMounted = useIsMounted();
  const sectionsWrapperRef = useRef(null);
  const commentsSectionRef = useRef(null);
  const { t } = useTranslation('document');
  const pluginRegistry = useService(PluginRegistry);
  const commentApiClient = useSessionAwareApiClient(CommentApiClient);
  const documentApiClient = useSessionAwareApiClient(DocumentApiClient);

  const { room } = initialState;

  const userCanHardDelete = hasUserPermission(user, permissions.MANAGE_PUBLIC_CONTENT);
  const userCanEdit = hasUserPermission(user, permissions.CREATE_CONTENT);
  const userCanEditDoc = canEditDoc({ user, doc: initialState.doc, room });
  const editDocRestrictionTooltip = getEditDocRestrictionTooltip({ t, user, doc: initialState.doc, room });

  const [actionsPanelPositionInPx, setActionsPanelPositionInPx] = useState(null);

  const [comments, setComments] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [doc, setDoc] = useState(initialState.doc);
  const [lastViewInfo, setLastViewInfo] = useState(null);
  const [historyRevisions, setHistoryRevisions] = useState([]);
  const [editedSectionKeys, setEditedSectionKeys] = useState([]);
  const [view, setView] = useState(determineInitialViewState(request).view);
  const [selectedHistoryRevision, setSelectedHistoryRevision] = useState(null);
  const [areCommentsInitiallyLoaded, setAreCommentsInitiallyLoaded] = useState(false);
  const [preSetView, setPreSetView] = useState(determineInitialViewState(request).preSetView);
  const [documentMetadataModalState, setDocumentMetadataModalState] = useState(getDocumentMetadataModalState({ t }));
  const [pendingTemplateSectionKeys, setPendingTemplateSectionKeys] = useState((initialState.templateSections || []).map(s => s.key));
  const [currentSections, setCurrentSections] = useState(cloneDeep(initialState.templateSections?.length ? initialState.templateSections : doc.sections));

  const [alerts, setAlerts] = useState(createPageAlerts({
    t,
    doc,
    view,
    hasPendingTemplateSectionKeys: !!pendingTemplateSectionKeys.length
  }));

  const switchView = newView => {
    setLastViewInfo({ view, sectionKeyToScrollTo: findCurrentlyWorkedOnSectionKey() });
    setPreSetView(null);
    setView(newView);
  };

  const ensureActionsPanelPosition = useCallback(() => {
    const windowWidth = Math.min(window.innerWidth, window.outerWidth);

    const sectionsWrapperBoundingRect = sectionsWrapperRef.current.getBoundingClientRect();
    const position = {
      top: sectionsWrapperBoundingRect.top
    };

    const left = sectionsWrapperBoundingRect.left + sectionsWrapperBoundingRect.width + 40;
    if (left >= windowWidth) {
      position.right = 0;
    } else {
      position.left = left;
    }
    setActionsPanelPositionInPx(position);
  }, [sectionsWrapperRef]);

  useEffect(() => {
    ensureActionsPanelPosition();

    window.addEventListener('resize', ensureActionsPanelPosition);

    return () => {
      window.removeEventListener('resize', ensureActionsPanelPosition);
    };
  }, [ensureActionsPanelPosition]);

  useEffect(() => {
    if (view !== VIEW.comments && lastViewInfo?.view !== VIEW.comments && lastViewInfo?.sectionKeyToScrollTo) {
      setTimeout(() => tryBringSectionIntoView(lastViewInfo.sectionKeyToScrollTo), 500);
    }

    if (view === VIEW.comments && !!commentsSectionRef.current) {
      commentsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [view, lastViewInfo, commentsSectionRef]);

  const fetchComments = useCallback(async () => {
    try {
      const response = await commentApiClient.getAllDocumentComments({ documentId: doc._id });
      setAreCommentsInitiallyLoaded(true);
      setComments(response.comments);
    } catch (error) {
      handleApiError({ error, t, logger });
    }
  }, [doc, commentApiClient, t]);

  useEffect(() => {
    setAlerts(createPageAlerts({
      t,
      doc,
      docRevision: selectedHistoryRevision,
      view,
      hasPendingTemplateSectionKeys: !!pendingTemplateSectionKeys.length
    }));
  }, [doc, selectedHistoryRevision, view, pendingTemplateSectionKeys, t]);

  useEffect(() => {
    if (preSetView === VIEW.history) {
      (async () => {
        try {
          const { documentRevisions } = await documentApiClient.getDocumentRevisions(doc._id);
          setHistoryRevisions(documentRevisions);
          setSelectedHistoryRevision(documentRevisions[documentRevisions.length - 1]);
        } catch (error) {
          handleApiError({ error, t, logger });
        }
      })();
    }

    if (preSetView === VIEW.comments) {
      (async () => {
        await fetchComments();
      })();
    }
  }, [preSetView, doc._id, view, t, documentApiClient, fetchComments]);

  useEffect(() => {
    const viewQueryValue = view === VIEW.display ? null : view;
    history.replaceState(null, '', routes.getDocUrl({ id: doc._id, slug: doc.slug, view: viewQueryValue }));
  }, [user, doc._id, doc.slug, view]);

  const handleEditMetadataOpen = () => {
    setDocumentMetadataModalState(getDocumentMetadataModalState({ t, doc, room, isCloning: false, isOpen: true }));
  };

  const handleDocumentCloneClick = () => {
    setDocumentMetadataModalState(getDocumentMetadataModalState({ t, doc, room, isCloning: true, isOpen: true }));
  };

  const handleDocumentMetadataModalSave = updatedDocuments => {
    setDocumentMetadataModalState(prev => ({ ...prev, isOpen: false }));

    if (documentMetadataModalState.mode === DOCUMENT_METADATA_MODAL_MODE.update) {
      setDoc(updatedDocuments[0]);
      message.success(t('common:changesSavedSuccessfully'));
    }

    if (documentMetadataModalState.mode === DOCUMENT_METADATA_MODAL_MODE.clone) {
      window.location = routes.getDocUrl({
        id: updatedDocuments[0]._id,
        slug: updatedDocuments[0].slug,
        view: DOC_VIEW_QUERY_PARAM.edit,
        templateDocumentId: doc._id
      });
    }
  };

  const handleDocumentMetadataModalClose = () => {
    setDocumentMetadataModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleEditOpen = () => {
    switchView(VIEW.edit);
    setCurrentSections(cloneDeep(doc.sections));
  };

  const handleEditSave = async () => {
    try {
      setIsSaving(true);
      const updatedDoc = await documentApiClient.updateDocumentSections({
        documentId: doc._id,
        sections: currentSections.filter(s => !pendingTemplateSectionKeys.includes(s.key)).map(s => ({
          key: s.key,
          type: s.type,
          content: s.content
        }))
      });

      const currentSectionKeys = currentSections.map(s => s.key);
      if (updatedDoc.sections.some(s => !currentSectionKeys.includes(s.key))) {
        throw new Error('Updated sections do not match existing sections');
      }

      const newPendingTemplateSectionKeys = [];
      const mergedSections = currentSections.map(currentSection => {
        const updatedSection = updatedDoc.sections.find(s => s.key === currentSection.key);
        if (updatedSection) {
          return updatedSection;
        }

        newPendingTemplateSectionKeys.push(currentSection.key);
        return currentSection;
      });

      setIsDirty(false);
      setDoc(updatedDoc);
      setCurrentSections(cloneDeep(mergedSections));
      setPendingTemplateSectionKeys(newPendingTemplateSectionKeys);
      message.success(t('common:changesSavedSuccessfully'));
    } catch (error) {
      handleApiError({ error, logger, t });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClose = () => {
    const exitEditMode = () => {
      setCurrentSections(doc.sections);
      setIsDirty(false);
      switchView(VIEW.display);
      setEditedSectionKeys([]);
      setPendingTemplateSectionKeys([]);
    };

    if (isDirty) {
      confirmDiscardUnsavedChanges(t, exitEditMode);
    } else {
      exitEditMode();
    }
  };

  const handleCommentsOpen = async () => {
    setAreCommentsInitiallyLoaded(false);
    switchView(VIEW.comments);
    await fetchComments();
  };

  const handleCommentsClose = () => {
    switchView(VIEW.display);
    setComments([]);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    return true;
  };

  const handleHistoryOpen = async () => {
    try {
      const { documentRevisions } = await documentApiClient.getDocumentRevisions(doc._id);
      setHistoryRevisions(documentRevisions);
      setSelectedHistoryRevision(documentRevisions[documentRevisions.length - 1]);
      switchView(VIEW.history);
    } catch (error) {
      handleApiError({ error, t, logger });
    }
  };

  const handleHistoryClose = () => {
    setHistoryRevisions([]);
    setSelectedHistoryRevision(null);
    switchView(VIEW.display);
    return true;
  };

  const handleSectionContentChange = useCallback((index, newContent) => {
    const modifiedSection = {
      ...currentSections[index],
      content: newContent
    };

    const newSections = replaceItemAt(currentSections, modifiedSection, index);
    setCurrentSections(newSections);
    setIsDirty(true);
  }, [currentSections]);

  const handleSectionMove = useCallback((sourceIndex, destinationIndex) => {
    const reorderedSections = moveItem(currentSections, sourceIndex, destinationIndex);
    setCurrentSections(reorderedSections);
    setIsDirty(true);
  }, [currentSections]);

  const handleSectionInsert = useCallback((pluginType, index) => {
    const plugin = pluginRegistry.getRegisteredPlugin(pluginType);
    const newSection = {
      key: uniqueId.create(),
      type: plugin.name,
      content: plugin.info.getDefaultContent(t)
    };
    const newSections = insertItemAt(currentSections, newSection, index);
    setCurrentSections(newSections);
    setEditedSectionKeys(keys => ensureIsIncluded(keys, newSection.key));
    setIsDirty(true);
  }, [currentSections, pluginRegistry, t]);

  const handleSectionDuplicate = useCallback(index => {
    const originalSection = currentSections[index];
    const duplicatedSection = cloneDeep(originalSection);
    duplicatedSection.key = uniqueId.create();

    const expandedSections = insertItemAt(currentSections, duplicatedSection, index + 1);
    setCurrentSections(expandedSections);
    setIsDirty(true);
    setEditedSectionKeys(keys => ensureIsIncluded(keys, duplicatedSection.key));
  }, [currentSections]);

  const handleSectionCopyToClipboard = useCallback(async index => {
    const originalSection = currentSections[index];
    const clipboardText = createClipboardTextForSection(originalSection, request.hostInfo.origin);
    try {
      await window.navigator.clipboard.writeText(clipboardText);
      message.success(t('common:sectionCopiedToClipboard'));
    } catch (error) {
      handleError({ message: t('common:copySectionToClipboardError'), error, logger, t, duration: 30 });
    }
  }, [currentSections, request, t]);

  const handleSectionPasteFromClipboard = useCallback(async index => {
    if (!supportsClipboardPaste()) {
      message.error(t('common:clipboardPasteNotSupported'), 10);
      return false;
    }

    try {
      const targetRoomId = room?._id || null;
      const clipboardText = await window.navigator.clipboard.readText();
      const newSection = createNewSectionFromClipboardText(clipboardText, request.hostInfo.origin);
      const redactedSection = redactSectionContent({ section: newSection, pluginRegistry, targetRoomId });
      const newSections = insertItemAt(currentSections, redactedSection, index);
      setCurrentSections(newSections);
      setIsDirty(true);
      return true;
    } catch (error) {
      handleError({ message: t('common:pasteSectionFromClipboardError'), error, logger, t, duration: 30 });
      return false;
    }
  }, [currentSections, pluginRegistry, request, room, t]);

  const handleSectionDelete = useCallback(index => {
    confirmSectionDelete(
      t,
      () => {
        const section = currentSections[index];
        const reducedSections = removeItemAt(currentSections, index);
        setEditedSectionKeys(keys => ensureIsExcluded(keys, section.key));
        setCurrentSections(reducedSections);
        setIsDirty(true);
      }
    );
  }, [currentSections, t]);

  const handleSectionEditEnter = useCallback(index => {
    const section = currentSections[index];
    setEditedSectionKeys(keys => ensureIsIncluded(keys, section.key));
  }, [currentSections]);

  const handleSectionEditLeave = useCallback(index => {
    const section = currentSections[index];
    setEditedSectionKeys(keys => ensureIsExcluded(keys, section.key));
  }, [currentSections]);

  const handlePendingSectionApply = useCallback(index => {
    const appliedSectionKey = currentSections[index].key;
    setPendingTemplateSectionKeys(prevKeys => ensureIsExcluded(prevKeys, appliedSectionKey));
    setIsDirty(true);
  }, [currentSections]);

  const handlePendingSectionDiscard = useCallback(index => {
    const discardedSection = currentSections[index];
    setCurrentSections(prevSections => ensureIsExcluded(prevSections, discardedSection));
    setIsDirty(true);
  }, [currentSections]);

  // eslint-disable-next-line no-unused-vars
  const handlePermalinkRequest = async () => {
    const permalinkUrl = urlUtils.createFullyQualifiedUrl(routes.getDocumentRevisionUrl(selectedHistoryRevision._id));
    try {
      await window.navigator.clipboard.writeText(permalinkUrl);
      message.success(t('permalinkCopied'));
    } catch (error) {
      const msg = (
        <span>
          <span>{t('permalinkCouldNotBeCopied')}:</span>
          <br />
          <a href={permalinkUrl}>{permalinkUrl}</a>
        </span>
      );
      message.error(msg, 10);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleSelectedRevisionChange = index => {
    setSelectedHistoryRevision(historyRevisions[index]);
  };

  // eslint-disable-next-line no-unused-vars
  const handleRestoreRevision = () => {
    confirmDocumentRevisionRestoration(
      t,
      selectedHistoryRevision,
      async () => {
        try {
          const { document: updatedDoc, documentRevisions } = await documentApiClient.restoreDocumentRevision({
            documentId: selectedHistoryRevision.documentId,
            revisionId: selectedHistoryRevision._id
          });

          setDoc(updatedDoc);
          setCurrentSections(updatedDoc.sections);
          setHistoryRevisions(documentRevisions);
          setSelectedHistoryRevision(documentRevisions[documentRevisions.length - 1]);
        } catch (error) {
          handleApiError({ error, logger, t });
          throw error;
        }
      }
    );
  };

  const hardDeleteSection = useCallback(async ({ section, reason, deleteAllRevisions }) => {
    const documentId = doc._id;
    const sectionKey = section.key;
    const sectionRevision = section.revision;

    try {
      const { document: updatedDoc } = await documentApiClient.hardDeleteSection({ documentId, sectionKey, sectionRevision, reason, deleteAllRevisions });

      setDoc(updatedDoc);
      setCurrentSections(updatedDoc.sections);
    } catch (error) {
      handleApiError({ error, logger, t });
    }

    const { documentRevisions } = await documentApiClient.getDocumentRevisions(documentId);

    setHistoryRevisions(documentRevisions);
    setSelectedHistoryRevision(documentRevisions[documentRevisions.length - 1]);
  }, [doc, documentApiClient, t]);

  const handleSectionHardDelete = useCallback(index => {
    confirmSectionHardDelete(
      t,
      async ({ reason, deleteAllRevisions }) => {
        const section = selectedHistoryRevision.sections[index];
        await hardDeleteSection({ section, reason, deleteAllRevisions });
      }
    );
  }, [hardDeleteSection, selectedHistoryRevision, t]);

  const handleCommentPostClick = async ({ topic, text }) => {
    try {
      await commentApiClient.addComment({ documentId: doc._id, topic, text });
      await fetchComments();
    } catch (error) {
      handleApiError({ error, logger, t });
    }
  };

  const handleCommentsTopicChangeClick = async ({ oldTopic, newTopic }) => {
    try {
      await commentApiClient.updateCommentsTopic({ documentId: doc._id, oldTopic, newTopic });
      await fetchComments();
    } catch (error) {
      handleApiError({ error, logger, t });
    }
  };

  const handleCommentDeleteClick = async commentId => {
    try {
      await commentApiClient.deleteComment({ commentId });
      await fetchComments();
    } catch (error) {
      handleApiError({ error, logger, t });
    }
  };

  const renderEditFocusHeader = () => (
    <FocusHeader title={t('editDocument')} onClose={handleEditClose}>
      <div className="DocumentPage-focusHeaderDirtyInfo">
        <div>{isDirty ? <CloudUploadOutlined /> : <CloudOutlined />}</div>
        <div className="DocumentPage-focusHeaderDirtyInfoText">{isDirty ? t('statusIconTooltipDirty') : t('statusIconTooltipSaved')}</div>
      </div>
      <Button
        icon={<EditIcon />}
        className="DocumentPage-focusHeaderButton"
        onClick={handleEditMetadataOpen}
        >
        {t('editMetadata')}
      </Button>
      <Button
        icon={<SaveIcon />}
        type="primary"
        loading={isSaving}
        disabled={!isDirty}
        className="DocumentPage-focusHeaderButton"
        onClick={handleEditSave}
        >
        {t('saveChanges')}
      </Button>
    </FocusHeader>
  );

  const renderCommentsFocusHeader = () => (
    <FocusHeader title={t('comments')} onClose={handleCommentsClose} />
  );

  const renderHistoryFocusHeader = () => (
    <FocusHeader title={t('history')} onClose={handleHistoryClose} />
  );

  let focusHeader;
  switch (view) {
    case VIEW.edit:
      focusHeader = renderEditFocusHeader();
      break;
    case VIEW.comments:
      focusHeader = renderCommentsFocusHeader();
      break;
    case VIEW.history:
      focusHeader = renderHistoryFocusHeader();
      break;
    default:
      focusHeader = null;
      break;
  }

  return (
    <RoomMediaContextProvider context={initialState.roomMediaContext}>
      <PageTemplate alerts={alerts} focusHeader={focusHeader}>
        <div className="DocumentPage" ref={pageRef}>
          {!!room && (
            <Breadcrumb className="Breadcrumbs">
              <Breadcrumb.Item href={routes.getDashboardUrl({ tab: 'rooms' })}>{t('common:roomsBreadcrumbPart')}</Breadcrumb.Item>
              <Breadcrumb.Item href={routes.getRoomUrl(room._id, room.slug)}>{room.name}</Breadcrumb.Item>
              <Breadcrumb.Item>{doc.title}</Breadcrumb.Item>
            </Breadcrumb>
          )}
          <div className="DocumentPage-badges">
            {!!doc.publicContext?.verified && (
              <Tooltip title={t('common:verifiedDocumentBadge')}>
                <LikeOutlined className="u-large-badge" />
              </Tooltip>
            )}
          </div>
          <div ref={sectionsWrapperRef}>
            <SectionsDisplay
              sections={view === VIEW.history ? selectedHistoryRevision?.sections || [] : currentSections}
              pendingSectionKeys={pendingTemplateSectionKeys}
              editedSectionKeys={editedSectionKeys}
              canEdit={view === VIEW.edit}
              canHardDelete={!!userCanHardDelete && view === VIEW.history}
              onPendingSectionApply={handlePendingSectionApply}
              onPendingSectionDiscard={handlePendingSectionDiscard}
              onSectionContentChange={handleSectionContentChange}
              onSectionCopyToClipboard={handleSectionCopyToClipboard}
              onSectionPasteFromClipboard={handleSectionPasteFromClipboard}
              onSectionMove={handleSectionMove}
              onSectionInsert={handleSectionInsert}
              onSectionDuplicate={handleSectionDuplicate}
              onSectionDelete={handleSectionDelete}
              onSectionHardDelete={handleSectionHardDelete}
              onSectionEditEnter={handleSectionEditEnter}
              onSectionEditLeave={handleSectionEditLeave}
              />
          </div>
          <CreditsFooter doc={selectedHistoryRevision ? null : doc} revision={selectedHistoryRevision} />

          {view === VIEW.comments && !!isMounted.current && (
            <section ref={commentsSectionRef} className="DocumentPage-commentsSection">
              <div className="DocumentPage-commentsSectionHeader">{t('comments')}</div>
              <CommentsPanel
                comments={comments}
                isLoading={!areCommentsInitiallyLoaded}
                onCommentPostClick={handleCommentPostClick}
                onCommentDeleteClick={handleCommentDeleteClick}
                onTopicChangeClick={handleCommentsTopicChangeClick}
                />
            </section>
          )}
        </div>
      </PageTemplate>
      {!!actionsPanelPositionInPx && view === VIEW.display && (
        <div className="DocumentPage-actionsPanelWrapper">
          <FloatButton.Group shape="square" style={{ ...actionsPanelPositionInPx }} className="DocumentPage-actionsPanel">
            <FloatButton icon={<FavoriteStar tooltipPlacement="left" type={FAVORITE_TYPE.document} id={doc._id} />} />
            <Tooltip placement="left" title={t('duplicateDocument')}>
              <FloatButton icon={<DuplicateIcon />} disabled={!userCanEdit} onClick={() => handleDocumentCloneClick()} />
            </Tooltip>
            <Tooltip placement="left" title={t('history')}>
              <FloatButton onClick={handleHistoryOpen} icon={<HistoryIcon />} />
            </Tooltip>
            <Tooltip placement="left" title={t('comments')}>
              <FloatButton icon={<CommentIcon />} onClick={handleCommentsOpen} />
            </Tooltip>
            <Tooltip placement="left" title={!userCanEdit || !userCanEditDoc ? editDocRestrictionTooltip : t('common:edit')}>
              <FloatButton icon={<EditDocIcon />} disabled={!userCanEdit || !userCanEditDoc} onClick={handleEditOpen} />
            </Tooltip>
          </FloatButton.Group>
        </div>
      )}

      <DocumentMetadataModal
        {...documentMetadataModalState}
        onSave={handleDocumentMetadataModalSave}
        onClose={handleDocumentMetadataModalClose}
        />
    </RoomMediaContextProvider>
  );
}

Document.propTypes = {
  PageTemplate: PropTypes.func.isRequired,
  initialState: PropTypes.shape({
    doc: documentShape.isRequired,
    templateSections: PropTypes.arrayOf(sectionShape),
    room: roomShape,
    roomMediaContext: roomMediaContextShape
  }).isRequired
};

Document.clientPreloader = DocumentPreloader;

export default Document;
