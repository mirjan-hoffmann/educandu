import Plyr from 'plyr';
import PropTypes from 'prop-types';
import { useStableCallback } from '../../../ui/hooks.js';
import PlayIcon from '../../icons/media-player/play-icon.js';
import { memoAndTransformProps } from '../../../ui/react-helper.js';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MEDIA_ASPECT_RATIO, MEDIA_PROGRESS_INTERVAL_IN_MILLISECONDS } from '../../../domain/constants.js';

function Htlm5Player({
  volume,
  audioOnly,
  sourceUrl,
  aspectRatio,
  playbackRate,
  playbackRange,
  posterImageUrl,
  playerRef,
  onReady,
  onPlay,
  onPause,
  onEnded,
  onDuration,
  onProgress
}) {
  const plyrRef = useRef(null);
  const progressInterval = useRef(null);

  const [player, setPlayer] = useState(null);
  const [showPosterImage, setShowPosterImage] = useState(true);
  const [sourceDurationInMs, setSourceDurationInMs] = useState(0);

  const playbackRangeInMs = useMemo(() => [
    playbackRange[0] * sourceDurationInMs,
    playbackRange[1] * sourceDurationInMs
  ], [playbackRange, sourceDurationInMs]);

  const triggerPlay = useCallback(() => {
    if (player) {
      setShowPosterImage(false);
      const currentActualTimeInMs = player.currentTime * 1000;
      const isEndReached = !!playbackRangeInMs[1] && currentActualTimeInMs >= playbackRangeInMs[1];

      if (isEndReached) {
        player.currentTime = playbackRangeInMs[0] / 1000;
      }

      player.play();
    }
  }, [player, playbackRangeInMs]);

  const triggerPause = useCallback(() => {
    player?.pause();
  }, [player]);

  const triggerSeek = useCallback(seekedTimeWithinRangeInMs => {
    if (player) {
      const actualTimeInMs = playbackRangeInMs[0] + seekedTimeWithinRangeInMs;
      player.currentTime = actualTimeInMs / 1000;
    }
  }, [player, playbackRangeInMs]);

  const setProgressInterval = callback => {
    clearInterval(progressInterval.current);
    progressInterval.current = null;
    if (callback) {
      progressInterval.current = setInterval(callback, MEDIA_PROGRESS_INTERVAL_IN_MILLISECONDS);
    }
  };

  useEffect(() => {
    const playerInstance = new Plyr(plyrRef.current, {
      controls: [],
      ratio: aspectRatio,
      clickToPlay: true,
      loadSprite: false,
      blankVideo: '',
      fullscreen: { enabled: false, fallback: false }
    });
    setPlayer(playerInstance);
  }, [plyrRef, aspectRatio]);

  useEffect(() => {
    if (player) {
      player.source = {
        type: audioOnly ? 'audio' : 'video',
        sources: [{ src: sourceUrl, provider: 'html5' }]
      };
    }
  }, [player, sourceUrl, audioOnly]);

  useEffect(() => {
    if (player) {
      player.speed = playbackRate;
    }
  }, [player, playbackRate]);

  useEffect(() => {
    if (player) {
      player.volume = volume;
    }
  }, [player, volume]);

  useEffect(() => {
    if (player && playbackRangeInMs[0] > 0) {
      player.currentTime = playbackRangeInMs[0] / 1000;
    }
  }, [player, playbackRangeInMs]);

  const handleEnded = useCallback(() => {
    setProgressInterval(null);
    onEnded();
  }, [onEnded]);

  const handleProgress = useCallback(() => {
    if (player && sourceDurationInMs) {
      const currentActualTimeInMs = player.currentTime * 1000;
      const isEndReached = currentActualTimeInMs >= playbackRangeInMs[1];

      if (!isEndReached) {
        const currentTimeWithinRangeInMs = currentActualTimeInMs - playbackRangeInMs[0];
        onProgress(currentTimeWithinRangeInMs);
        return;
      }

      triggerPause();

      const endTimeWithinRangeInMs = playbackRangeInMs[1] - playbackRangeInMs[0];
      onProgress(endTimeWithinRangeInMs);

      handleEnded();
    }
  }, [player, sourceDurationInMs, playbackRangeInMs, onProgress, triggerPause, handleEnded]);

  const handleLoadedMetadata = useCallback(() => {
    if (player.duration) {
      const actualDurationInMs = player.duration * 1000;
      const playbackDurationInMs = actualDurationInMs * (playbackRange[1] - playbackRange[0]);
      setSourceDurationInMs(actualDurationInMs);
      onDuration(playbackDurationInMs);
    }
  }, [player, playbackRange, onDuration]);

  const handleReady = useCallback(() => {
    onReady();
  }, [onReady]);

  const handlePlaying = useCallback(() => {
    onPlay();
    setProgressInterval(() => handleProgress());
  }, [onPlay, handleProgress]);

  const handlePause = useCallback(() => {
    onPause();
    setProgressInterval(null);
  }, [onPause]);

  useEffect(() => {
    if (player) {
      player.once('loadedmetadata', handleLoadedMetadata);

      player.once('ready', handleReady);

      player.off('playing', handlePlaying);
      player.on('playing', handlePlaying);

      player.off('pause', handlePause);
      player.on('pause', handlePause);

      player.off('seeking', handleProgress);
      player.on('seeking', handleProgress);

      player.off('progress', handleProgress);
      player.on('progress', handleProgress);

      player.off('timeupdate', handleProgress);
      player.on('timeupdate', handleProgress);

      player.off('ended', handleEnded);
      player.on('ended', handleEnded);
    }
  }, [player, handleLoadedMetadata, handleReady, handlePlaying, handlePause, handleProgress, handleEnded]);

  playerRef.current = useMemo(() => ({
    play: triggerPlay,
    pause: triggerPause,
    seekToTimecode: triggerSeek
  }), [triggerPlay, triggerPause, triggerSeek]);

  return (
    <div className="Html5Player">
      <video ref={plyrRef} />
      {!audioOnly && !!posterImageUrl && !!showPosterImage && (
        <div className="Html5Player-posterImage" style={{ backgroundImage: `url(${posterImageUrl})` }} />
      )}
      {!audioOnly && !player?.playing && (
        <div className="Html5Player-playOverlay" onClick={triggerPlay} >
          <div className="Html5Player-playOverlayIcon">
            <PlayIcon />
          </div>
        </div>
      )}
    </div>
  );
}

