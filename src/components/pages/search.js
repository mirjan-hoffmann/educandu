import React, { useMemo } from 'react';
import Page from '../page.js';
import PropTypes from 'prop-types';
import moment from 'moment';
import firstBy from 'thenby';

import { Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { searchResultShape } from '../../ui/default-prop-types.js';
import { useLanguage } from '../language-context.js';
import urls from '../../utils/urls.js';

function Search({ initialState }) {
  const { t } = useTranslation('search');
  const { locale } = useLanguage();
  const { docs } = initialState;
  const sortedDocs = useMemo(
    () => docs.sort(firstBy(doc => doc.contributors)
      .thenBy(doc => doc.updatedOn, 'desc')),
    [docs]
  );

  const renderContributorsCount = value => (<div>{value?.length}</div>);

  const renderUpdatedOn = (_value, doc) => {
    const date = moment(doc.updatedOn).locale(locale);
    return <span>{date.format('L, LT')}</span>;
  };

  const renderTitle = (title, doc) => {
    const url = urls.getArticleUrl(doc.slug);
    return <a href={url}>{title}</a>;
  };

  const columns = [
    {
      title: t('title'),
      dataIndex: 'title',
      key: 'title',
      render: renderTitle
    },
    {
      title: t('numberOfContributors'),
      dataIndex: 'contributors',
      render: renderContributorsCount
    },
    {
      title: t('tags'),
      dataIndex: 'tags',
      render: (tags, doc) => tags.map(tag => (<Tag key={`${doc.key}_${tag}`}>{tag}</Tag>))
    },
    {
      title: t('udateDate'),
      dataIndex: 'updatedOn',
      render: renderUpdatedOn
    }
  ];

  return (
    <Page headerActions={[]}>
      <Table
        bordered={false}
        pagination={false}
        size="middle"
        columns={columns}
        dataSource={sortedDocs}
        />
    </Page>
  );
}

Search.propTypes = {
  initialState: PropTypes.shape({
    docs: PropTypes.arrayOf(searchResultShape)
  }).isRequired
};

export default Search;