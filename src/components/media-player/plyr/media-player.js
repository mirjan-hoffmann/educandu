import PropTypes from 'prop-types';
import classNames from 'classnames';
import Html5Player from './html5-player.js';
import React, { useRef, useState } from 'react';
import YoutubePlayer from './youtube-player.js';
import { useService } from '../../container-context.js';
import HttpClient from '../../../api-clients/http-client.js';
import MediaPlayerControls from '../media-player-controls.js';
import ClientConfig from '../../../bootstrap/client-config.js';
import MediaPlayerProgressBar from '../media-player-progress-bar.js';
import { isInternalSourceType, isYoutubeSourceType } from '../../../utils/source-utils.js';
import {
  MEDIA_PLAY_STATE,
  MEDIA_SCREEN_MODE,
  MEDIA_ASPECT_RATIO
} from '../../../domain/constants.js';

function MediaPlayer({
  sourceUrl,
  playbackRange,
  parts,
  screenMode,
  aspectRatio,
  canDownload,
  downloadFileName,
  posterImageUrl,
  mediaPlayerRef,
  customUnderScreenContent,
  onProgress
}) {
  const player = useRef();
  const [volume, setVolume] = useState(1);
  const httpClient = useService(HttpClient);
  const clientConfig = useService(ClientConfig);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playedMilliseconds, setPlayedMilliseconds] = useState(0);
  const [durationInMilliseconds, setDurationInMilliseconds] = useState(0);
  const [playState, setPlayState] = useState(MEDIA_PLAY_STATE.initializing);

  const handleDuration = newDurationInMilliseconds => {
    setDurationInMilliseconds(newDurationInMilliseconds);
  };

  const handleProgress = progressInMilliseconds => {
    setPlayedMilliseconds(progressInMilliseconds);
    onProgress(progressInMilliseconds);
  };

  const handlePlayClick = () => {
    player.current.play();
  };

  const handlePlaying = () => {
    setPlayState(MEDIA_PLAY_STATE.playing);
  };

  const handlePauseClick = () => {
    player.current.pause();
    setPlayState(MEDIA_PLAY_STATE.pausing);
  };

  const handlePausing = () => {
    setPlayState(MEDIA_PLAY_STATE.pausing);
  };

  const handleEnded = () => {
    setPlayState(MEDIA_PLAY_STATE.stopped);
  };

  const handleSeek = milliseconds => {
    player.current.seekToTimecode(milliseconds);
  };

  const handleBuffering = () => {
    setPlayState(MEDIA_PLAY_STATE.buffering);
  };

  const handlePlaybackRateChange = newRate => {
    setPlaybackRate(newRate);
  };

  const handleDownloadClick = () => {
    const withCredentials = isInternalSourceType({ url: sourceUrl, cdnRootUrl: clientConfig.cdnRootUrl });
    httpClient.download(sourceUrl, downloadFileName, withCredentials);
  };

  mediaPlayerRef.current = {
    play: player.current?.play,
    pause: player.current?.pause
  };

  const Player = isYoutubeSourceType(sourceUrl) ? YoutubePlayer : Html5Player;
  const audioOnly = screenMode !== MEDIA_SCREEN_MODE.video;

  const playerClasses = classNames(
    'MediaPlayer-player',
    { 'MediaPlayer-player--audioOnly': audioOnly },
    { 'MediaPlayer-player--sixteenToNine': aspectRatio === MEDIA_ASPECT_RATIO.sixteenToNine },
    { 'MediaPlayer-player--fourToThree': aspectRatio === MEDIA_ASPECT_RATIO.fourToThree }
  );

  return (
    <div className={classNames('MediaPlayer', { 'MediaPlayer--noScreen': screenMode === MEDIA_SCREEN_MODE.none })}>
      <div className={playerClasses}>
        <Player
          volume={volume}
          sourceUrl={sourceUrl}
          aspectRatio={aspectRatio}
          playbackRate={playbackRate}
          playbackRange={playbackRange}
          posterImageUrl={posterImageUrl}
          playerRef={player}
          audioOnly={audioOnly}
          onPlay={handlePlaying}
          onPause={handlePausing}
          onEnded={handleEnded}
          onDuration={handleDuration}
          onProgress={handleProgress}
          onBuffering={handleBuffering}
          />
      </div>
      {!!customUnderScreenContent && (<div>{customUnderScreenContent}</div>)}
      <MediaPlayerProgressBar
        playedMilliseconds={playedMilliseconds}
        durationInMilliseconds={durationInMilliseconds}
        onSeek={handleSeek}
        parts={parts}
        />
      <MediaPlayerControls
        volume={volume}
        playState={playState}
        screenMode={screenMode}
        playedMilliseconds={playedMilliseconds}
        durationInMilliseconds={durationInMilliseconds}
        onVolumeChange={setVolume}
        onPlayClick={handlePlayClick}
        onPauseClick={handlePauseClick}
        onPlaybackRateChange={handlePlaybackRateChange}
        onDownloadClick={canDownload ? handleDownloadClick : null}
        />
    </div>
  );
}

MediaPlayer.propTypes = {
  sourceUrl: PropTypes.string.isRequired,
  playbackRange: PropTypes.arrayOf(PropTypes.number),
  parts: PropTypes.arrayOf(PropTypes.shape({
    startPosition: PropTypes.number.isRequired
  })),
  screenMode: PropTypes.oneOf(Object.values(MEDIA_SCREEN_MODE)),
  aspectRatio: PropTypes.oneOf(Object.values(MEDIA_ASPECT_RATIO)),
  downloadFileName: PropTypes.string,
  canDownload: PropTypes.bool,
  posterImageUrl: PropTypes.string,
  mediaPlayerRef: PropTypes.shape({
    current: PropTypes.any
  }),
  customUnderScreenContent: PropTypes.node,
  onProgress: PropTypes.func
};

MediaPlayer.defaultProps = {
  playbackRange: [0, 1],
  parts: [],
  aspectRatio: MEDIA_ASPECT_RATIO.sixteenToNine,
  screenMode: MEDIA_SCREEN_MODE.video,
  canDownload: false,
  downloadFileName: null,
  posterImageUrl: null,
  mediaPlayerRef: {
    current: null
  },
  customUnderScreenContent: null,
  onProgress: () => {}
};

export default MediaPlayer;
