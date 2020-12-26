import React from 'react';
import PropTypes from 'prop-types';
import { Menu, Dropdown } from 'antd';
import { usePermission } from '../ui/hooks';
import permissions from '../domain/permissions';
import { sectionShape } from '../ui/default-prop-types';
import { ThunderboltOutlined } from '@ant-design/icons';
import { confirmHardDelete } from './section-action-dialogs';
import { HARD_DELETE, createHardDelete } from '../ui/section-actions';

const MenuItem = Menu.Item;
const redIconStyle = { color: 'red' };

function SectionActionDropdown({ children, section, onAction, onVisibleChange, placement }) {
  const canHardDelete = usePermission(permissions.HARD_DELETE_SECTION);

  const handleSectionMenuClick = ({ key }) => {
    switch (key) {
      case HARD_DELETE:
        confirmHardDelete(section, ({ deleteDescendants, deletionReason }) => onAction(createHardDelete(section, deletionReason, deleteDescendants)));
        break;
      default:
        throw new Error(`Invalid menu key: ${key}`);
    }

    return onVisibleChange && onVisibleChange(false);
  };

  const menuItems = [];

  if (canHardDelete && !section.deletedOn) {
    menuItems.push((
      <MenuItem key={HARD_DELETE}>
        <ThunderboltOutlined style={redIconStyle} />&nbsp;&nbsp;<span>Unwiderruflich löschen</span>
      </MenuItem>
    ));
  }

  if (!menuItems.length) {
    return null;
  }

  const actionsMenu = <Menu onClick={handleSectionMenuClick}>{menuItems}</Menu>;

  return (
    <Dropdown
      overlay={actionsMenu}
      placement={placement}
      onVisibleChange={visible => onVisibleChange && onVisibleChange(visible)}
      >
      {children}
    </Dropdown>
  );
}

SectionActionDropdown.propTypes = {
  children: PropTypes.node,
  onAction: PropTypes.func.isRequired,
  onVisibleChange: PropTypes.func,
  placement: PropTypes.oneOf(['bottomLeft', 'bottomCenter', 'bottomRight', 'topLeft', 'topCenter', 'topRight']),
  section: sectionShape.isRequired
};

SectionActionDropdown.defaultProps = {
  children: null,
  onVisibleChange: null,
  placement: 'bottomLeft'
};

export default SectionActionDropdown;