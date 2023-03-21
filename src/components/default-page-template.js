import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import CustomAlert from './custom-alert.js';
import ConsentDialog from './consent-dialog.js';
import DefaultPageHeader from './default-page-header.js';
import DefaultPageFooter from './default-page-footer.js';

function DefaultPageTemplate({ children, fullScreen, focusHeader, alerts }) {
  const contentAreaClasses = classNames({
    'DefaultPageTemplate-contentArea': true,
    'DefaultPageTemplate-contentArea--fullScreen': fullScreen
  });

  const contentClasses = classNames({
    'DefaultPageTemplate-content': true,
    'DefaultPageTemplate-content--fullScreen': fullScreen
  });

  const renderAlert = (alert, index) => {
    const shouldRenderAlert = !fullScreen || alert.showInFullScreen;

    if (!shouldRenderAlert) {
      return null;
    }

    return (
      <CustomAlert
        banner
        key={index}
        type={alert.type}
        message={alert.message}
        closable={alert.closable || false}
        onClose={alert.onClose || (() => { })}
        />
    );
  };

  return (
    <div className="DefaultPageTemplate">
      <DefaultPageHeader focusContent={focusHeader} />
      <main className={contentAreaClasses}>
        <div className={contentClasses}>
          {!!alerts?.length && (
            <div className="DefaultPageTemplate-contentAlerts">
              {alerts.map(renderAlert)}
            </div>
          )}
          {children}
        </div>
      </main>
      {!focusHeader && <DefaultPageFooter />}
      <ConsentDialog />
    </div>
  );
}

DefaultPageTemplate.propTypes = {
  alerts: PropTypes.arrayOf(PropTypes.shape({
    message: PropTypes.node.isRequired,
    type: PropTypes.string,
    closable: PropTypes.bool,
    onClose: PropTypes.func
  })),
  children: PropTypes.node,
  fullScreen: PropTypes.bool,
  focusHeader: PropTypes.node
};

DefaultPageTemplate.defaultProps = {
  alerts: [],
  children: null,
  fullScreen: false,
  focusHeader: null
};

export default DefaultPageTemplate;
