import by from 'thenby';
import PropTypes from 'prop-types';
import routes from '../../utils/routes.js';
import { useUser } from '../user-context.js';
import { InputsIcon } from '../icons/icons.js';
import { useTranslation } from 'react-i18next';
import urlUtils from '../../utils/url-utils.js';
import RoomsTab from '../dashboard/rooms-tab.js';
import { BellOutlined } from '@ant-design/icons';
import { useRequest } from '../request-context.js';
import { Avatar, Badge, Tabs, Tooltip } from 'antd';
import RoomIcon from '../icons/general/room-icon.js';
import StarIcon from '../icons/general/star-icon.js';
import StorageTab from '../dashboard/storage-tab.js';
import FileIcon from '../icons/general/file-icon.js';
import SettingsTab from '../dashboard/settings-tab.js';
import FavoritesTab from '../dashboard/favorites-tab.js';
import DocumentsTab from '../dashboard/documents-tab.js';
import ActivitiesTab from '../dashboard/activities-tab.js';
import HistoryIcon from '../icons/general/history-icon.js';
import PrivateIcon from '../icons/general/private-icon.js';
import { useDebouncedFetchingState } from '../../ui/hooks.js';
import SettingsIcon from '../icons/main-menu/settings-icon.js';
import React, { useCallback, useEffect, useState } from 'react';
import UserApiClient from '../../api-clients/user-api-client.js';
import RoomApiClient from '../../api-clients/room-api-client.js';
import NotificationsTab from '../dashboard/notifications-tab.js';
import { useSessionAwareApiClient } from '../../ui/api-helper.js';
import DocumentInputsTab from '../dashboard/document-inputs-tab.js';
import DocumentApiClient from '../../api-clients/document-api-client.js';
import NotificationsApiClient from '../../api-clients/notifications-api-client.js';
import DocumentInputApiClient from '../../api-clients/document-input-api-client.js';
import { AVATAR_SIZE_BIG, FAVORITE_TYPE, ROOM_USER_ROLE } from '../../domain/constants.js';
import { useNotificationsCount, useSetNotificationsCount } from '../notification-context.js';

const TAB_KEYS = {
  activities: 'activities',
  favorites: 'favorites',
  documents: 'documents',
  rooms: 'rooms',
  documentInputs: 'document-inputs',
  notifications: 'notifications',
  storage: 'storage',
  settings: 'settings'
};

