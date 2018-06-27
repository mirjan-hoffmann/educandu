const React = require('react');
const autoBind = require('auto-bind');
const { Form, Input, Radio } = require('antd');
const clientSettings = require('../../../bootstrap/client-settings');
const CdnFilePicker = require('../../../components/cdn-file-picker.jsx');
const { sectionEditorProps } = require('../../../ui/default-prop-types');

const FormItem = Form.Item;
const RadioGroup = Radio.Group;
const RadioButton = Radio.Button;

class AudioEditor extends React.Component {
  constructor(props) {
    super(props);
    autoBind.react(this);
  }

  handleExternalUrlValueChanged(event) {
    const { value } = event.target;
    this.changeContent({ url: value });
  }

  handleInternalUrlValueChanged(value) {
    this.changeContent({ url: value });
  }

  handleTypeValueChanged(event) {
    const { value } = event.target;
    this.changeContent({ type: value, url: '' });
  }

  changeContent(newContentValues) {
    const { content, onContentChanged } = this.props;
    onContentChanged({ ...content, ...newContentValues });
  }

  render() {
    const { content } = this.props;
    const { type, url } = content;

    const formItemLayout = {
      labelCol: { span: 4 },
      wrapperCol: { span: 14 }
    };

    return (
      <div>
        <Form layout="horizontal">
          <FormItem label="Quelle" {...formItemLayout}>
            <RadioGroup value={type} onChange={this.handleTypeValueChanged}>
              <RadioButton value="external">Externer Link</RadioButton>
              <RadioButton value="internal">Elmu CDN</RadioButton>
            </RadioGroup>
          </FormItem>
          {type === 'external' && (
            <FormItem label="Externe URL" {...formItemLayout}>
              <Input value={url} onChange={this.handleExternalUrlValueChanged} />
            </FormItem>
          )}
          {type === 'internal' && (
            <FormItem label="Interne URL" {...formItemLayout}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Input
                  addonBefore={`${clientSettings.cdnRootURL}/`}
                  value={url}
                  readOnly
                  />
                <CdnFilePicker
                  rootPrefix="media"
                  fileName={url}
                  onFileNameChanged={this.handleInternalUrlValueChanged}
                  />
              </div>
            </FormItem>
          )}
        </Form>
      </div>
    );
  }
}

AudioEditor.propTypes = {
  ...sectionEditorProps
};

module.exports = AudioEditor;
