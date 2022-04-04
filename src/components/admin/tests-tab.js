import by from 'thenby';
import { Card } from 'antd';
import Timeline from '../timeline.js';
import React, { useState } from 'react';
import { removeItemAt } from '../../utils/array-utils.js';

const ensurePartsOrder = parts => {
  return parts.sort(by(part => part.startTimecode));
};

function TestsTab() {
  const lastTimecode = 7;
  const initialParts = [
    {
      title: 'the brown fox',
      startTimecode: 0
    },
    {
      title: 'jumped the veeeeeeeeeery looooong fence',
      startTimecode: 2 * 1000
    },
    {
      title: 'the end',
      startTimecode: lastTimecode * 1000
    }
  ].map((part, index) => ({ ...part, key: index.toString() }));

  const [parts, setParts] = useState(ensurePartsOrder(initialParts));
  const length = (lastTimecode * 1000) + 1000;

  const handlePartAdd = startTimecode => {
    const newPart = {
      key: parts.length.toString(),
      title: parts.length.toString(),
      startTimecode
    };
    setParts(ensurePartsOrder([...parts, newPart]));
  };

  const handlePartDelete = key => {
    const part = parts.find(p => p.key === key);
    const partIndex = parts.findIndex(p => p.key === key);
    const nextPart = parts[partIndex + 1];
    if (nextPart) {
      nextPart.startTimecode = part.startTimecode;
    }
    const newParts = removeItemAt(parts, partIndex);
    setParts(newParts);
  };

  const handleStartTimecodeChange = (key, newStartTimecode) => {
    const part = parts.find(p => p.key === key);
    part.startTimecode = newStartTimecode;
    setParts(parts.slice());
  };

  return (
    <Card title="Timeline">
      <Timeline length={length} parts={parts} onPartAdd={handlePartAdd} onPartDelete={handlePartDelete} onStartTimecodeChange={handleStartTimecodeChange} />
    </Card>
  );
}

export default TestsTab;