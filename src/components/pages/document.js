import PropTypes from 'prop-types';
import classNames from 'classnames';
import routes from '../../utils/routes.js';
import Logger from '../../common/logger.js';
import { useUser } from '../user-context.js';
import FocusHeader from '../focus-header.js';
import FavoriteStar from '../favorite-star.js';
import { useTranslation } from 'react-i18next';
import uniqueId from '../../utils/unique-id.js';
import { ALERT_TYPE } from '../custom-alert.js';
import CreditsFooter from '../credits-footer.js';
import cloneDeep from '../../utils/clone-deep.js';
import { useRequest } from '../request-context.js';
import EditIcon from '../icons/general/edit-icon.js';
import SaveIcon from '../icons/general/save-icon.js';
import { useService } from '../container-context.js';
import SectionsDisplay from '../sections-display.js';
import { useBeforeunload } from 'react-beforeunload';
import InputsIcon from '../icons/general/inputs-icon.js';
import HistoryIcon from '../icons/general/history-icon.js';
import CommentIcon from '../icons/general/comment-icon.js';
import PluginRegistry from '../../plugins/plugin-registry.js';
import DocumentInputsPanel from '../document-inputs-panel.js';
import DuplicateIcon from '../icons/general/duplicate-icon.js';
import DocumentCommentsPanel from '../document-comments-panel.js';
import DocumentMetadataModal from '../document-metadata-modal.js';
import { ensureKeyIsExcluded } from '../../utils/object-utils.js';
import { useSessionAwareApiClient } from '../../ui/api-helper.js';
import DocumentVersionHistory from '../document-version-history.js';
import { supportsClipboardPaste } from '../../ui/browser-helper.js';
import { RoomMediaContextProvider } from '../room-media-context.js';
import { handleApiError, handleError } from '../../ui/error-helper.js';
import { Breadcrumb, Button, message, Tooltip, FloatButton } from 'antd';
import DocumentApiClient from '../../api-clients/document-api-client.js';
import { useDebouncedFetchingState, useIsMounted } from '../../ui/hooks.js';
import permissions, { hasUserPermission } from '../../domain/permissions.js';
import { DOC_VIEW_QUERY_PARAM, FAVORITE_TYPE } from '../../domain/constants.js';
import { DOCUMENT_METADATA_MODAL_MODE } from '../document-metadata-modal-utils.js';
import DocumentInputApiClient from '../../api-clients/document-input-api-client.js';
import DocumentCommentApiClient from '../../api-clients/document-comment-api-client.js';
import { ensurePluginComponentAreLoadedForSections } from '../../utils/plugin-utils.js';
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { documentShape, roomMediaContextShape, roomShape, sectionShape } from '../../ui/default-prop-types.js';
import { ensureIsExcluded, ensureIsIncluded, insertItemAt, moveItem, removeItemAt, replaceItemAt } from '../../utils/array-utils.js';
import { createClipboardTextForSection, createNewSectionFromClipboardText, redactSectionContent } from '../../services/section-helper.js';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CloudOutlined,
  CloudUploadOutlined,
  EyeOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import {
  confirmDiscardUnsavedChanges,
  confirmDocumentRevisionRestoration,
  confirmSectionDelete,
  confirmSectionHardDelete
} from '../confirmation-dialogs.js';
import {
  canEditDocument,
  canRestoreDocumentRevisions,
  findCurrentlyWorkedOnSectionKey,
  getDocumentRevisionVersionInfo,
  getEditDocRestrictionTooltip,
  getFavoriteActionTooltip,
  tryBringSectionIntoView
} from '../../utils/document-utils.js';

const logger = new Logger(import.meta.url);

const VIEW = {
  display: 'display',
  edit: DOC_VIEW_QUERY_PARAM.edit,
  inputs: DOC_VIEW_QUERY_PARAM.inputs,
  history: DOC_VIEW_QUERY_PARAM.history,
  comments: DOC_VIEW_QUERY_PARAM.comments
};

