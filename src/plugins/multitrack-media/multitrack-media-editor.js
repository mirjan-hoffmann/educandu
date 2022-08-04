import React, { useState } from 'react';
import { Button, Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { PlusOutlined } from '@ant-design/icons';
import cloneDeep from '../../utils/clone-deep.js';
import ItemPanel from '../../components/item-panel.js';
import TrackMixer from '../../components/track-mixer.js';
import { sectionEditorProps } from '../../ui/default-prop-types.js';
import MainTrackEditor from '../../components/main-track-editor.js';
import { removeItemAt, swapItemsAt } from '../../utils/array-utils.js';
import ObjectWidthSlider from '../../components/object-width-slider.js';
import { createDefaultSecondaryTrack } from './multitrack-media-utils.js';
import SecondaryTrackEditor from '../../components/secondary-track-editor.js';

const FormItem = Form.Item;

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 14 }
};

function MultitrackMediaEditor({ content, onContentChanged }) {
  const { t } = useTranslation('multitrackMedia');
  const [sourceDurationMainTrack, setSourceDurationMainTrack] = useState(0);
  const [sourceDurationsSecondaryTracks, setSourceDurationsSecondaryTracks] = useState(content.secondaryTracks.map(() => 0));

  const { width, mainTrack, secondaryTracks } = content;
  const playbackDuration = (mainTrack.playbackRange[1] - mainTrack.playbackRange[0]) * sourceDurationMainTrack;

  const changeContent = newContentValues => {
    const newContent = { ...content, ...newContentValues };
    const isInvalid = false;
    onContentChanged(newContent, isInvalid);
  };

  const handleMainTrackNameChanged = event => {
    const { value } = event.target;
    changeContent({ mainTrack: { ...mainTrack, name: value } });
  };

  const handleMainTrackDurationDetermined = duration => {
    console.log(duration);
    setSourceDurationMainTrack(duration);
  };

  const handleSecondaryTrackDurationDetermined = (index, duration) => {
    const newDurations = cloneDeep(secondaryTracks);
    newDurations[index] = duration;
    console.log(newDurations);
    setSourceDurationsSecondaryTracks(newDurations);
  };

  const handeSecondaryTrackContentChanged = (index, value) => {
    const newSecondaryTracks = cloneDeep(secondaryTracks);
    newSecondaryTracks[index] = value;
    changeContent({ secondaryTracks: newSecondaryTracks });
  };

  const handleMainTrackContentChanged = newMainTrackContent => {
    changeContent({ mainTrack: newMainTrackContent });
  };

  const handleWidthChanged = newValue => {
    changeContent({ width: newValue });
  };

  const handleMoveTrackUp = index => {
    changeContent({ secondaryTracks: swapItemsAt(secondaryTracks, index, index - 1) });
  };

  const handleMoveTrackDown = index => {
    changeContent({ secondaryTracks: swapItemsAt(secondaryTracks, index, index + 1) });
  };

  const handleDeleteTrack = index => {
    changeContent({ secondaryTracks: removeItemAt(secondaryTracks, index) });
  };

  const handleAddTrackButtonClick = () => {
    const newSecondaryTracks = secondaryTracks.slice();
    newSecondaryTracks.push(createDefaultSecondaryTrack(newSecondaryTracks.length, t));
    changeContent({ secondaryTracks: newSecondaryTracks });
  };

  const handleMainTrackVolumeChange = volume => {
    const newMainTrack = cloneDeep(mainTrack);
    newMainTrack.volume = volume;
    changeContent({ mainTrack: newMainTrack });
  };

  const handleSecondaryTrackVolumeChange = (index, volume) => {
    const newSecondaryTracks = cloneDeep(secondaryTracks);
    newSecondaryTracks[index].volume = volume;
    changeContent({ secondaryTracks: newSecondaryTracks });
  };

  return (
    <div className="MultitrackMediaEditor">
      <Form layout="horizontal">
        <ItemPanel header={t('mainTrack')} collapsed>
          <FormItem label={t('common:name')} {...formItemLayout}>
            <Input value={mainTrack?.name} onChange={handleMainTrackNameChanged} />
          </FormItem>
          <MainTrackEditor
            content={mainTrack}
            onContentChanged={handleMainTrackContentChanged}
            onDurationDetermined={handleMainTrackDurationDetermined}
            />
        </ItemPanel>

        {secondaryTracks.map((secondaryTrack, index) => (
          <ItemPanel
            index={index}
            collapsed
            key={index.toString()}
            itemsCount={secondaryTracks.length}
            header={t('secondaryTrack', { number: index + 1 })}
            onMoveUp={handleMoveTrackUp}
            onMoveDown={handleMoveTrackDown}
            onDelete={handleDeleteTrack}
            >
            <SecondaryTrackEditor
              content={secondaryTrack}
              onDurationDetermined={duration => handleSecondaryTrackDurationDetermined(index, duration)}
              onContentChanged={value => handeSecondaryTrackContentChanged(index, value)}
              />
          </ItemPanel>
        ))}
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTrackButtonClick}>
          {t('addTrack')}
        </Button>
        <ItemPanel header={t('trackMixer')}>
          <TrackMixer
            mainTrack={mainTrack}
            secondaryTracks={secondaryTracks}
            playbackDuration={playbackDuration}
            onMainTrackVolumeChange={handleMainTrackVolumeChange}
            secondaryTracksDurations={sourceDurationsSecondaryTracks}
            onSecondaryTrackVolumeChange={handleSecondaryTrackVolumeChange}
            />
        </ItemPanel>

        <FormItem label={t('common:width')} {...formItemLayout}>
          <ObjectWidthSlider value={width} onChange={handleWidthChanged} />
        </FormItem>
      </Form>
    </div>
  );
}

MultitrackMediaEditor.propTypes = {
  ...sectionEditorProps
};

export default MultitrackMediaEditor;
