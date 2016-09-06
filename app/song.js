import getAudioBuffer from 'sine/ajax';
import { ctx, getCurrentTime } from 'sine/audio';
import { createBufferSource, createGain } from 'sine/nodes';
import { connect, Node } from 'sine/util';
import clock from 'sine/clock';
import { FmSynth } from 'sine/synth';
import { SingleBufferSampler } from 'sine/sampler';
import Scheduler from 'sine/scheduler';



const loadInitialBuffers = () => {
  const fileNames = {
    september: 'september-acapella.mp3',
    cissy: 'cissy-strut-start.mp3'
  };

  // Returns a Promise of an object of buffer names to buffers
  return Promise.all(_.toPairs(fileNames).map(([name, fileName]) =>
    getAudioBuffer(fileName).then(buff => [name, buff])
  )).then(bufferArray => _.fromPairs(bufferArray));
}

class CissyBeat extends Node {
  patterns = [
  // |       |       |       |       |
    "HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH",
    //"K SKK S K SK KS K SK KS K SK KSS"
    "K S KKS K SK KS K S KKS K SK KSS"
  ]

  constructor(cissyBuffer) {
    super();

    this.sampler = new SingleBufferSampler(cissyBuffer, {
      K: 42.73,
      S: 38.45,
      H: 45.07,
    });

    //TODO: modify SingleBufferSampler constructor so this can be done in one go
    this.sampler.setLengths({
      K: 0.3,
      S: 0.2,
      H: 0.15
    });

    window.sampler = this.sampler;

    connect(this.sampler, this.output);
  }

  subBeats = 2
  loopLength = 32

  onBeat(beat, whenFunc, length) {
    for (let subBeat = 0; subBeat < this.subBeats; subBeat++) {
      this.onSubBeat(
        (beat * this.subBeats + subBeat) % this.loopLength,
        whenFunc(subBeat / this.subBeats)
      );
    }
  }

  onSubBeat(subBeat, when) {
    //this.sampler.play('H', when);
    this.patterns.forEach(pattern => {
      const sample = pattern[subBeat];
      if (sample && sample !== " ") {
        sampler.play(sample, when);
      }
    });
  }
}

export default loadInitialBuffers().then(buffers => {
  const septemberVocals = new SingleBufferSampler(buffers.september, {
    verse1_1: 22,
    verse1_2: 37.4,
    chorus1_1: 51.6
  });

  septemberVocals.setLengths({
    verse1_1: 15,
    verse1_2: 14.2,
    chorus1_1: 15
  });

  connect(septemberVocals, ctx.destination);
  window.septemberVocals = septemberVocals;


  const cissyBeat = new CissyBeat(buffers.cissy);
  connect(cissyBeat, ctx.destination);

  const synth = new FmSynth({
    attack: 0.01,
    decay: 0.1,
    sustain: 0.8,
    release: 0.1
  });

  const gain = createGain(0.1);
  connect(synth, gain, ctx.destination);

  clock.setBpm(124.55);
  window.clock = clock;

  clock.onBeat((beat, whenFunc, length) => {
    synth.playNote(12, whenFunc(0), 0.1);

    if (beat % 8 == 4 || beat % 8 == 5) {
      synth.playNote(14, whenFunc(0), 0.1);
    }

    if (beat % 16 == 6) {
      septemberVocals.play('verse1_1', whenFunc(3/8));
    }

    cissyBeat.onBeat(beat, whenFunc, length);
  });

  return clock;
});
