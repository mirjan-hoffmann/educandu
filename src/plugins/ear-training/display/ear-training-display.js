import React from 'react';
import autoBind from 'auto-bind';
import arrayShuffle from 'array-shuffle';
import abcjs from '../../../common/abcjs-import';
import memoizeLast from '../../../utils/memoize-last';
import AudioPlayer from '../../../components/audio-player';
import ClientSettings from '../../../bootstrap/client-settings';
import { inject } from '../../../components/container-context';
import GithubFlavoredMarkdown from '../../../common/github-flavored-markdown';
import { sectionDisplayProps, clientSettingsProps } from '../../../ui/default-prop-types';

const abcOptions = {
  paddingtop: 0,
  paddingbottom: 0,
  paddingright: 0,
  paddingleft: 0,
  responsive: 'resize'
};

const midiOptions = {
  generateDownload: false,
  generateInline: true
};

class EarTrainingDisplay extends React.Component {
  constructor(props) {
    super(props);

    autoBind(this);

    this.abcContainerRef = React.createRef();
    this.midiContainerRef = React.createRef();

    const { githubFlavoredMarkdown, content } = this.props;

    this.renderMarkdown = memoizeLast(s => githubFlavoredMarkdown.render(s), 100, s => s);

    this.state = {
      title: content.title,
      maxWidth: content.maxWidth,
      tests: arrayShuffle(content.tests),
      currentIndex: 0,
      showResult: false
    };
  }

  componentDidMount() {
    const { tests, currentIndex, showResult } = this.state;
    const currentTest = tests[currentIndex];
    abcjs.renderAbc(this.abcContainerRef.current, showResult ? currentTest.fullAbcCode : currentTest.startAbcCode, abcOptions);
    abcjs.renderMidi(this.midiContainerRef.current, currentTest.fullAbcCode, midiOptions);
  }

  componentDidUpdate(prevProps, prevState) {
    const { tests, currentIndex, showResult } = this.state;
    const currentTest = tests[currentIndex];
    abcjs.renderAbc(this.abcContainerRef.current, showResult ? currentTest.fullAbcCode : currentTest.startAbcCode, abcOptions);
    if (tests !== prevState.tests || currentIndex !== prevState.currentIndex) {
      abcjs.renderMidi(this.midiContainerRef.current, currentTest.fullAbcCode, midiOptions);
    }
  }

  handleResultClick() {
    this.setState({ showResult: true });
  }

  handleNextClick() {
    const { currentIndex } = this.state;
    this.setState({ currentIndex: currentIndex + 1, showResult: false });
  }

  handleResetClick() {
    const { tests } = this.state;
    this.setState({ tests: arrayShuffle(tests), currentIndex: 0, showResult: false });
  }

  render() {
    const { clientSettings } = this.props;
    const { title, maxWidth, tests, currentIndex, showResult } = this.state;

    const currentTest = tests[currentIndex];

    let soundType;
    let soundUrl;
    let legendHtml;
    if (currentTest.sound && currentTest.sound.type === 'internal') {
      soundType = 'internal';
      soundUrl = currentTest.sound.url ? `${clientSettings.cdnRootUrl}/${currentTest.sound.url}` : null;
      legendHtml = currentTest.sound.text || '';
    } else if (currentTest.sound && currentTest.sound.type === 'external') {
      soundType = 'external';
      soundUrl = currentTest.sound.url || null;
      legendHtml = currentTest.sound.text || '';
    } else {
      soundType = 'midi';
      soundUrl = null;
      legendHtml = '';
    }

    const soundPlayer = soundType === 'midi'
      ? <div ref={this.midiContainerRef} />
      : <AudioPlayer soundUrl={soundUrl} legendHtml={legendHtml} />;

    const buttons = [];

    if (showResult && currentIndex < tests.length - 1) {
      buttons.push(<button key="next" type="button" onClick={this.handleNextClick}>Nächste Übung</button>);
    }

    if (currentTest && !showResult) {
      buttons.push(<button key="result" type="button" onClick={this.handleResultClick}>Auflösen</button>);
    }

    buttons.push(<button key="reset" type="button" onClick={this.handleResetClick}>Zurücksetzen</button>);

    return (
      <div className="EarTraining fa5">
        <div className={`EarTraining-testWrapper u-max-width-${maxWidth || 100}`}>
          <h3
            className="EarTraining-header"
            dangerouslySetInnerHTML={{ __html: this.renderMarkdown(title) }}
            />
          <div ref={this.abcContainerRef} />
          {soundPlayer}
          <div className="EarTraining-buttons">
            {buttons}
          </div>
        </div>
      </div>
    );
  }
}

EarTrainingDisplay.propTypes = {
  ...sectionDisplayProps,
  ...clientSettingsProps
};

export default inject({
  githubFlavoredMarkdown: GithubFlavoredMarkdown,
  clientSettings: ClientSettings
}, EarTrainingDisplay);