import Logger from '../common/logger.js';
import { Container } from '../common/di.js';
import AudioInfo from './audio/audio-info.js';
import VideoInfo from './video/video-info.js';
import ImageInfo from './image/image-info.js';
import TableInfo from './table/table-info.js';
import IframeInfo from './iframe/iframe-info.js';
import CatalogInfo from './catalog/catalog-info.js';
import { isBrowser } from '../ui/browser-helper.js';
import MarkdownInfo from './markdown/markdown-info.js';
import ClientConfig from '../bootstrap/client-config.js';
import PdfViewerInfo from './pdf-viewer/pdf-viewer-info.js';
import AnnotationInfo from './annotation/annotation-info.js';
import DiagramNetInfo from './diagram-net/diagram-net-info.js';
import QuickTesterInfo from './quick-tester/quick-tester-info.js';
import AbcNotationInfo from './abc-notation/abc-notation-info.js';
import EarTrainingInfo from './ear-training/ear-training-info.js';
import AudioWaveformInfo from './audio-waveform/audio-waveform-info.js';
import MediaAnalysisInfo from './media-analysis/media-analysis-info.js';
import MatchingCardsInfo from './matching-cards/matching-cards-info.js';
import MediaSlideshowInfo from './media-slideshow/media-slideshow-info.js';
import MusicXmlViewerInfo from './music-xml-viewer/music-xml-viewer-info.js';
import MultitrackMediaInfo from './multitrack-media/multitrack-media-info.js';
import TableOfContentsInfo from './table-of-contents/table-of-contents-info.js';
import InteractiveMediaInfo from './interactive-media/interactive-media-info.js';
import MarkdownWithImageInfo from './markdown-with-image/markdown-with-image-info.js';

const logger = new Logger(import.meta.url);

const allPossibleInfoTypes = [
  AudioInfo,
  VideoInfo,
  ImageInfo,
  TableInfo,
  IframeInfo,
  CatalogInfo,
  MarkdownInfo,
  PdfViewerInfo,
  AnnotationInfo,
  DiagramNetInfo,
  QuickTesterInfo,
  AbcNotationInfo,
  EarTrainingInfo,
  AudioWaveformInfo,
  MediaAnalysisInfo,
  MatchingCardsInfo,
  MediaSlideshowInfo,
  MusicXmlViewerInfo,
  TableOfContentsInfo,
  MultitrackMediaInfo,
  InteractiveMediaInfo,
  MarkdownWithImageInfo
];

class RegisteredPlugin {
  constructor(info) {
    this.info = info;
    this.displayComponent = this.info.getDisplayComponent();
    this.editorComponent = null;
  }

  async ensureEditorComponentIsResolved() {
    this.editorComponent = await this.info.resolveEditorComponent();
  }
}

class PluginRegistry {
  static get inject() { return [Container, ClientConfig]; }

  constructor(container, clientConfig) {
    this.pluginMap = clientConfig.plugins.reduce((map, typeName) => {
      const infoType = allPossibleInfoTypes.find(type => type.typeName === typeName);
      if (!infoType) {
        throw new Error(`Plugin type "${typeName}" is not available`);
      }

      if (!isBrowser()) {
        logger.info(`Registering plugin type ${infoType.typeName}`);
      }

      map.set(infoType.typeName, new RegisteredPlugin(container.get(infoType)));
      return map;
    }, new Map());
  }

  ensureAllEditorsAreLoaded() {
    return Promise.all([...this.pluginMap.values()].map(plugin => plugin.ensureEditorComponentIsResolved()));
  }

  getAllInfos() {
    return [...this.pluginMap.values()].map(plugin => plugin.info);
  }

  tryGetInfo(pluginType) {
    return this.pluginMap.get(pluginType)?.info;
  }

  getInfo(pluginType) {
    const info = this.tryGetInfo(pluginType);
    if (!info) {
      throw new Error(`Plugin type "${pluginType}" is not registered`);
    }

    return info;
  }

  tryGetDisplayComponent(pluginType) {
    return this.pluginMap.get(pluginType)?.displayComponent;
  }

  tryGetEditorComponent(pluginType) {
    return this.pluginMap.get(pluginType)?.editorComponent;
  }
}

export default PluginRegistry;