Htlm5Player.propTypes = {
  volume: PropTypes.number.isRequired,
  audioOnly: PropTypes.bool,
  sourceUrl: PropTypes.string.isRequired,
  aspectRatio: PropTypes.oneOf(Object.values(MEDIA_ASPECT_RATIO)),
  onReady: PropTypes.func,
  onPlay: PropTypes.func,
  onPause: PropTypes.func,
  onEnded: PropTypes.func,
  onDuration: PropTypes.func,
  onProgress: PropTypes.func,
  playbackRate: PropTypes.number,
  playbackRange: PropTypes.arrayOf(PropTypes.number),
  posterImageUrl: PropTypes.string,
  playerRef: PropTypes.shape({
    current: PropTypes.any
  })
};

Htlm5Player.defaultProps = {
  audioOnly: false,
  aspectRatio: MEDIA_ASPECT_RATIO.sixteenToNine,
  onReady: () => {},
  onPlay: () => {},
  onPause: () => {},
  onEnded: () => {},
  onDuration: () => {},
  onProgress: () => {},
  playbackRate: 1,
  playbackRange: [0, 1],
  posterImageUrl: null,
  playerRef: {
    current: null
  }
};

export default memoAndTransformProps(Htlm5Player, ({
  onReady,
  onPlay,
  onPause,
  onEnded,
  onDuration,
  onProgress,
  ...rest
}) => ({
  onReady: useStableCallback(onReady),
  onPlay: useStableCallback(onPlay),
  onPause: useStableCallback(onPause),
  onEnded: useStableCallback(onEnded),
  onDuration: useStableCallback(onDuration),
  onProgress: useStableCallback(onProgress),
  ...rest
}));