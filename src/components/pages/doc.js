import React from 'react';
import moment from 'moment';
import Page from '../page';
import autoBind from 'auto-bind';
import DocView from '../doc-view';
import PropTypes from 'prop-types';
import urls from '../../utils/urls';
import Logger from '../../common/logger';
import clipboardCopy from 'clipboard-copy';
import { inject } from '../container-context';
import { Button, Slider, message } from 'antd';
import errorHelper from '../../ui/error-helper';
import permissions from '../../domain/permissions';
import { fullDocShape } from '../../ui/default-prop-types';
import DocumentApiClient from '../../services/document-api-client';
import { PaperClipOutlined, EditOutlined } from '@ant-design/icons';

const logger = new Logger(__filename);

class Doc extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
    this.state = {
      docs: props.initialState.docs,
      currentDoc: props.initialState.docs[props.initialState.docs.length - 1]
    };
  }

  handleEditClick() {
    const { currentDoc } = this.state;
    window.location = urls.getEditDocUrl(currentDoc.key);
  }

  handleRevisionChanged(value) {
    const { docs } = this.state;
    this.setState({ currentDoc: docs.find(doc => doc.snapshotId === value) });
  }

  formatRevisionTooltip(index) {
    const doc = this.state.docs[index];
    const date = moment(doc.updatedOn).locale('de-DE');

    return (
      <div>
        <div>Revision: <b>{index + 1}</b></div>
        <div>Datum: <b>{date.format('L')} {date.format('LT')}</b></div>
        <div>Benutzer: <b>{doc.updatedBy.username}</b></div>
        <div>ID: <b>{doc.snapshotId}</b></div>
      </div>
    );
  }

  handleIndexChanged(index) {
    this.setState(prevState => ({ currentDoc: prevState.docs[index] }));
  }

  async handlePermalinkRequest() {
    const { currentDoc } = this.state;
    const permalinkUrl = urls.createFullyQualifiedUrl(urls.getArticleRevisionUrl(currentDoc.snapshotId));
    try {
      await clipboardCopy(permalinkUrl);
      message.success('Der Permalink wurde in die Zwischenablage kopiert');
    } catch (error) {
      const msg = (
        <span>
          <span>Der Permalink konnte nicht in die Zwischenablage kopiert werden:</span>
          <br />
          <a href={permalinkUrl}>{permalinkUrl}</a>
        </span>
      );
      message.error(msg, 10);
    }
  }

  handleAction({ name, data }) {
    switch (name) {
      case 'hard-delete':
        return this.hardDelete(data);
      default:
        throw new Error(`Unknown action ${name}`);
    }
  }

  async hardDelete({ sectionKey, sectionOrder, deletionReason, deleteDescendants }) {
    const { documentApiClient } = this.props;
    const { currentDoc } = this.state;
    const docKey = currentDoc.key;

    try {
      await documentApiClient.hardDeleteSection(sectionKey, sectionOrder, deletionReason, deleteDescendants);
    } catch (error) {
      errorHelper.handleApiError(error, logger);
    }

    const { docs } = await documentApiClient.getDocumentHistory(docKey);
    this.setState(prevState => ({
      docs: docs,
      currentDoc: docs.find(doc => doc.snapshotId === prevState.currentDoc.snapshotId) || docs[docs.length - 1]
    }));
  }

  render() {
    const { language } = this.props;
    const { docs, currentDoc } = this.state;

    let revisionPicker = null;

    if (docs.length > 1) {
      const marks = docs.reduce((accu, item, index) => {
        let text;
        if (index === 0) {
          text = 'erste';
        } else if (index === docs.length - 1) {
          text = 'aktuelle';
        } else {
          text = '';
        }
        accu[index] = text;
        return accu;
      }, {});

      revisionPicker = (
        <div className="DocPage-revisionPicker">
          <div className="DocPage-revisionPickerLabel">Revision:</div>
          <div className="DocPage-revisionPickerSlider">
            <Slider
              min={0}
              max={docs.length - 1}
              value={docs.indexOf(currentDoc)}
              step={null}
              marks={marks}
              onChange={this.handleIndexChanged}
              tipFormatter={this.formatRevisionTooltip}
              tooltipVisible
              />
          </div>
          <div className="DocPage-revisionPickerResetButton">
            <Button
              type="primary"
              icon={<PaperClipOutlined />}
              onClick={this.handlePermalinkRequest}
              >
              Permalink
            </Button>
          </div>
        </div>
      );
    }

    const headerActions = [
      {
        key: 'edit',
        type: 'primary',
        icon: EditOutlined,
        text: 'Bearbeiten',
        permission: permissions.EDIT_DOC,
        handleClick: this.handleEditClick
      }
    ];

    return (
      <Page headerActions={headerActions}>
        <div className="DocPage">
          {revisionPicker}
          <DocView doc={currentDoc} sections={currentDoc.sections} language={language} onAction={this.handleAction} />
        </div>
      </Page>
    );
  }
}

Doc.propTypes = {
  documentApiClient: PropTypes.instanceOf(DocumentApiClient).isRequired,
  initialState: PropTypes.shape({
    docs: PropTypes.arrayOf(fullDocShape)
  }).isRequired,
  language: PropTypes.string.isRequired
};

export default inject({
  documentApiClient: DocumentApiClient
}, Doc);