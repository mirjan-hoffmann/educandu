import React from 'react';
import iconNs from '@ant-design/icons';

const Icon = iconNs.default || iconNs;

// SVG is taken and adapted from: https://tabler-icons.io/i/arrow-back-up (MIT licensed - Copyright (c) 2020-2023 Paweł Kuna)

export function ResetIconComponent() {
  return (
    <svg height="1em" style={{ enableBackground: 'new 0 0 24 24' }} width="1em" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M9 14l-4 -4l4 -4" />
      <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
    </svg>
  );
}

function ResetIcon(props) {
  return (
    <Icon component={ResetIconComponent} {...props} />
  );
}

export default ResetIcon;
