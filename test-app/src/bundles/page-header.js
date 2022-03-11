import React from 'react';
import { Button } from 'antd';
import PropTypes from 'prop-types';
import urls from '../../../src/utils/urls.js';
import { useTranslation } from 'react-i18next';
import Login from '../../../src/components/login.js';
import permissions from '../../../src/domain/permissions.js';
import { useUser } from '../../../src/components/user-context.js';
import LinkPopover from '../../../src/components/link-popover.js';
import ClientConfig from '../../../src/bootstrap/client-config.js';
import { FEATURE_TOGGLES } from '../../../src/domain/constants.js';
import { useLocale } from '../../../src/components/locale-context.js';
import { useService } from '../../../src/components/container-context.js';
import { useSettings } from '../../../src/components/settings-context.js';
import DefaultHeaderLogo from '../../../src/components/default-header-logo.js';
import {
  QuestionOutlined,
  MenuOutlined,
  LogoutOutlined,
  HomeOutlined,
  IdcardOutlined,
  FileOutlined,
  UserOutlined,
  SettingOutlined,
  ImportOutlined,
  GlobalOutlined
} from '@ant-design/icons';

function PageHeader({ onUiLanguageClick }) {
  const user = useUser();
  const settings = useSettings();
  const { uiLanguage } = useLocale();
  const { t } = useTranslation('page');
  const clientConfig = useService(ClientConfig);
  const helpPage = settings?.helpPage?.[uiLanguage];

  const pageMenuItems = [
    {
      key: 'home',
      href: urls.getHomeUrl(),
      text: t('pageNames:home'),
      icon: HomeOutlined,
      permission: null,
      showWhen: true
    },
    {
      key: 'dashboard',
      href: urls.getDashboardUrl(),
      text: t('pageNames:dashboard'),
      icon: IdcardOutlined,
      permission: null,
      showWhen: !!user
    },
    {
      key: 'docs',
      href: urls.getDocsUrl(),
      text: t('pageNames:docs'),
      icon: FileOutlined,
      permission: permissions.VIEW_DOCS,
      showWhen: true
    },
    {
      key: 'users',
      href: urls.getUsersUrl(),
      text: t('pageNames:users'),
      icon: UserOutlined,
      permission: permissions.EDIT_USERS,
      showWhen: true
    },
    {
      key: 'settings',
      href: urls.getSettingsUrl(),
      text: t('pageNames:settings'),
      icon: SettingOutlined,
      permission: permissions.EDIT_SETTINGS,
      showWhen: true
    },
    {
      key: 'import',
      href: urls.getImportsUrl(),
      text: t('pageNames:importBatches'),
      icon: ImportOutlined,
      permission: permissions.MANAGE_IMPORT,
      showWhen: !clientConfig.disabledFeatures.includes(FEATURE_TOGGLES.import)
    },
    {
      key: 'help',
      href: helpPage ? urls.getDocUrl({ key: helpPage.documentKey, slug: helpPage.documentSlug }) : '',
      text: helpPage?.linkTitle,
      icon: QuestionOutlined,
      permission: null,
      showWhen: !!helpPage
    },
    {
      key: 'ui-language',
      onClick: () => onUiLanguageClick(),
      text: t('common:language'),
      icon: GlobalOutlined,
      permission: null,
      showWhen: true
    },
    {
      key: 'logout',
      href: urls.getLogoutUrl(),
      text: t('common:logoff'),
      icon: LogoutOutlined,
      permission: null,
      showWhen: !!user
    }
  ].filter(item => item.showWhen);

  return (
    <header className="PageHeader">
      <div className="PageHeader-header">
        <div className="PageHeader-headerContent PageHeader-headerContent--left">
          <DefaultHeaderLogo />
        </div>
        <div className="PageHeader-headerContent PageHeader-headerContent--right">
          <div className="PageHeader-loginButton">
            <Login />
          </div>
          <LinkPopover items={pageMenuItems} trigger="click" placement="bottomRight">
            <Button className="PageHeader-headerButton" icon={<MenuOutlined />} />
          </LinkPopover>
        </div>
      </div>
    </header>
  );
}

PageHeader.propTypes = {
  onUiLanguageClick: PropTypes.func
};

PageHeader.defaultProps = {
  onUiLanguageClick: () => {}
};

export default PageHeader;