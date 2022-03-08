import Markdown from '../components/markdown.js';
import React, { useEffect, useState } from 'react';
import { useSettings } from '../components/settings-context.js';
import { ANNOUNCEMENT_COOKIE_NAME } from '../domain/constants.js';
import { getCookie, setSessionCookie } from '../common/cookie.js';

function getGlobalAlerts(settings) {
  const globalAlerts = [];

  if (!getCookie(ANNOUNCEMENT_COOKIE_NAME) && settings.announcement) {
    globalAlerts.push({
      message: <Markdown inline>{settings.announcement}</Markdown>,
      showInFullScreen: true,
      closable: true,
      onClose: () => setSessionCookie(ANNOUNCEMENT_COOKIE_NAME, 'true')
    });
  }

  return globalAlerts;
}

export function useGlobalAlerts() {
  const settings = useSettings();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    setAlerts(getGlobalAlerts(settings));
  }, [settings]);

  return alerts;
}
