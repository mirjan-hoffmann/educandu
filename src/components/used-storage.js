import React from 'react';
import { Progress } from 'antd';
import PropTypes from 'prop-types';
import prettyBytes from 'pretty-bytes';
import { useLocale } from './locale-context.js';

function UsedStorage({ usedBytes, maxBytes }) {
  const { uiLocale } = useLocale();

  const percent = maxBytes ? usedBytes * 100 / maxBytes : 100;
  const displayedPercent = `${Math.round(percent)} %`;
  const status = percent >= 95 ? 'exception' : 'normal';

  const maxSpace = prettyBytes(maxBytes, { locale: uiLocale });
  const usedSpace = prettyBytes(usedBytes, { locale: uiLocale });

  return (
    <div className="UsedStorage">
      <div className="UsedStorage-progress">
        <Progress strokeLinecap="square" percent={percent} status={status} showInfo={false} />
        <span className="UserStorage-progressPercentage">{displayedPercent}</span>
      </div>
      <span className="UsedStorage-occupiedSpace">{`${usedSpace} / ${maxSpace}`}</span>
    </div>
  );
}

UsedStorage.propTypes = {
  maxBytes: PropTypes.number,
  usedBytes: PropTypes.number.isRequired
};

UsedStorage.defaultProps = {
  maxBytes: 0
};

export default UsedStorage;