import by from 'thenby';
import Table from '../table.js';
import PropTypes from 'prop-types';
import { Select, Tag } from 'antd';
import urls from '../../utils/urls.js';
import SearchBar from '../search-bar.js';
import Logger from '../../common/logger.js';
import TagSelector from '../tag-selector.js';
import { useTranslation } from 'react-i18next';
import ItemsExpander from '../items-expander.js';
import { useRequest } from '../request-context.js';
import React, { useEffect, useState } from 'react';
import { useDateFormat } from '../locale-context.js';
import CloseIcon from '../icons/general/close-icon.js';
import { handleApiError } from '../../ui/error-helper.js';
import LanguageIcon from '../localization/language-icon.js';
import { useSessionAwareApiClient } from '../../ui/api-helper.js';
import SearchApiClient from '../../api-clients/search-api-client.js';
import { ensureIsExcluded, ensureIsIncluded } from '../../utils/array-utils.js';

const logger = new Logger(import.meta.url);

function Search({ PageTemplate }) {
  const request = useRequest();
  const { t } = useTranslation('search');
  const { formatDate } = useDateFormat();

  const sortingOptions = [
    { label: t('relevance'), value: 'relevance' },
    { label: t('common:title'), value: 'title' },
    { label: t('common:language'), value: 'language' },
    { label: t('common:createdOn'), value: 'createdOn' },
    { label: t('common:updatedOn'), value: 'updatedOn' }
  ];

  const sortByRelevance = docsToSort => docsToSort.sort(by(doc => doc.tagMatchCount, 'desc').thenBy(doc => doc.updatedOn, 'desc'));
  const sortByTitle = docsToSort => docsToSort.sort(by(doc => doc.title, 'asc').thenBy(doc => doc.updatedOn, 'desc'));
  const sortByLanguage = docsToSort => docsToSort.sort(by(doc => doc.language, 'asc').thenBy(doc => doc.updatedOn, 'desc'));
  const sortByCreatedOn = docsToSort => docsToSort.sort(by(doc => doc.createdOn, 'desc'));
  const sortByUpdatedOn = docsToSort => docsToSort.sort(by(doc => doc.updatedOn, 'desc'));

  const formatSorting = value => `${t('sorting')}: ${sortingOptions.find(o => o.value === value).label}`;

  const [docs, setDocs] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [displayedDocs, setDisplayedDocs] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSearching, setIsSearching] = useState(true);
  const [searchText, setSearchText] = useState(request.query.query);
  const [sorting, setSorting] = useState(formatSorting(sortingOptions[0].value));
  const searchApiClient = useSessionAwareApiClient(SearchApiClient);

  const updateTagOptions = tags => setTagOptions(tags.sort().map(tag => ({ value: tag, key: tag })));

  useEffect(() => {
    (async () => {
      setIsSearching(true);
      try {
        history.replaceState(null, '', urls.getSearchUrl(searchText));
        const { result } = await searchApiClient.search(searchText);
        setDocs(result);
      } catch (error) {
        handleApiError({ error, logger, t });
      } finally {
        setIsSearching(false);
      }
    })();
  }, [searchText, searchApiClient, t]);

  useEffect(() => {
    const docTags = docs.map(doc => doc.tags).flat().map(tag => tag.toLowerCase());
    const uniqueDocTags = [...new Set(docTags)];
    setAllTags(uniqueDocTags);
  }, [docs]);

  useEffect(() => {
    const remainingTags = allTags.filter(tag => !selectedTags.includes(tag));
    setTagOptions(remainingTags.map(tag => ({ value: tag, key: tag })));
  }, [allTags, selectedTags]);

  useEffect(() => {
    const filteredDocs = docs.filter(doc => selectedTags.every(selectedTag => doc.tags.some(tag => tag.toLowerCase() === selectedTag)));
    setDisplayedDocs(sortByRelevance(filteredDocs));
  }, [docs, selectedTags]);

  const handleSelectTag = tag => setSelectedTags(ensureIsIncluded(selectedTags, tag));
  const handleDeselectTag = tag => setSelectedTags(ensureIsExcluded(selectedTags, tag));
  const handleDeselectTagsClick = () => setSelectedTags([]);
  const handleSelectSorting = sortingValue => {
    setSorting(formatSorting(sortingValue));

    switch (sortingValue) {
      case 'relevance':
        setDisplayedDocs(sortByRelevance(displayedDocs));
        break;
      case 'title':
        setDisplayedDocs(sortByTitle(displayedDocs));
        break;
      case 'language':
        setDisplayedDocs(sortByLanguage(displayedDocs));
        break;
      case 'createdOn':
        setDisplayedDocs(sortByCreatedOn(displayedDocs));
        break;
      case 'updatedOn':
        setDisplayedDocs(sortByUpdatedOn(displayedDocs));
        break;
      default:
        break;
    }
  };

  const renderTitle = (title, doc) => (
    <a className="SearchPage-titleCell" href={urls.getDocUrl({ key: doc.key, slug: doc.slug })}>
      <div className="SearchPage-titleCellTitle">{title}</div>
      {doc.description && <div className="SearchPage-titleCellDescription">{doc.description}</div>}
      <div className="SearchPage-titleCellDates">{t('createdOn')}: {formatDate(doc.createdOn)} | {t('updatedOn')}: {formatDate(doc.updatedOn)}</div>
    </a>
  );

  const renderLanguage = lang => (<LanguageIcon language={lang} />);

  const renderCellTags = tags => (
    <div>
      <ItemsExpander
        className="SearchPage-cellTags"
        expandLinkClassName="SearchPage-cellTagsExpandLink"
        items={tags}
        renderItem={tag => <Tag className="Tag" key={tag}>{tag}</Tag>}
        />
    </div>
  );

  const renderSelectedTags = () => selectedTags.map(tag => (
    <Tag
      key={tag}
      closable
      closeIcon={<CloseIcon />}
      className="Tag Tag--selected"
      onClose={() => handleDeselectTag(tag)}
      >
      {tag}
    </Tag>
  ));

  const columns = [
    {
      title: t('common:title'),
      dataIndex: 'title',
      key: 'title',
      render: renderTitle
    },
    {
      title: t('common:tags'),
      dataIndex: 'tags',
      render: renderCellTags,
      responsive: ['md'],
      width: '45%'
    },
    {
      title: t('common:language'),
      dataIndex: 'language',
      render: renderLanguage
    }
  ];

  return (
    <PageTemplate>
      <div className="SearchPage">
        <div className="SearchPage-headline">
          <h1>{t('headline', { count: displayedDocs.length })}</h1>
        </div>
        <div className="SearchPage-controls">
          <SearchBar initialValue={searchText} onSearch={setSearchText} />
          <Select
            size="large"
            value={sorting}
            options={sortingOptions}
            onChange={handleSelectSorting}
            showArrow
            />
        </div>
        <div className="SearchPage-selectedTags">
          {renderSelectedTags()}
          <TagSelector
            size="large"
            options={tagOptions}
            onSelect={handleSelectTag}
            selectedCount={selectedTags.length}
            />
          {selectedTags.length > 1 && (
            <a className="SearchPage-deselectTagsLink" onClick={handleDeselectTagsClick}>
              <CloseIcon />
              {t('deselectTags')}
            </a>
          )}
        </div>
        <Table
          dataSource={[...displayedDocs]}
          columns={columns}
          loading={isSearching}
          pagination
          />
      </div>
    </PageTemplate>
  );
}

Search.propTypes = {
  PageTemplate: PropTypes.func.isRequired
};

export default Search;
