const React = require('react');
const autoBind = require('auto-bind');
const Input = require('antd/lib/input');
const message = require('antd/lib/message');
const { sectionEditorProps } = require('../../../ui/default-prop-types');

const { TextArea } = Input;

class IntervalTrainerEditor extends React.Component {
  constructor(props) {
    super(props);
    autoBind.react(this);
  }

  handleJSONValueChanged(event) {
    const { value } = event.target;

    let newContent;
    try {
      newContent = JSON.parse(value);
    } catch (err) {
      message.error('Kein gültiges JSON');
      return;
    }

    this.changeContent({ ...newContent });
  }

  changeContent(newContentValues) {
    const { content, onContentChanged } = this.props;
    onContentChanged({ ...content, ...newContentValues });
  }

  render() {
    const { content } = this.props;
    const json = JSON.stringify(content, null, 2) || '';

    return (
      <div>
        <TextArea value={json} onChange={this.handleJSONValueChanged} autosize={{ minRows: 3 }} />
      </div>
    );
  }
}

IntervalTrainerEditor.propTypes = {
  ...sectionEditorProps
};

module.exports = IntervalTrainerEditor;