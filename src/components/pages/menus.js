import React from 'react';
import Page from '../page';
import autoBind from 'auto-bind';
import PropTypes from 'prop-types';
import urls from '../../utils/urls';
import Restricted from '../restricted';
import Logger from '../../common/logger';
import { Input, Modal, Button } from 'antd';
import { inject } from '../container-context';
import errorHelper from '../../ui/error-helper';
import { PlusOutlined } from '@ant-design/icons';
import permissions from '../../domain/permissions';
import { toTrimmedString } from '../../utils/sanitize';
import { menuShape } from '../../ui/default-prop-types';
import MenuApiClient from '../../services/menu-api-client';

const logger = new Logger(__filename);

const DEFAULT_MENU_TITLE = 'Neues Menü';
const DEFAULT_MENU_SLUG = '';

class Menus extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
    this.state = {
      newMenuTitle: DEFAULT_MENU_TITLE,
      newMenuSlug: DEFAULT_MENU_SLUG,
      isNewMenuModalVisible: false,
      isLoading: false
    };
  }

  createNewMenu(title, slug) {
    return {
      title: toTrimmedString(title) || DEFAULT_MENU_TITLE,
      slug: toTrimmedString(slug) || null,
      defaultDocumentKey: null,
      nodes: []
    };
  }

  handleNewMenuClick() {
    this.setState({
      newMenuTitle: DEFAULT_MENU_TITLE,
      newMenuSlug: DEFAULT_MENU_SLUG,
      isNewMenuModalVisible: true
    });
  }

  handleNewMenuTitleChange(event) {
    this.setState({ newMenuTitle: event.target.value });
  }

  handleNewMenuSlugChange(event) {
    this.setState({ newMenuSlug: event.target.value });
  }

  async handleOk() {
    const { newMenuTitle, newMenuSlug } = this.state;
    const { menuApiClient } = this.props;

    try {
      this.setState({ isLoading: true });

      const { menu } = await menuApiClient.saveMenu(this.createNewMenu(newMenuTitle, newMenuSlug));

      this.setState({
        isNewMenuModalVisible: false,
        isLoading: false
      });

      window.location = urls.getEditMenuUrl(menu._id);
    } catch (error) {
      this.setState({ isLoading: false });
      errorHelper.handleApiError(error, logger);
    }
  }

  handleCancel() {
    this.setState({ isNewMenuModalVisible: false });
  }

  render() {
    const { initialState } = this.props;
    const { newMenuTitle, newMenuSlug, isNewMenuModalVisible, isLoading } = this.state;

    return (
      <Page>
        <div className="MenusPage">
          <h1>Menüs</h1>
          <ul>
            {initialState.map(menu => (
              <li key={menu._id}>
                <a href={urls.getEditMenuUrl(menu._id)}>{menu.title}</a>
              </li>
            ))}
          </ul>
          <aside>
            <Restricted to={permissions.EDIT_MENU}>
              <Button type="primary" shape="circle" icon={<PlusOutlined />} size="large" onClick={this.handleNewMenuClick} />
            </Restricted>
          </aside>
          <Modal
            title="Neues Menü"
            visible={isNewMenuModalVisible}
            onOk={this.handleOk}
            onCancel={this.handleCancel}
            >
            <p>Titel</p>
            <p><Input value={newMenuTitle} onChange={this.handleNewMenuTitleChange} /></p>
            <p>URL-Pfad</p>
            <p><Input addonBefore={urls.menusPrefix} value={newMenuSlug} onChange={this.handleNewMenuSlugChange} /></p>
            {isLoading && <p>Wird erstellt ...</p>}
          </Modal>
        </div>
      </Page>
    );
  }
}

Menus.propTypes = {
  initialState: PropTypes.arrayOf(menuShape).isRequired,
  menuApiClient: PropTypes.instanceOf(MenuApiClient).isRequired
};

export default inject({
  menuApiClient: MenuApiClient
}, Menus);