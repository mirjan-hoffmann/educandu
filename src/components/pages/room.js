import PropTypes from 'prop-types';
import Markdown from '../markdown.js';
import urls from '../../utils/urls.js';
import Logger from '../../common/logger.js';
import { useUser } from '../user-context.js';
import { useTranslation } from 'react-i18next';
import React, { useRef, useState } from 'react';
import { useDateFormat } from '../language-context.js';
import RoomMetadataForm from '../room-metadata-form.js';
import { handleApiError } from '../../ui/error-helper.js';
import LessonCreationModal from '../lesson-creation-modal.js';
import { ROOM_ACCESS_LEVEL } from '../../domain/constants.js';
import { confirmRoomDelete } from '../confirmation-dialogs.js';
import { Space, List, Button, Tabs, Card, message } from 'antd';
import RoomApiClient from '../../api-clients/room-api-client.js';
import { useSessionAwareApiClient } from '../../ui/api-helper.js';
import RoomInvitationCreationModal from '../room-invitation-creation-modal.js';
import { roomShape, invitationShape, lessonShape } from '../../ui/default-prop-types.js';
import { DeleteOutlined, LockOutlined, PlusOutlined, UnlockOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

const logger = new Logger(import.meta.url);

export default function Room({ PageTemplate, initialState }) {
  const user = useUser();
  const formRef = useRef(null);
  const { t } = useTranslation('room');
  const { formatDate } = useDateFormat();
  const roomApiClient = useSessionAwareApiClient(RoomApiClient);

  const [room, setRoom] = useState(initialState.room);
  const [isRoomUpdateButtonDisabled, setIsRoomUpdateButtonDisabled] = useState(true);
  const [isRoomInvitationModalVisible, setIsRoomInvitationModalVisible] = useState(false);
  const [isLessonCreationModalVisible, setIsLessonCreationModalVisible] = useState(false);

  const { invitations, lessons } = initialState;
  const isRoomOwner = user._id === room.owner.key;
  const isPrivateRoom = room.access === ROOM_ACCESS_LEVEL.private;

  const handleCreateInvitationButtonClick = event => {
    setIsRoomInvitationModalVisible(true);
    event.stopPropagation();
  };

  const handleRoomDelete = async () => {
    try {
      await roomApiClient.deleteRoom(room._id);
      window.location = urls.getMySpaceUrl();
    } catch (error) {
      handleApiError({ error, t, logger });
    }
  };

  const handleDeleteRoomClick = () => {
    confirmRoomDelete(t, room.name, handleRoomDelete);
  };

  const handleInvitationModalClose = wasNewInvitationCreated => {
    setIsRoomInvitationModalVisible(false);

    if (!wasNewInvitationCreated) {
      return;
    }
    window.location.reload();
  };

  const handleNewLessonClick = () => {
    setIsLessonCreationModalVisible(true);
  };

  const handleLessonCreationModalClose = () => {
    setIsLessonCreationModalVisible(false);
  };

  const handleUpdateRoomClick = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  const handleRoomMetadataFormSubmitted = async ({ name, slug, description }) => {
    try {
      const updatedRoom = { ...room, name, slug, description };
      await roomApiClient.updateRoom({ roomId: room._id, name, slug, description });

      setRoom(updatedRoom);
      setIsRoomUpdateButtonDisabled(true);
      message.success(t('updateRoomSuccessMessage'));
    } catch (error) {
      handleApiError({ error, logger, t });
    }
  };

  const handleRoomMetadataFormFieldsChanged = () => {
    setIsRoomUpdateButtonDisabled(false);
  };

  const renderLesson = (lesson, index) => {
    const url = urls.getLessonUrl(lesson._id, lesson.slug);

    const hightlightedLessonIndex = 1;

    return (
      <div className="Room-lesson" key={lesson._id}>
        {index === hightlightedLessonIndex && (<hr />)}
        <div className="Room-lessonInfo">
          <span className="Room-lessonWeek">{index === hightlightedLessonIndex && t('thisWeek')}</span>
          <a href={url}>{lesson.title}</a>
        </div>
        {index === hightlightedLessonIndex && (<hr />)}
      </div>
    );
  };

  const renderRoomMembers = () => {
    const title = isRoomOwner && t('roomMembersHeader', { count: room.members.length });
    return (
      <Card className="Room-card" title={title}>
        <List
          dataSource={room.members}
          renderItem={member => (
            <List.Item className="Room-membersRow">
              <Space>
                <span>{formatDate(member.joinedOn)}</span>
                <span>{member.username}</span>
              </Space>
            </List.Item>)}
          />
      </Card>
    );
  };

  const renderRoomInvitations = () => (
    <Card
      className="Room-card"
      title={t('invitationsHeader', { count: invitations.length })}
      actions={[
        <Button
          className="Room-cardButton"
          key="createRoomInvitation"
          type="primary"
          shape="circle"
          icon={<PlusOutlined />}
          size="large"
          onClick={handleCreateInvitationButtonClick}
          />
      ]}
      >
      <List
        dataSource={invitations}
        renderItem={invitation => (
          <List.Item className="Room-membersRow">
            <Space>
              <span>{formatDate(invitation.sentOn)}</span>
              <span>{invitation.email}</span>
            </Space>
            <Space>
              <span>{t('expires')}:</span>
              <span>{formatDate(invitation.expires)}</span>
            </Space>
          </List.Item>
        )}
        />
    </Card>
  );

  return (
    <PageTemplate>
      <div className="Room">
        <h1 className="Room-title">{room.name}</h1>
        <div className="Room-subtitle">
          <div className="Room-subtitleIcon">
            {room.access === ROOM_ACCESS_LEVEL.private ? <LockOutlined /> : <UnlockOutlined />}
          </div>
          <span>{t(`${room.access}RoomSubtitle`)} | {t('common:owner')}: {room.owner.username}</span>
        </div>

        <Tabs className="Tabs" defaultActiveKey="1" type="line" size="large">
          <TabPane className="Tabs-tabPane" tab={t('lessonsTabTitle')} key="1">
            <Card
              className="Room-card"
              actions={isRoomOwner && [
                <Button
                  className="Room-cardButton"
                  key="createLesson"
                  type="primary"
                  shape="circle"
                  icon={<PlusOutlined />}
                  size="large"
                  onClick={handleNewLessonClick}
                  />
              ]}
              >
              {room.description && <Markdown className="Room-description" renderMedia>{room.description}</Markdown>}
              {lessons.map(renderLesson)}
            </Card>
          </TabPane>

          {isPrivateRoom && (
            <TabPane className="Tabs-tabPane" tab={t('membersTabTitle')} key="2">
              {renderRoomMembers()}
              {isRoomOwner && renderRoomInvitations()}
              <RoomInvitationCreationModal isVisible={isRoomInvitationModalVisible} onClose={handleInvitationModalClose} roomId={room._id} />
            </TabPane>
          )}

          {isRoomOwner && (
            <TabPane className="Tabs-tabPane" tab={t('settingsTabTitle')} key="3">
              <Card className="Room-card" title={t('updateRoomCardTitle')}>
                <RoomMetadataForm
                  formRef={formRef}
                  room={room}
                  onSubmit={handleRoomMetadataFormSubmitted}
                  onFieldsChange={handleRoomMetadataFormFieldsChanged}
                  editMode
                  />
                <Button
                  className="Room-cardEditButton"
                  type="primary"
                  onClick={handleUpdateRoomClick}
                  disabled={isRoomUpdateButtonDisabled}
                  >
                  {t('common:update')}
                </Button>
              </Card>
              <Card className="Room-card Room-card--danger" title={t('roomDangerZoneCardTitle')}>
                <div className="Room-cardDangerAction">
                  <div>
                    <span className="Room-cardDangerActionTitle">{t('deleteRoomTitle')}</span>
                    <span className="Room-cardDangerActionDescription">{t('deleteRoomDescription')}</span>
                  </div>
                  <Button type="primary" icon={<DeleteOutlined />} onClick={handleDeleteRoomClick}>{t('deleteRoomButton')}</Button>
                </div>
              </Card>
            </TabPane>
          )}
        </Tabs>

        <LessonCreationModal
          roomId={room._id}
          isVisible={isLessonCreationModalVisible}
          onClose={handleLessonCreationModalClose}
          />
      </div>
    </PageTemplate>);
}

Room.propTypes = {
  PageTemplate: PropTypes.func.isRequired,
  initialState: PropTypes.shape({
    room: roomShape.isRequired,
    invitations: PropTypes.arrayOf(invitationShape).isRequired,
    lessons: PropTypes.arrayOf(lessonShape).isRequired
  }).isRequired
};
