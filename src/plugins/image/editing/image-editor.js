import React from 'react';
import autoBind from 'auto-bind';
import validation from '../../../ui/validation';
import { Form, Input, Radio, Switch } from 'antd';
import { inject } from '../../../components/container-context';
import CdnFilePicker from '../../../components/cdn-file-picker';
import ClientSettings from '../../../bootstrap/client-settings';
import ObjectMaxWidthSlider from '../../../components/object-max-width-slider';
import { sectionEditorProps, clientSettingsProps } from '../../../ui/default-prop-types';

const RadioButton = Radio.Button;
const RadioGroup = Radio.Group;
const FormItem = Form.Item;
const { TextArea } = Input;

class ImageEditor extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
  }

  handleExternalUrlValueChanged(event) {
    const { value } = event.target;
    this.changeContent({ url: value });
  }

  handleHoverExternalUrlValueChanged(event) {
    const { value } = event.target;
    const hover = this.props.content.hover || {};
    hover.url = value;
    this.changeContent({ hover });
  }

  handleInternalUrlValueChanged(value) {
    this.changeContent({ url: value });
  }

  handleHoverInternalUrlValueChanged(value) {
    const hover = this.props.content.hover || {};
    hover.url = value;
    this.changeContent({ hover });
  }

  handleTypeValueChanged(event) {
    const { value } = event.target;
    this.changeContent({ type: value, url: '' });
  }

  handleHoverTypeValueChanged(event) {
    const { value } = event.target;
    const hover = this.props.content.hover || {};
    hover.type = value;
    hover.url = '';
    this.changeContent({ hover });
  }

  handleMaxWidthValueChanged(value) {
    this.changeContent({ maxWidth: value });
  }

  changeContent(newContentValues) {
    const { content, onContentChanged } = this.props;
    onContentChanged({ ...content, ...newContentValues });
  }

  handleCurrentEditorValueChanged(event) {
    const newValue = event.target.value;
    this.changeContent({ text: newValue });
  }

  handleCurrentHoverEditorValueChanged(event) {
    const newValue = event.target.value;
    const hover = this.props.content.hover || {};
    hover.text = newValue;
    this.changeContent({ hover });
  }

  handleHoverSwitchChange(checked) {
    if (checked) {
      this.changeContent({ hover: { type: 'internal', url: '', text: '' } });
    } else {
      this.changeContent({ hover: null });
    }
  }

  render() {
    const { docKey, content, clientSettings } = this.props;
    const { type, url, maxWidth, text, hover } = content;

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
            <FormItem label="Externe URL" {...formItemLayout} {...validation.validateUrl(url)} hasFeedback>
              <Input value={url} onChange={this.handleExternalUrlValueChanged} />
            </FormItem>
          )}
          {type === 'internal' && (
            <FormItem label="Interne URL" {...formItemLayout}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Input
                  addonBefore={`${clientSettings.cdnRootUrl}/`}
                  value={url}
                  readOnly
                  />
                <CdnFilePicker
                  rootPrefix="media"
                  uploadPrefix={`media/${docKey}`}
                  initialPrefix={`media/${docKey}`}
                  fileName={url}
                  onFileNameChanged={this.handleInternalUrlValueChanged}
                  />
              </div>
            </FormItem>
          )}
          <Form.Item label="Copyright Infos" {...formItemLayout}>
            <TextArea value={text} onChange={this.handleCurrentEditorValueChanged} autoSize={{ minRows: 3 }} />
          </Form.Item>
          <Form.Item label="Hoverbild" {...formItemLayout}>
            <Switch checked={!!hover} onChange={this.handleHoverSwitchChange} />
          </Form.Item>
          {hover && (
            <div className="Panel">
              <div className="Panel-content Panel-content--darker">
                <FormItem label="Quelle" {...formItemLayout}>
                  <RadioGroup value={hover.type} onChange={this.handleHoverTypeValueChanged}>
                    <RadioButton value="external">Externer Link</RadioButton>
                    <RadioButton value="internal">Elmu CDN</RadioButton>
                  </RadioGroup>
                </FormItem>
                {hover.type === 'external' && (
                  <FormItem label="Externe URL" {...formItemLayout} {...validation.validateUrl(url)} hasFeedback>
                    <Input value={hover.url} onChange={this.handleHoverExternalUrlValueChanged} />
                  </FormItem>
                )}
                {hover.type === 'internal' && (
                  <FormItem label="Interne URL" {...formItemLayout}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Input
                        addonBefore={`${clientSettings.cdnRootUrl}/`}
                        value={hover.url}
                        readOnly
                        />
                      <CdnFilePicker
                        rootPrefix="media"
                        uploadPrefix={`media/${docKey}`}
                        initialPrefix={`media/${docKey}`}
                        fileName={hover.url}
                        onFileNameChanged={this.handleHoverInternalUrlValueChanged}
                        />
                    </div>
                  </FormItem>
                )}
                <Form.Item label="Copyright Infos" {...formItemLayout}>
                  <TextArea value={hover.text} onChange={this.handleCurrentHoverEditorValueChanged} autoSize={{ minRows: 3 }} />
                </Form.Item>
              </div>
            </div>
          )}
          <Form.Item label="Maximale Breite" {...formItemLayout}>
            <ObjectMaxWidthSlider value={maxWidth} onChange={this.handleMaxWidthValueChanged} />
          </Form.Item>
        </Form>
      </div>
    );
  }
}

ImageEditor.propTypes = {
  ...sectionEditorProps,
  ...clientSettingsProps
};

export default inject({
  clientSettings: ClientSettings
}, ImageEditor);
