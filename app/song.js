import getAudioBuffer from 'sine/ajax';
import { ctx, getCurrentTime } from 'sine/audio';
import { createBufferSource, createGain } from 'sine/nodes';
import { connect, Node, semitoneToRate } from 'sine/util';
import clock from 'sine/clock';
import { FmSynth, HarmonicSynth, SamplerSynth } from 'sine/synth';
import { SingleBufferSampler } from 'sine/sampler';
import Scheduler from 'sine/scheduler';


const loadBuffers = (fileNames) => {
  // Returns a Promise of an object of buffer names to buffers
  return Promise.all(_.toPairs(fileNames).map(([name, fileName]) =>
    getAudioBuffer(fileName).then(buff => [name, buff])
  )).then(bufferArray => _.fromPairs(bufferArray));
}


const loadInitialBuffers = () => {
  const fileNames = {
    september: 'september-acapella.mp3',
    cissy: 'cissy-strut-start.mp3',
    chic: 'chic.mp3'
  };

  return loadBuffers(fileNames);
}

const loadMellotron = () => {
  const noteNameToFileName = (noteName) => {
    return "woodwind/" + noteName[0].toUpperCase() + noteName[1] + ".mp3";
  }

  /*
  const noteNames = [
    'g2', 'a2', 'b2',
    'c3', 'd3', 'e3', 'f3', 'g3', 'a3', 'b3',
    'c4', 'd4', 'e4', 'f4', 'g4', 'a4', 'b4',
    'c5', 'd5', 'e5', 'f5'
  ];
  */
  // cut down on bandwidth by only sending a few notes
  const noteNames = [
    'g2',
    'c3', 'e3', 'g3', 'a3',
    'c4', 'e4', 'g4', 'a4',
    'c5', 'f5'
  ];

  const fileNames = _.fromPairs(
    noteNames.map(noteName => [noteName, noteNameToFileName(noteName)])
  );

  return loadBuffers(fileNames);
}


class CissyBass extends Node {
  pattern = [
    "11.11.11.10.  .08.  .08.10.08.06.01.  .03.  .03.",
    "10.10.10.08.  .06.  .06.08.06.03.01.  .03.  .03.",
    "11.11.11.10.  .08.  .08.10.08.06.01.  .03.  .03.",
    "06.  .  .06.06.  .  .06.06.06.  .06.  .06.  .06."
  ].join("")

  constructor(cissyBuffer) {
    super();

    this.sampler = new SingleBufferSampler(cissyBuffer);

    connect(this.sampler, this.output);
  }

  subBeats = 2
  loopLength = 64

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

    if (semitone && semitone !== "  ") {
      this.sampler.playOffset(16.69, when, 0.17, 1, semitoneToRate(-8.8 + +semitone), 0.01, 0.01)
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
      K: { offset: 42.73, length: 0.3 },
      S: { offset: 38.45, length: 0.2 },
      H: { offset: 45.07, length: 0.2,
           fadeOut: 0.05, playbackRate: semitoneToRate(-0.7) }
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

export default Promise.all([
  loadInitialBuffers(),
  loadMellotron()
]).then(([buffers, mellotronBuffers]) => {
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

  const mellotron = new SamplerSynth({
    attack: 0.1,
    decay: 0.2,
    sustain: 1,
    release: 0.2
  }, mellotronBuffers)
  const mellotronGain = createGain(0.1);
  connect(mellotron, mellotronGain, ctx.destination);
  console.log(mellotron);


  const synth = new HarmonicSynth({
    attack: 0.05,
    decay: 0.1,
    sustain: 0.8,
    release: 0.2
  }, [1,1,0.5,0.5,0.2,0.2]);

  const gain = createGain(0.2);
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
    cissyBass.onBeat(beat - 8, whenFunc, lengthFunc);

    // TODO: make these notes controllable from keyboard
    if (beat % 16 == 8) {
      chic.playOffset(34.52, whenFunc(), 0.35, 1, semitoneToRate(1.8))
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

    if ((beat - 8) % 16 == 0) {
      [0, 4, 9, 12].forEach(semitone => {
        mellotron.playNote(semitone, whenFunc(0), lengthFunc(6), 5);
      });
    }
    if ((beat - 8) % 16 == 6) {
      [2, 4, 9, 12].forEach(semitone => {
        mellotron.playNote(semitone, whenFunc(0), lengthFunc(2), 5);
      });
    }
    if ((beat - 8) % 16 == 8) {
      [0, 4, 7, 12].forEach(semitone => {
        mellotron.playNote(semitone, whenFunc(0), lengthFunc(4), 5);
      });
    }
    if ((beat - 8) % 16 == 12) {
      [0, 5, 7, 12].forEach(semitone => {
        mellotron.playNote(semitone, whenFunc(0), lengthFunc(4), 5);
      });
    }
  });

  //clock.start();

  const keydown = (event) => {
    const keys = [90, 83, 88, 68, 67, 86, 71, 66, 72, 78, 74, 77, 188];
    const semitone = keys.indexOf(event.which);
    console.log(semitone);

    if (semitone !== -1) {
      if (event.shiftKey) {
        mellotron.playNote(semitone, getCurrentTime(), 0.2);
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
