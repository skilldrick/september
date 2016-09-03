import getAudioBuffer from 'sine/ajax';
import { ctx, getCurrentTime } from 'sine/audio';
import { createBufferSource, createGain } from 'sine/nodes';
import { connect } from 'sine/util';
import clock from 'sine/clock';
import { FmSynth } from 'sine/synth';
import { SingleBufferSampler } from 'sine/sampler';

export default getAudioBuffer('september-acapella.mp3').then(buffer => {
  const sampler = new SingleBufferSampler(buffer, {
    verse1_1: 22,
    verse1_2: 30
  });

  sampler.setLengths({
    verse1_1: 15,
    verse1_2: 2
  });

  connect(sampler, ctx.destination);
  window.sampler = sampler;

  const synth = new FmSynth();
  const gain = createGain(0.1);
  connect(synth, gain, ctx.destination);
  synth.adsr = { attack: 0, decay: 0, sustain: 1, release: 0 };

  clock.setBpm(124.55);
  window.clock = clock;
  clock.onBeat((beat, when, length) => {
    synth.playNote(12, when(0), 0.1);

    if (beat % 8 == 4 || beat % 8 == 5) {
      synth.playNote(14, when(0), 0.1);
    }

    if (beat % 16 == 6) {
      sampler.play('verse1_1', when(3/8));
    }
  });

  clock.start();

  return sampler;
});
