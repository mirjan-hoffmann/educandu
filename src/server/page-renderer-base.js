import React from 'react';
import { EOL } from 'node:os';
import ReactDOMServer from 'react-dom/server';
import { resetServerContext } from 'react-beautiful-dnd';
import pageRendererUtils from '../utils/page-renderer-utils.js';
import PageTemplate from '../components/templates/page-template.js';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';

class PageRendererBase {
  renderHtml({ uiLanguage, title, styles, scripts, ContentRoot, contentProps, additionalHeadHtml }) {
    resetServerContext();
    const cache = createCache();

    const content = ReactDOMServer
      .renderToString(<StyleProvider cache={cache}><ContentRoot {...contentProps} /></StyleProvider>);

    const themeText = extractStyle(cache);
    const themeStylesData = pageRendererUtils.parseThemeText(themeText);

    const pageProps = { uiLanguage, title, content, styles, themeStylesData, scripts, additionalHeadHtml };
    const page = ReactDOMServer.renderToStaticMarkup(<PageTemplate {...pageProps} />);

    return `<!DOCTYPE html>${EOL}${page}${EOL}`;
  }
}

export default PageRendererBase;
