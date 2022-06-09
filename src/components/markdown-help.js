import PropTypes from 'prop-types';
import classNames from 'classnames';
import Markdown from './markdown.js';
import { Modal, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import MarkdownIcon from './icons/markdown/markdown-icon.js';
import React, { Fragment, useCallback, useState } from 'react';

const ZERO_WIDTH_SPACE = '\u200B';

function MarkdownHelp({ inline, disabled }) {
  const { t } = useTranslation('markdownHelp');
  const [isBlockHelpModalVisible, setIsBlockHelpModalVisible] = useState(false);
  const toggleModal = useCallback(() => setIsBlockHelpModalVisible(val => !val), [setIsBlockHelpModalVisible]);

  if (inline) {
    const inlineHelp = (
      <div className={classNames('MarkdownHelp', 'MarkdownHelp--inline', { 'is-disabled': disabled })}>
        <MarkdownIcon />
      </div>
    );

    if (disabled) {
      return inlineHelp;
    }

    const inlineTooltipContent = (
      <div
        className="MarkdownHelp-inlineTooltip"
        dangerouslySetInnerHTML={{ __html: t('inlineTooltipHtml') }}
        />
    );

    return <Tooltip title={inlineTooltipContent}>{inlineHelp}</Tooltip>;
  }

  const blockHelp = (
    <div
      className={classNames('MarkdownHelp', 'MarkdownHelp--block', { 'is-disabled': disabled })}
      onClick={toggleModal}
      >
      <MarkdownIcon />
    </div>
  );

  if (disabled) {
    return blockHelp;
  }

  const blockTooltipContent = (
    <div className="MarkdownHelp-blockTooltip">
      {t('blockTooltipText')}
    </div>
  );

  const renderMarkdownCode = code => {
    const lines = code.split('\n');
    return (
      <Fragment>
        {lines.map((line, lineIndex) => {
          const tokens = line.split(' ');
          return (
            <Fragment key={lineIndex.toString()}>
              {lineIndex !== 0 && <br />}
              {tokens.map((token, tokenIndex) => {
                const word = tokenIndex !== 0 && token ? ZERO_WIDTH_SPACE + token : token;
                return (
                  <Fragment key={tokenIndex.toString()}>
                    {tokenIndex !== 0 && <span className="MarkdownHelp-spaceIndicator">•</span>}
                    {word}
                  </Fragment>
                );
              })}
            </Fragment>
          );
        })}
      </Fragment>
    );
  };

  const renderBlockHelp = () => {
    const parts = t('blockHelpMarkdown').replaceAll('<space>', ' ').split('\n\n');
    return (
      <div className="MarkdownHelp-blockHelpContent">
        <table className="MarkdownHelp-blockHelpTable">
          <tbody>
            {parts.map((part, index) => (
              <tr key={index.toString()}>
                <td className="MarkdownHelp-blockHelpTableCell">
                  {renderMarkdownCode(part)}
                </td>
                <td className="MarkdownHelp-blockHelpTableCell">
                  <Markdown>{part}</Markdown>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Fragment>
      <Tooltip title={blockTooltipContent} placement="topRight">{blockHelp}</Tooltip>
      <Modal
        width="80%"
        footer={null}
        visible={isBlockHelpModalVisible}
        onCancel={toggleModal}
        destroyOnClose
        >
        {renderBlockHelp()}
      </Modal>
    </Fragment>
  );
}

MarkdownHelp.propTypes = {
  disabled: PropTypes.bool,
  inline: PropTypes.bool
};

MarkdownHelp.defaultProps = {
  disabled: false,
  inline: false
};

export default MarkdownHelp;
