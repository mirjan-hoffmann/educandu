import React from 'react';
import { Tabs } from 'antd';
import PropTypes from 'prop-types';
import RoomsTab from '../rooms-tab.js';
import ProfileTab from '../profile-tab.js';
import AccountTab from '../account-tab.js';
import { useUser } from '../user-context.js';
import UsedStorage from '../used-storage.js';
import { useTranslation } from 'react-i18next';
import { useService } from '../container-context.js';
import { roomShape } from '../../ui/default-prop-types.js';
import ClientConfig from '../../bootstrap/client-config.js';
import { useStoragePlan } from '../storage-plan-context.js';
import { useGlobalAlerts } from '../../ui/global-alerts.js';

const { TabPane } = Tabs;

function MySpace({ initialState, PageTemplate }) {
  const user = useUser();
  const storagePlan = useStoragePlan();

  const alerts = useGlobalAlerts();
  const { t } = useTranslation('mySpace');
  const clientConfig = useService(ClientConfig);

  const { rooms } = initialState;

  const formItemLayout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 8 }
    },
    wrapperCol: {
      xs: { span: 24 },
      sm: { span: 16 }
    }
  };

  const tailFormItemLayout = {
    wrapperCol: {
      xs: {
        span: 24,
        offset: 0
      },
      sm: {
        span: 16,
        offset: 8
      }
    }
  };

  const storagePlanName = storagePlan ? `"${storagePlan.name}" ${t('storagePlanLabel')}` : t('noStoragePlanLabel');

  return (
    <PageTemplate alerts={alerts} disableProfileWarning>
      <div className="MySpacePage">

        <h1>{t('pageNames:mySpace')}</h1>
        <Tabs className="Tabs" defaultActiveKey="1" type="line" size="large">
          {clientConfig.areRoomsEnabled && (
            <TabPane className="Tabs-tabPane" tab={t('roomsTabTitle')} key="1">
              <RoomsTab rooms={rooms} />
            </TabPane>)}
          <TabPane className="Tabs-tabPane" tab={t('profileTabTitle')} key="2">
            <ProfileTab formItemLayout={formItemLayout} tailFormItemLayout={tailFormItemLayout} />
          </TabPane>
          <TabPane className="Tabs-tabPane" tab={t('accountTabTitle')} key="3">
            <AccountTab formItemLayout={formItemLayout} tailFormItemLayout={tailFormItemLayout} />
          </TabPane>
          {!!(user.storage.plan || user.storage.usedBytes) && (
            <TabPane className="Tabs-tabPane" tab={t('common:storage')} key="4">
              <h5>{storagePlanName}</h5>
              <div className="MySpacePage-usedStorage">
                <span className="MySpacePage-usedStorageLabel">{t('usedStorageLabel')}:</span>
                <span className="MySpacePage-usedStorageBar">
                  <UsedStorage usedBytes={user.storage.usedBytes} maxBytes={storagePlan?.maxBytes} />
                </span>
              </div>
            </TabPane>
          )}
        </Tabs>

      </div>
    </PageTemplate>
  );
}

MySpace.propTypes = {
  PageTemplate: PropTypes.func.isRequired,
  initialState: PropTypes.shape({
    rooms: PropTypes.arrayOf(roomShape).isRequired
  }).isRequired
};

export default MySpace;