function Dashboard({ PageTemplate }) {
  const user = useUser();
  const request = useRequest();
  const { t } = useTranslation('dashboard');
  const notificationsCount = useNotificationsCount();
  const setNotificationsCount = useSetNotificationsCount();
  const userApiClient = useSessionAwareApiClient(UserApiClient);
  const roomApiClient = useSessionAwareApiClient(RoomApiClient);
  const documentApiClient = useSessionAwareApiClient(DocumentApiClient);
  const notificationsApiClient = useSessionAwareApiClient(NotificationsApiClient);
  const documentInputApiClient = useSessionAwareApiClient(DocumentInputApiClient);

  const initialTab = request.query.tab || TAB_KEYS.activities;
  const gravatarUrl = urlUtils.getGravatarUrl(user.email);

  const [rooms, setRooms] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [favoriteUsers, setFavoriteUsers] = useState([]);
  const [favoriteRooms, setFavoriteRooms] = useState([]);
  const [documentInputs, setDocumentInputs] = useState([]);
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [favoriteDocuments, setFavoriteDocuments] = useState([]);
  const [notificationGroups, setNotificationGroups] = useState([]);
  const [allRoomMediaOverview, setAllRoomMediaOverview] = useState(null);
  const [fetchingRooms, setFetchingRooms] = useDebouncedFetchingState(true);
  const [fetchingDocuments, setFetchingDocuments] = useDebouncedFetchingState(true);
  const [fetchingFavorites, setFetchingFavorites] = useDebouncedFetchingState(true);
  const [fetchingActivities, setFetchingActivities] = useDebouncedFetchingState(true);
  const [fetchingDocumentInputs, setFetchingDocumentInputs] = useDebouncedFetchingState(true);
  const [fetchingNotificationGroups, setFetchingNotificationGroups] = useDebouncedFetchingState(true);
  const [fetchingAllRoomMediaOverview, setFetchingAllRoomMediaOverview] = useDebouncedFetchingState(true);

  const fetchActivities = useCallback(async () => {
    try {
      setFetchingActivities(true);
      const response = await userApiClient.getActivities();
      setActivities(response.activities);
    } finally {
      setFetchingActivities(false);
    }
  }, [setFetchingActivities, userApiClient]);

  const fetchNotifications = useCallback(async () => {
    try {
      setFetchingNotificationGroups(true);
      const response = await notificationsApiClient.getNotificationGroups();
      setNotificationGroups(response.notificationGroups);
    } finally {
      setFetchingNotificationGroups(false);
    }
  }, [setFetchingNotificationGroups, notificationsApiClient]);

  const fetchFavorites = useCallback(async () => {
    try {
      setFetchingFavorites(true);
      const response = await userApiClient.getFavorites();
      const sortedFavorites = response.favorites.sort(by(f => f.setOn, 'desc'));
      setFavoriteUsers(sortedFavorites.filter(favorite => favorite.type === FAVORITE_TYPE.user));
      setFavoriteRooms(sortedFavorites.filter(favorite => favorite.type === FAVORITE_TYPE.room));
      setFavoriteDocuments(sortedFavorites.filter(favorite => favorite.type === FAVORITE_TYPE.document));
    } finally {
      setFetchingFavorites(false);
    }
  }, [setFetchingFavorites, userApiClient]);

  const fetchDocuments = useCallback(async () => {
    try {
      setFetchingDocuments(true);
      const documentApiClientResponse = await documentApiClient.getPublicNonArchivedDocumentsByContributingUser(user._id);
      setDocuments(documentApiClientResponse.documents);
    } finally {
      setFetchingDocuments(false);
    }
  }, [user._id, setFetchingDocuments, documentApiClient]);

  const fetchRooms = useCallback(async () => {
    try {
      setFetchingRooms(true);
      const roomApiClientResponse = await roomApiClient.getRooms({ userRole: ROOM_USER_ROLE.ownerOrMember });
      const userApiClientResponse = await userApiClient.getRoomsInvitations();
      setRooms(roomApiClientResponse.rooms);
      setInvitations(userApiClientResponse.invitations);
    } finally {
      setFetchingRooms(false);
    }
  }, [setFetchingRooms, roomApiClient, userApiClient]);

  const fetchRoomMediaOverview = useCallback(async () => {
    try {
      setFetchingAllRoomMediaOverview(true);
      const overview = await roomApiClient.getAllRoomMediaOverview();
      setAllRoomMediaOverview(overview);
    } finally {
      setFetchingAllRoomMediaOverview(false);
    }
  }, [setFetchingAllRoomMediaOverview, roomApiClient]);

  const fetchDocumentInputs = useCallback(async () => {
    try {
      setFetchingDocumentInputs(true);
      const documentInputApiClientResponse = await documentInputApiClient.getAllDocumentInputsCreatedByUser(user._id);
      setDocumentInputs(documentInputApiClientResponse.documentInputs);
    } finally {
      setFetchingDocumentInputs(false);
    }
  }, [user._id, setFetchingDocumentInputs, documentInputApiClient]);

  useEffect(() => {
    (async () => {
      switch (selectedTab) {
        case TAB_KEYS.activities:
          await fetchActivities();
          break;
        case TAB_KEYS.favorites:
          await fetchFavorites();
          break;
        case TAB_KEYS.documents:
          await fetchDocuments();
          break;
        case TAB_KEYS.rooms:
          await fetchRooms();
          break;
        case TAB_KEYS.documentInputs:
          await fetchDocumentInputs();
          break;
        case TAB_KEYS.notifications:
          await fetchNotifications();
          break;
        case TAB_KEYS.storage:
          await fetchRoomMediaOverview();
          break;
        default:
          break;
      }
    })();
  }, [selectedTab, fetchActivities, fetchFavorites, fetchDocuments, fetchRooms, fetchDocumentInputs, fetchNotifications, fetchRoomMediaOverview]);

  const handleTabChange = tab => {
    setSelectedTab(tab);
    history.replaceState(null, '', routes.getDashboardUrl({ tab }));
  };

  const handleRemoveNotificationGroup = async notificationGroup => {
    const response = await notificationsApiClient.removeNotifications(notificationGroup.notificationIds);
    setNotificationGroups(response.notificationGroups);
    setNotificationsCount(response.notificationGroups.length);
  };

  const handleRemoveNotifications = async () => {
    const notificationIds = notificationGroups.map(group => group.notificationIds).flat();
    const response = await notificationsApiClient.removeNotifications(notificationIds);
    setNotificationGroups(response.notificationGroups);
    setNotificationsCount(response.notificationGroups.length);
  };

  const handleAllRoomMediaOverviewChange = newStorage => {
    setAllRoomMediaOverview(newStorage);
  };

  const handleDeleteDocumentInput = async documentInput => {
    await documentInputApiClient.hardDeleteDocumentInput(documentInput._id);
    fetchDocumentInputs();
  };

  const items = [
    {
      key: TAB_KEYS.activities,
      label: <div><HistoryIcon />{t('activitiesTabTitle')}</div>,
      children: (
        <div className="Tabs-tabPane">
          <ActivitiesTab activities={activities} loading={fetchingActivities} />
        </div>
      )
    },
    {
      key: TAB_KEYS.favorites,
      label: <div><StarIcon />{t('favoritesTabTitle')}</div>,
      children: (
        <div className="Tabs-tabPane">
          <FavoritesTab
            favoriteUsers={favoriteUsers}
            favoriteRooms={favoriteRooms}
            favoriteDocuments={favoriteDocuments}
            loading={fetchingFavorites}
            />
        </div>
      )
    },
    {
      key: TAB_KEYS.documents,
      label: <div><FileIcon />{t('documentsTabTitle')}</div>,
      children: (
        <div className="Tabs-tabPane">
          <DocumentsTab documents={documents} loading={fetchingDocuments} />
        </div>
      )
    },
    {
      key: TAB_KEYS.rooms,
      label: <div><RoomIcon />{t('roomsTabTitle')}</div>,
      children: (
        <div className="Tabs-tabPane">
          <RoomsTab rooms={rooms} invitations={invitations} loading={fetchingRooms} />
        </div>
      )
    },
    {
      key: TAB_KEYS.documentInputs,
      label: <div><InputsIcon />{t('common:documentInputs')}</div>,
      children: (
        <div className="Tabs-tabPane">
          <DocumentInputsTab
            loading={fetchingDocumentInputs}
            documentInputs={documentInputs}
            onDeleteDocumentInput={handleDeleteDocumentInput}
            />
        </div>
      )
    },
    {
      key: TAB_KEYS.notifications,
      label: (
        <Tooltip title={notificationsCount ? t('common:notificationsTooltip', { count: notificationsCount }) : null}>
          <Badge dot title="" offset={[5, 0]} count={notificationsCount}>
            <div><BellOutlined /> {t('common:notifications')}</div>
          </Badge>
        </Tooltip>
      ),
      children: (
        <div className="Tabs-tabPane">
          <NotificationsTab
            loading={fetchingNotificationGroups}
            notificationGroups={notificationGroups}
            onRemoveNotificationGroup={handleRemoveNotificationGroup}
            onRemoveNotifications={handleRemoveNotifications}
            />
        </div>
      )
    },
    {
      key: TAB_KEYS.storage,
      label: <div><PrivateIcon />{t('common:storage')}</div>,
      children: (
        <div className="Tabs-tabPane">
          <StorageTab
            loading={fetchingAllRoomMediaOverview}
            allRoomMediaOverview={allRoomMediaOverview}
            onAllRoomMediaOverviewChange={handleAllRoomMediaOverviewChange}
            />
        </div>
      )
    },
    {
      key: TAB_KEYS.settings,
      label: <div><SettingsIcon />{t('common:settings')}</div>,
      children: (
        <div className="Tabs-tabPane">
          <SettingsTab />
        </div>
      )
    }
  ];

  return (
    <PageTemplate contentHeader={<div className="Dashboard-contentHeader" />}>
      <div className="Dashboard">
        <section className="Dashboard-profile">
          <div className="Dashboard-profileAvatar">
            <Avatar className="u-avatar" shape="circle" size={AVATAR_SIZE_BIG} src={gravatarUrl} alt={user.displayName} />
          </div>
          <div className="Dashboard-profileInfo">
            <div className="u-page-title">{user.displayName}</div>
            <div>{user.organization}</div>
          </div>
        </section>
        <Tabs
          className="Tabs"
          type="line"
          size="middle"
          defaultActiveKey={initialTab}
          onChange={handleTabChange}
          items={items}
          />
      </div>
    </PageTemplate>
  );
}

Dashboard.propTypes = {
  PageTemplate: PropTypes.func.isRequired
};

export default Dashboard;
