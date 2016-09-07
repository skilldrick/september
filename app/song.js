import getAudioBuffer from 'sine/ajax';
import { ctx, getCurrentTime } from 'sine/audio';
import { createBufferSource, createGain } from 'sine/nodes';
import { connect, Node, semitoneToRate } from 'sine/util';
import clock from 'sine/clock';
import { FmSynth } from 'sine/synth';
import { SingleBufferSampler } from 'sine/sampler';
import Scheduler from 'sine/scheduler';



const loadInitialBuffers = () => {
  const fileNames = {
    september: 'september-acapella.mp3',
    cissy: 'cissy-strut-start.mp3',
    chic: 'chic.mp3'
  };

  // Returns a Promise of an object of buffer names to buffers
  return Promise.all(_.toPairs(fileNames).map(([name, fileName]) =>
    getAudioBuffer(fileName).then(buff => [name, buff])
  )).then(bufferArray => _.fromPairs(bufferArray));
}


class CissyBass extends Node {
  pattern = "11.11.11.10..08..08.10.08.06.01..03..03"
  constructor(cissyBuffer) {
    super();

    this.sampler = new SingleBufferSampler(cissyBuffer);

    connect(this.sampler, this.output);
  }

  subBeats = 2
  loopLength = 16

  onBeat(beat, whenFunc, lengthFunc) {
    for (let subBeat = 0; subBeat < this.subBeats; subBeat++) {
      this.onSubBeat(
        (beat * this.subBeats + subBeat) % this.loopLength,
        whenFunc(subBeat / this.subBeats)
      );
    }
  }

  onSubBeat(subBeat, when) {
    const semitone = this.pattern.split(".")[subBeat];

    if (semitone && semitone !== "") {
      console.log(semitone);
      this.sampler.playOffset(16.69, when, 0.17, 1, semitoneToRate(-8.8 + +semitone))
    }
  }
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
      H: 45.07
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

  onBeat(beat, whenFunc, lengthFunc) {
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
    verse1_1: 15.4,
    verse1_2: 14.2,
    chorus1_1: 15
  });

  connect(septemberVocals, ctx.destination);
  window.septemberVocals = septemberVocals;


  const cissyBeat = new CissyBeat(buffers.cissy);
  connect(cissyBeat, ctx.destination);

  window.cissySampler = new SingleBufferSampler(buffers.cissy, {
  
  });
  connect(window.cissySampler, ctx.destination);
  const cissyBass = new CissyBass(buffers.cissy);
  connect(cissyBass, ctx.destination);

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

  window.chic = new SingleBufferSampler(buffers.chic);
  connect(window.chic, ctx.destination);



  clock.onBeat((beat, whenFunc, lengthFunc) => {
    synth.playNote(12, whenFunc(0), 0.1);

    if (beat % 8 == 4 || beat % 8 == 5) {
      synth.playNote(14, whenFunc(0), 0.1);
    }

    if (beat % 64 == 6) {
      septemberVocals.play('verse1_1', whenFunc(3/8));
    }

    if (beat % 64 == 38) {
      septemberVocals.play('verse1_2', whenFunc(3/8));
    }


    cissyBeat.onBeat(beat, whenFunc, lengthFunc);
    cissyBass.onBeat(beat, whenFunc, lengthFunc);

    // TODO: make these notes controllable from keyboard
    if (beat % 16 == 8) {
      chic.playOffset(34.52, whenFunc(), 0.4, 1, semitoneToRate(4.8))
    }
    if (beat % 16 == 0) {
      chic.playOffset(34.52, whenFunc(), 0.4, 1, semitoneToRate(3.8))
    }

    if (beat % 16 == 15) {
      chic.playOffset(38.11, whenFunc(0), lengthFunc(0.5), 1, 0.82)
    }
    if (beat % 16 == 7 || beat % 16 == 15) {
      chic.playOffset(38.11, whenFunc(0.5), lengthFunc(1), 1, 0.82)
    }
  });

  clock.start();

  const keydown = (event) => {
    const keys = [90, 83, 88, 68, 67, 86, 71, 66, 72, 78, 74, 77, 188];
    const semitone = keys.indexOf(event.which);
    console.log(semitone);
    console.log(event);

    if (semitone !== -1) {
      if (event.shiftKey) {
        cissySampler.playOffset(15.17, 0, 0.17, 1, semitoneToRate(-8.8 + semitone))
      } else {
        cissySampler.playOffset(16.69, 0, 0.17, 1, semitoneToRate(-8.8 + semitone))
      }
    }
  };

  return {
    clock,
    keydown
  };
});
