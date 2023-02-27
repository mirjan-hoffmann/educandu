import React from 'react';
import iconNs from '@ant-design/icons';

const Icon = iconNs.default || iconNs;

export function NotationIconComponent() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 1000 1000" style={{ enableBackground: 'new 0 0 1000 1000' }} role="img" >
      <path d="M941.3 190.5 869 99.8c-21.9-27.5-62.1-32-89.5-10.2L335.2 436.4c-2.3 1.8-4 4.1-5 6.8l-43.7 119c-.3.6-.6 1.3-.9 2L266.8 616c-3.3 9.2-1.7 19.3 4.4 27 .9 1.1 1.9 2.1 2.9 3.1 5 11.7 6.8 23.6 5.2 34.2-6.3 41.4-41.6 71.6-83 74.3-1.4-80.9-3-192.7-2.9-284.5 31.7-27 94-92.1 109.9-154 5.6-21.8 2.2-43.6-9.4-61.1-10.2-15.5-26.2-25.9-43.7-28.5-17.3-2.6-33.6 1.6-47.1 12.2-20.4 16.1-33.9 46.3-37.1 82.8-2.2 25.7-3.1 75-3.3 133.8C83.9 513.5 56.6 552 46.4 618.6c-11.7 77.2 41.7 149.9 119.8 164.5.8 41.7 1.4 71.2 1.6 79.1l-2.7 15.5c0 .1 0 .2-.1.3-.7 4.8-3.3 9-7.2 11.9-3.9 2.9-8.7 4-13.5 3.3-4.8-.7-9-3.3-11.9-7.2-2.9-3.9-4-8.7-3.3-13.5.8-5.4 3.6-8.8 5.9-10.8 6.3-5.6 6.9-15.3 1.3-21.7-5.6-6.3-15.3-6.9-21.7-1.3-8.5 7.5-14.1 17.9-15.8 29.2-2 12.9 1.2 25.8 8.9 36.3 7.7 10.5 19.1 17.4 32 19.3 2.5.4 5 .6 7.4.6 10.3 0 20.4-3.3 28.8-9.5 10.5-7.7 17.3-19 19.3-31.8l3-16.9c.2-1 .2-2 .2-3 0-1.1-.7-31.6-1.6-77.8 56.1-3 104.2-44 112.8-100.4 1.6-10.7 1.1-21.8-1.5-33l43.1-5.3c.7-.1 1.4-.2 2.1-.4l125.8-16c2.7-.3 5.3-1.4 7.5-3.1L931.1 280c27.6-21.8 32.1-62 10.2-89.5zM196.7 324.1c2.3-27.3 12.1-50.8 25.5-61.3 5.4-4.3 11.4-6.4 18.1-6.4 1.7 0 3.5.1 5.3.4 9 1.4 17.3 6.9 22.7 15.1 6.8 10.2 8.6 23.2 5.2 36.6-10.7 41.7-49.6 89.5-80 119.7.5-45.9 1.4-83.3 3.2-104.1zM76.8 623.2c8-52.6 28.2-84.2 86-129.5.2 85.8 1.6 184.1 2.8 257.9-58.5-14.2-97.8-69.6-88.8-128.4zM924.3 234c-1 8.8-5.3 16.6-12.1 22L478 594.9l-83.2-104.5c-5.3-6.6-14.9-7.7-21.6-2.4-6.6 5.3-7.7 14.9-2.4 21.6l74.8 93.9-89.6 11.3-38.4-48.1 39.9-108.8 441-344.2c14.3-11.4 35.1-9 46.5 5.3l72.3 90.7c5.5 6.9 8 15.5 7 24.3z" style={{ fill: 'currentColor' }} />
      <path d="m795.3 282.4-308 238.1c-6.7 5.2-7.9 14.8-2.8 21.5 3 3.9 7.6 6 12.2 6 3.3 0 6.6-1 9.4-3.2l308-238.1c6.7-5.2 7.9-14.8 2.8-21.5-5.2-6.7-14.9-8-21.6-2.8zM601 388.2c-5.3-6.6-14.9-7.7-21.6-2.5L453.4 486c-6.6 5.3-7.7 14.9-2.5 21.6 3 3.8 7.5 5.8 12 5.8 3.3 0 6.7-1.1 9.5-3.3l126.1-100.3c6.7-5.4 7.8-15 2.5-21.6z" style={{ fill: 'currentColor' }} />
    </svg>
  );
}

function NotationIcon() {
  return (
    <Icon component={NotationIconComponent} />
  );
}

export default NotationIcon;