const createEmptyInputsForSections = (sections, pluginRegistry) => {
  return sections.reduce((inputs, section) => {
    const plugin = pluginRegistry.getRegisteredPlugin(section.type);
    if (plugin?.info.allowsInput && !section.deletedOn) {
      inputs[section.key] = null;
    }
    return inputs;
  }, {});
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

function getDocumentMetadataModalState({ t, doc, room, user, isCloning, isOpen = false }) {
  return {
    isOpen,
    mode: isCloning ? DOCUMENT_METADATA_MODAL_MODE.clone : DOCUMENT_METADATA_MODAL_MODE.update,
    documentToClone: isCloning ? doc : null,
    allowMultiple: false,
    allowDraft: !!room && room.ownedBy === user?._id,
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
  const headerRef = useRef(null);
  const isMounted = useIsMounted();
  const commentsSectionRef = useRef(null);
  const { t } = useTranslation('document');
  const pluginRegistry = useService(PluginRegistry);
  const documentApiClient = useSessionAwareApiClient(DocumentApiClient);
  const documentInputApiClient = useSessionAwareApiClient(DocumentInputApiClient);
  const documentCommentApiClient = useSessionAwareApiClient(DocumentCommentApiClient);

  const { room } = initialState;

  const getInitialSections = () => initialState.templateSections?.length
    ? initialState.templateSections
    : initialState.doc.sections;

  const userCanEdit = hasUserPermission(user, permissions.CREATE_CONTENT);
  const userCanEditDocument = canEditDocument({ user, doc: initialState.doc, room });
  const userCanHardDelete = hasUserPermission(user, permissions.MANAGE_PUBLIC_CONTENT);
  const userCanRestoreDocumentRevisions = canRestoreDocumentRevisions({ user, doc: initialState.doc, room });

  const documentContainsInputPlugins = true;
  const userIsRoomOwner = !!room && room.ownedBy === user?._id;
  const userCanManageInputs = !!room && documentContainsInputPlugins;

  const favoriteActionTooltip = getFavoriteActionTooltip({ t, user, doc: initialState.doc });
  const editDocRestrictionTooltip = getEditDocRestrictionTooltip({ t, user, doc: initialState.doc, room });

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [doc, setDoc] = useState(initialState.doc);
  const [lastViewInfo, setLastViewInfo] = useState(null);
  const [documentInputs, setDocumentInputs] = useState([]);
  const [documentComments, setDocumentComments] = useState([]);
  const [editedSectionKeys, setEditedSectionKeys] = useState([]);
  const [isSidePanelMinimized, setIsSidePanelMinimized] = useState(false);
  const [sidePanelPositionInPx, setSidePanelPositionInPx] = useState(null);
  const [documentInputRevisions, setDocumentInputRevisions] = useState([]);
  const [view, setView] = useState(determineInitialViewState(request).view);
  // eslint-disable-next-line no-unused-vars
  const [hasPendingInputChanges, setHasPendingInputChanges] = useState(false);
  const [historyDocumentRevisions, setHistoryDocumentRevisions] = useState([]);
  const [inputsPanelPositionInPx, setInputsPanelPositionInPx] = useState(null);
  const [actionsPanelPositionInPx, setActionsPanelPositionInPx] = useState(null);
  const [verifiedBadgePositionInPx, setVerifiedBadgePositionInPx] = useState(null);
  const [initialDocumentInputsFetched, setInitialDocumentInputsFetched] = useState(false);
  const [preSetView, setPreSetView] = useState(determineInitialViewState(request).preSetView);
  const [initialDocumentCommentsFetched, setInitialDocumentCommentsFetched] = useState(false);
  const [historySelectedDocumentRevision, setHistorySelectedDocumentRevision] = useState(null);
  const [initialDocumentRevisionsFetched, setInitialDocumentRevisionsFetched] = useState(false);
  const [fetchingInitialComments, setFetchingInitialComments] = useDebouncedFetchingState(true);
  const [currentSections, setCurrentSections] = useState(() => cloneDeep(getInitialSections()));
  const [documentMetadataModalState, setDocumentMetadataModalState] = useState(getDocumentMetadataModalState({ t }));
  const [pendingTemplateSectionKeys, setPendingTemplateSectionKeys] = useState((initialState.templateSections || []).map(s => s.key));
  const [pendingInputValues, setPendingInputValues] = useState(() => createEmptyInputsForSections(getInitialSections(), pluginRegistry));

  const [alerts, setAlerts] = useState(createPageAlerts({
    t,
    doc,
    view,
    hasPendingTemplateSectionKeys: !!pendingTemplateSectionKeys.length
  }));

  const isVerifiedDocument = useMemo(() => doc.publicContext?.verified, [doc.publicContext]);

  const focusHeaderHistoryInfo = useMemo(() => {
    if (!historySelectedDocumentRevision) {
      return null;
    }

    const versionInfo = getDocumentRevisionVersionInfo(historyDocumentRevisions, historySelectedDocumentRevision._id);
    return versionInfo.isLatestVersion ? t('latestHistoryVersion') : t('historyVersion', { version: versionInfo.version });
  }, [historyDocumentRevisions, historySelectedDocumentRevision, t]);

  useBeforeunload(event => {
    if (isDirty) {
      event.preventDefault();
    }
  });

  const switchView = (newView, displayedDocumentRevision = null) => {
    setLastViewInfo({ view, sectionKeyToScrollTo: findCurrentlyWorkedOnSectionKey() });
    setPreSetView(null);
    setView(newView);

    setPendingInputValues(createEmptyInputsForSections(displayedDocumentRevision?.sections ?? currentSections, pluginRegistry));
    setHasPendingInputChanges(false);
  };

  const ensureActionsPanelPosition = useCallback(() => {
    if (view !== VIEW.display) {
      return;
    }

    const windowWidth = Math.min(window.innerWidth, window.outerWidth);
    const pageBoundingRect = pageRef.current.getBoundingClientRect();

    const fixedItemsLeftOffset = 40;
    const reservedFixedItemsWidth = 40;
    const left = pageBoundingRect.left + pageBoundingRect.width + fixedItemsLeftOffset;

    const fixedItemsPosition = {
      top: 130,
      right: left + reservedFixedItemsWidth >= windowWidth ? 0 : 'unset',
      left: left + reservedFixedItemsWidth >= windowWidth ? 'unset' : left
    };

    const actionsPanelTopOffset = isVerifiedDocument ? 50 : 0;
    const actualItemsPosition = {
      ...fixedItemsPosition,
      top: fixedItemsPosition.top + actionsPanelTopOffset
    };

    setVerifiedBadgePositionInPx(fixedItemsPosition);
    setActionsPanelPositionInPx(actualItemsPosition);
  }, [view, isVerifiedDocument, pageRef]);

  const ensureInputsPanelPosition = useCallback(() => {
    if (view !== VIEW.display || !actionsPanelPositionInPx) {
      return;
    }

    const position = {
      top: actionsPanelPositionInPx.top + 220,
      right: actionsPanelPositionInPx.right,
      left: actionsPanelPositionInPx.left
    };

    setInputsPanelPositionInPx(position);
  }, [view, actionsPanelPositionInPx]);

  const ensureSidePanelPosition = useCallback(() => {
    if (view !== VIEW.history && view !== VIEW.inputs) {
      return;
    }

    const headerBoundingRect = headerRef.current.getBoundingClientRect();

    const verticalPadding = 10;
    const top = headerBoundingRect.height + verticalPadding;
    const height = window.innerHeight - top - verticalPadding;

    setSidePanelPositionInPx({ top, height });
  }, [view, headerRef]);

  useEffect(() => {
    ensureActionsPanelPosition();
    window.addEventListener('resize', ensureActionsPanelPosition);

    return () => window.removeEventListener('resize', ensureActionsPanelPosition);
  }, [ensureActionsPanelPosition]);

  useEffect(() => {
    ensureInputsPanelPosition();
    window.addEventListener('resize', ensureInputsPanelPosition);

    return () => window.removeEventListener('resize', ensureInputsPanelPosition);
  }, [ensureInputsPanelPosition]);

  useEffect(() => {
    ensureSidePanelPosition();
    window.addEventListener('resize', ensureSidePanelPosition);

    return () => window.removeEventListener('resize', ensureSidePanelPosition);
  }, [ensureSidePanelPosition]);

  useEffect(() => {
    if (view !== VIEW.comments && lastViewInfo?.view !== VIEW.comments && lastViewInfo?.sectionKeyToScrollTo) {
      setTimeout(() => tryBringSectionIntoView(lastViewInfo.sectionKeyToScrollTo), 500);
    }

    if (view === VIEW.comments) {
      setTimeout(() => commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [view, lastViewInfo, commentsSectionRef]);

  const fetchDocumentComments = useCallback(async () => {
    try {
      const response = await documentCommentApiClient.getAllDocumentComments({ documentId: doc._id });
      setFetchingInitialComments(false);
      setDocumentComments(response.documentComments);
    } catch (error) {
      handleApiError({ error, t, logger });
    }
  }, [setFetchingInitialComments, doc, documentCommentApiClient, t]);

  const fetchDocumentRevisions = useCallback(async () => {
    try {
      const { documentRevisions } = await documentApiClient.getDocumentRevisions(doc._id);
      const latestDocumentRevision = documentRevisions[documentRevisions.length - 1];

      setHistoryDocumentRevisions(documentRevisions);
      setHistorySelectedDocumentRevision(latestDocumentRevision);
      setHasPendingInputChanges(false);
      setPendingInputValues(createEmptyInputsForSections(latestDocumentRevision.sections, pluginRegistry));
    } catch (error) {
      handleApiError({ error, t, logger });
    }
  }, [doc._id, t, documentApiClient, pluginRegistry]);

  const fetchDocumentInputs = useCallback(async () => {
    try {
      const response = userIsRoomOwner
        ? await documentInputApiClient.getDocumentInputsByDocumentId(doc._id)
        : await documentInputApiClient.getDocumentInputsCreatedByUser(user._id);

      const { documentRevisions } = await documentApiClient.getDocumentRevisions(doc._id);

      setDocumentInputs(response.documentInputs);
      setDocumentInputRevisions(documentRevisions);
    } catch (error) {
      handleApiError({ error, t, logger });
    }
  }, [doc._id, t, user, userIsRoomOwner, documentInputApiClient, documentApiClient]);

  useEffect(() => {
    setAlerts(createPageAlerts({
      t,
      doc,
      docRevision: historySelectedDocumentRevision,
      view,
      hasPendingTemplateSectionKeys: !!pendingTemplateSectionKeys.length
    }));
  }, [doc, historySelectedDocumentRevision, view, pendingTemplateSectionKeys, t]);

  useEffect(() => {
    if (preSetView === VIEW.history && !initialDocumentRevisionsFetched) {
      (async () => {
        await fetchDocumentRevisions();
        setInitialDocumentRevisionsFetched(true);
      })();
    }

    if (preSetView === VIEW.comments && !initialDocumentCommentsFetched) {
      (async () => {
        await fetchDocumentComments();
        setInitialDocumentCommentsFetched(true);
      })();
    }

    if (preSetView === VIEW.inputs && !initialDocumentInputsFetched) {
      (async () => {
        await fetchDocumentInputs();
        setInitialDocumentInputsFetched(true);
      })();
    }
  }, [preSetView, doc._id, view, fetchDocumentRevisions, fetchDocumentComments, fetchDocumentInputs, initialDocumentRevisionsFetched, initialDocumentCommentsFetched, initialDocumentInputsFetched]);

  useEffect(() => {
    const viewQueryValue = view === VIEW.display ? null : view;
    history.replaceState(null, '', routes.getDocUrl({ id: doc._id, slug: doc.slug, view: viewQueryValue }));
  }, [user, doc._id, doc.slug, view]);

  const handleEditMetadataOpen = () => {
    setDocumentMetadataModalState(getDocumentMetadataModalState({ t, doc, room, user, isCloning: false, isOpen: true }));
  };

  const handleDocumentCloneClick = () => {
    setDocumentMetadataModalState(getDocumentMetadataModalState({ t, doc, room, user, isCloning: true, isOpen: true }));
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
      const newCurrentSections = cloneDeep(mergedSections);

      setIsDirty(false);
      setDoc(updatedDoc);
      setCurrentSections(newCurrentSections);
      setHasPendingInputChanges(false);
      setPendingInputValues(createEmptyInputsForSections(newCurrentSections, pluginRegistry));
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

  const handleDocumentCommentsOpen = async () => {
    setFetchingInitialComments(true);
    switchView(VIEW.comments);
    await fetchDocumentComments();
  };

  const handleDocumentCommentsClose = () => {
    switchView(VIEW.display);
    setDocumentComments([]);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    return true;
  };

  const handleHistoryOpen = async () => {
    try {
      const { documentRevisions } = await documentApiClient.getDocumentRevisions(doc._id);
      const latestDocumentRevision = documentRevisions[documentRevisions.length - 1];

      setHistoryDocumentRevisions(documentRevisions);
      setHistorySelectedDocumentRevision(latestDocumentRevision);
      setIsSidePanelMinimized(false);
      switchView(VIEW.history, latestDocumentRevision);
    } catch (error) {
      handleApiError({ error, t, logger });
    }
  };

  const handleHistoryClose = () => {
    setHistoryDocumentRevisions([]);
    setHistorySelectedDocumentRevision(null);
    switchView(VIEW.display);
    return true;
  };

  const handleInputsOpen = async () => {
    await fetchDocumentInputs();
    switchView(VIEW.inputs);
  };

  const handleInputsClose = () => {
    setDocumentInputs([]);
    setDocumentInputRevisions([]);
    switchView(VIEW.display);
    return true;
  };

  const handleSectionInputChange = useCallback((sectionKey, newInputs) => {
    setPendingInputValues(oldInputs => ({ ...oldInputs, [sectionKey]: newInputs }));
    setHasPendingInputChanges(true);
  }, []);

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
    if (plugin.info.allowsInput) {
      setPendingInputValues(oldInputs => ({ ...oldInputs, [newSection.key]: null }));
    }
    setIsDirty(true);
  }, [currentSections, pluginRegistry, t]);

  const handleSectionDuplicate = useCallback(index => {
    const originalSection = currentSections[index];
    const duplicatedSection = cloneDeep(originalSection);
    duplicatedSection.key = uniqueId.create();

    const expandedSections = insertItemAt(currentSections, duplicatedSection, index + 1);
    setCurrentSections(expandedSections);
    const plugin = pluginRegistry.getRegisteredPlugin(duplicatedSection.type);
    if (plugin.info.allowsInput) {
      setPendingInputValues(oldInputs => ({ ...oldInputs, [duplicatedSection.key]: null }));
    }
    setIsDirty(true);
    setEditedSectionKeys(keys => ensureIsIncluded(keys, duplicatedSection.key));
  }, [currentSections, pluginRegistry]);

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
      const plugin = pluginRegistry.getRegisteredPlugin(newSection.type);
      if (!plugin) {
        throw new Error(`Plugin '${newSection.type}' is not a registered plugin`);
      }

      const redactedSection = redactSectionContent({ section: newSection, pluginRegistry, targetRoomId });
      const newSections = insertItemAt(currentSections, redactedSection, index);
      setCurrentSections(newSections);
      if (plugin.info.allowsInput) {
        setPendingInputValues(oldInputs => ({ ...oldInputs, [redactedSection.key]: null }));
      }
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
        setPendingInputValues(oldInputs => ensureKeyIsExcluded(oldInputs, section.key));
        setIsDirty(true);
      }
    );
  }, [currentSections, t]);

  const handleSectionEditEnter = useCallback(index => {
    const section = currentSections[index];
    setEditedSectionKeys(keys => ensureIsIncluded(keys, section.key));
    setPendingInputValues(oldInputs => oldInputs[section.key] ? { ...oldInputs, [section.key]: null } : oldInputs);
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
    setPendingInputValues(oldInputs => ensureKeyIsExcluded(oldInputs, discardedSection.key));
    setIsDirty(true);
  }, [currentSections]);

  const handleSidePanelToggleClick = () => {
    setIsSidePanelMinimized(!isSidePanelMinimized);
  };

  const handleViewDocumentRevisionClick = documentRevisionId => {
    const documentRevisionToView = historyDocumentRevisions.find(r => r._id === documentRevisionId);
    setHistorySelectedDocumentRevision(documentRevisionToView);
    setHasPendingInputChanges(false);
    setPendingInputValues(createEmptyInputsForSections(documentRevisionToView.sections, pluginRegistry));
  };

  const handleRestoreDocumentRevisionClick = ({ documentRevisionId, documentId }) => {
    confirmDocumentRevisionRestoration(
      t,
      historySelectedDocumentRevision,
      async () => {
        try {
          const { document: updatedDoc, documentRevisions } = await documentApiClient.restoreDocumentRevision({
            documentId,
            revisionId: documentRevisionId
          });
          const latestDocumentRevision = documentRevisions[documentRevisions.length - 1];

          setDoc(updatedDoc);
          setCurrentSections(updatedDoc.sections);
          setHistoryDocumentRevisions(documentRevisions);
          setHistorySelectedDocumentRevision(latestDocumentRevision);
          setHasPendingInputChanges(false);
          setPendingInputValues(createEmptyInputsForSections(latestDocumentRevision.sections, pluginRegistry));
        } catch (error) {
          handleApiError({ error, logger, t });
          throw error;
        }
      }
    );
  };

  const hardDeleteSection = useCallback(async ({ revisionId, section, reason, deleteAllRevisions }) => {
    const documentId = doc._id;
    const sectionKey = section.key;
    const sectionRevision = section.revision;

    try {
      const { document: updatedDoc } = await documentApiClient.hardDeleteSection({ documentId, sectionKey, sectionRevision, reason, deleteAllRevisions });

      setDoc(updatedDoc);
      setCurrentSections(updatedDoc.sections);

      const { documentRevisions } = await documentApiClient.getDocumentRevisions(documentId);
      const latestDocumentRevision = documentRevisions[documentRevisions.length - 1];
      const newSelectedDocumentRevision = documentRevisions.find(r => r._id === revisionId) || latestDocumentRevision;

      setHistoryDocumentRevisions(documentRevisions);
      setHistorySelectedDocumentRevision(newSelectedDocumentRevision);

      const currentlyVisibleSections = view === VIEW.history ? newSelectedDocumentRevision.sections : updatedDoc.sections;
      setPendingInputValues(createEmptyInputsForSections(currentlyVisibleSections, pluginRegistry));
      setHasPendingInputChanges(false);
    } catch (error) {
      handleApiError({ error, logger, t });
    }
  }, [view, doc, documentApiClient, pluginRegistry, t]);

  const handleSectionHardDelete = useCallback(index => {
    confirmSectionHardDelete(
      t,
      async ({ reason, deleteAllRevisions }) => {
        const revisionId = historySelectedDocumentRevision._id;
        const section = historySelectedDocumentRevision.sections[index];
        await hardDeleteSection({ revisionId, section, reason, deleteAllRevisions });
      }
    );
  }, [hardDeleteSection, historySelectedDocumentRevision, t]);

  const handleDocumentCommentPostClick = async ({ topic, text }) => {
    try {
      await documentCommentApiClient.addDocumentComment({ documentId: doc._id, topic, text });
      await fetchDocumentComments();
    } catch (error) {
      handleApiError({ error, logger, t });
    }
  };

  const handleDocumentCommentsTopicChangeClick = async ({ oldTopic, newTopic }) => {
    try {
      await documentCommentApiClient.updateDocumentCommentsTopic({ documentId: doc._id, oldTopic, newTopic });
      await fetchDocumentComments();
    } catch (error) {
      handleApiError({ error, logger, t });
    }
  };

  const handleDocumentCommentDeleteClick = async documentCommentId => {
    try {
      await documentCommentApiClient.deleteDocumentComment({ documentCommentId });
      await fetchDocumentComments();
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
    <FocusHeader title={t('comments')} onClose={handleDocumentCommentsClose} />
  );

  const renderHistoryFocusHeader = () => (
    <FocusHeader title={t('history')} onClose={handleHistoryClose}>
      <div className="DocumentPage-focusHeaderVersionHistoryInfo">
        <EyeOutlined />{focusHeaderHistoryInfo}
      </div>
    </FocusHeader>
  );

  const renderInputsFocusHeader = () => (
    <FocusHeader title={t('inputs')} onClose={handleInputsClose} />
  );

  const renderFocusHeader = () => {
    switch (view) {
      case VIEW.edit:
        return renderEditFocusHeader();
      case VIEW.comments:
        return renderCommentsFocusHeader();
      case VIEW.history:
        return renderHistoryFocusHeader();
      case VIEW.inputs:
        return renderInputsFocusHeader();
      default:
        return null;
    }
  };

  return (
    <RoomMediaContextProvider context={initialState.roomMediaContext}>
      <PageTemplate alerts={alerts} focusHeader={renderFocusHeader()} headerRef={headerRef} contentRef={pageRef}>
        <div className={classNames('DocumentPage', { 'DocumentPage--sidePanelView': (view === VIEW.history || view === VIEW.inputs) && !isSidePanelMinimized })}>
          <div className="DocumentPage-document">
            {!!room && (
              <Breadcrumb
                className="Breadcrumbs"
                items={[
                  {
                    title: t('common:roomsBreadcrumbPart'),
                    href: routes.getDashboardUrl({ tab: 'rooms' })
                  }, {
                    title: room.name,
                    href: routes.getRoomUrl({ id: room._id, slug: room.slug })
                  }, {
                    title: doc.title
                  }
                ]}
                />
            )}

            <div>
              <SectionsDisplay
                inputs={pendingInputValues}
                sections={view === VIEW.history ? historySelectedDocumentRevision?.sections || [] : currentSections}
                pendingSectionKeys={pendingTemplateSectionKeys}
                editedSectionKeys={editedSectionKeys}
                canEdit={view === VIEW.edit}
                canHardDelete={!!userCanHardDelete && view === VIEW.history}
                onPendingSectionApply={handlePendingSectionApply}
                onPendingSectionDiscard={handlePendingSectionDiscard}
                onSectionContentChange={handleSectionContentChange}
                onSectionInputChange={handleSectionInputChange}
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
            <CreditsFooter doc={historySelectedDocumentRevision ? null : doc} revision={historySelectedDocumentRevision} />

            {view === VIEW.comments && !!isMounted.current && (
              <section ref={commentsSectionRef} className="DocumentPage-commentsSection">
                <div className="DocumentPage-commentsSectionHeader">{t('comments')}</div>
                <DocumentCommentsPanel
                  documentComments={documentComments}
                  isLoading={fetchingInitialComments}
                  onDocumentCommentPostClick={handleDocumentCommentPostClick}
                  onDocumentCommentDeleteClick={handleDocumentCommentDeleteClick}
                  onTopicChangeClick={handleDocumentCommentsTopicChangeClick}
                  />
              </section>
            )}
          </div>
        </div>
      </PageTemplate>

      {(view === VIEW.history || view === VIEW.inputs) && (
        <div
          style={{ ...sidePanelPositionInPx }}
          className={classNames('DocumentPage-sidePanel', { 'is-minimized': isSidePanelMinimized })}
          >
          <div className="DocumentPage-sidePanelContentWrapper">
            <div className="DocumentPage-sidePanelContentToggle" onClick={handleSidePanelToggleClick}>
              {isSidePanelMinimized ? <ArrowLeftOutlined /> : <ArrowRightOutlined />}
            </div>
            <div className="DocumentPage-sidePanelContent">
              {view === VIEW.history && (
                <DocumentVersionHistory
                  canRestore={userCanRestoreDocumentRevisions}
                  documentRevisions={historyDocumentRevisions}
                  selectedDocumentRevision={historySelectedDocumentRevision}
                  onViewClick={handleViewDocumentRevisionClick}
                  onRestoreClick={handleRestoreDocumentRevisionClick}
                  />
              )}
              {view === VIEW.inputs && (
                <DocumentInputsPanel
                  showUsers={!!userIsRoomOwner}
                  documentInputs={documentInputs}
                  documentRevisions={documentInputRevisions}
                  />
              )}
            </div>
          </div>
        </div>
      )}

      {!!actionsPanelPositionInPx && view === VIEW.display && (
        <Fragment>
          {!!isVerifiedDocument && (
            <div className="DocumentPage-verifiedBadge" style={{ ...verifiedBadgePositionInPx }}>
              <Tooltip title={t('common:verifiedDocumentBadge')} placement="left">
                <SafetyCertificateOutlined />
              </Tooltip>
            </div>
          )}
          <div className="DocumentPage-actionsPanelWrapper">
            <FloatButton.Group shape="square" style={{ ...actionsPanelPositionInPx }}>
              <FloatButton
                disabled={!user}
                tooltip={favoriteActionTooltip}
                icon={<FavoriteStar useTooltip={false} type={FAVORITE_TYPE.document} id={doc._id} disabled={!user} />}
                />
              <FloatButton
                icon={<DuplicateIcon />}
                disabled={!userCanEdit}
                tooltip={userCanEdit ? t('duplicateDocument') : t('duplicateRestrictionTooltip')}
                onClick={() => handleDocumentCloneClick()}
                />
              <FloatButton
                icon={<HistoryIcon />}
                tooltip={t('historyActionTooltip')}
                onClick={handleHistoryOpen}
                />
              <FloatButton
                icon={<CommentIcon />}
                tooltip={t('commentsActionTooltip')}
                onClick={handleDocumentCommentsOpen}
                />
              <FloatButton
                icon={<EditIcon />}
                disabled={!userCanEdit || !userCanEditDocument}
                tooltip={!userCanEdit || !userCanEditDocument ? editDocRestrictionTooltip : t('editDocument')}
                onClick={handleEditOpen}
                />
            </FloatButton.Group>
            {!!userCanManageInputs && (
              <FloatButton.Group shape="square" style={{ ...inputsPanelPositionInPx }}>
                <FloatButton
                  className="DocumentPage-inputsPanelButton"
                  icon={<InputsIcon />}
                  tooltip={t('inputsActionTooltip')}
                  onClick={handleInputsOpen}
                  />
              </FloatButton.Group>
            )}
          </div>
        </Fragment>
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
