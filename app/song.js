import getAudioBuffer from 'sine/ajax';
import { ctx, getCurrentTime } from 'sine/audio';
import { createBufferSource, createGain } from 'sine/nodes';
import { connect, Node, semitoneToRate } from 'sine/util';
import clock from 'sine/clock';
import { FmSynth, HarmonicSynth, SamplerSynth } from 'sine/synth';
import { SingleBufferSampler } from 'sine/sampler';
import Scheduler from 'sine/scheduler';
import Kick8 from 'kick-eight';
import Snare from 'snare';
import HiHat from 'hi-hat';
import Conga from 'tom-tom';
import RimShot from 'rim-shot';
import Clap from 'clappy';
import CowBell from 'cow-bell';
import Maracas from 'maracas';
import Claves from 'claves';


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

class Drum808 extends Node {
  constructor() {
    super();

    this.instruments = {
      kick: Kick8(ctx),
      snare: Snare(ctx),
      hiHat: HiHat(ctx),
      conga: Conga(ctx),
      rimShot: RimShot(ctx),
      clap: Clap(ctx),
      cowBell: CowBell(ctx),
      maracas: Maracas(ctx),
      claves: Claves(ctx)
    };
  }

  play(instrument, when, gain=1) {
    const node = this.instruments[instrument]();
    const gainNode = createGain(gain);
    connect(node, gainNode, this.output);
    node.start(when);
  }

  onBeat(beat, whenFunc, lengthFunc) {
    this.play('kick', whenFunc(0));
    this.play('hiHat', whenFunc(0));
    this.play('hiHat', whenFunc(0.5), 0.5);
    if (beat % 2 == 1) {
      this.play('snare', whenFunc(0), 0.7);
    }
    if (beat % 8 == 6) {
      this.play('snare', whenFunc(0.5), 0.5);
    }
  }
}

class CissyBass extends Node {
  pattern = [
    "11.  .11.  .11.11.10.  .  .  .08.  .  .  .08.09.10.  .08.  .06.06.01.  .  .  .03.  .  .  .03.03.",
    "10.  .10.  .10.08.08.  .  .  .06.  .  .  .06.07.08.  .06.  .03.03.01.  .  .  .03.  .  .  .03.03.",
    "11.  .11.  .11.10.10.  .  .  .08.  .  .  .08.09.10.  .08.  .06.06.01.  .  .  .03.  .  .  .03.03.",
    "06.  .06.  .  .  .16.18.06.  .06.  .  .  .16.18.06.  .  .06.06.  .06.  .  .  .06.  .  .06.06.06."
  ].join("")

  constructor(cissyBuffer) {
    super();

    this.sampler = new SingleBufferSampler(cissyBuffer);

    connect(this.sampler, this.output);
  }

  subBeats = 4
  loopLength = 32 * this.subBeats;

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
    const gain = subBeat % 2 === 0 ? 1 : 0.5; // reduced gain for off beats

    if (semitone && semitone !== "  ") {
      this.sampler.playOffset(16.69, when, 0.17, gain, semitoneToRate(-8.8 + +semitone), 0.01, 0.01)
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

class Mellotron extends Node {
  constructor(mellotronBuffers) {
    super();

    this.synth = new SamplerSynth({
      attack: 0.1,
      decay: 0.2,
      sustain: 1,
      release: 0.2
    }, mellotronBuffers)

    connect(this.synth, this.output);
  }

  chords = {
    A: [0, 4, 9, 12],
    B: [2, 4, 9, 12],
    C: [0, 4, 7, 12],
    D: [0, 5, 7, 12]
  }

  //         |   |   |   |   |   |   |   |   |
  pattern = "A-----B-C---D---A---B---C-----D-"

  onBeat(beat, whenFunc, lengthFunc) {
    const loopBeat = beat % this.pattern.length;
    const chordName = this.pattern[loopBeat];

    if (chordName && chordName != ' ' && chordName != '-') {
      // find out how long this chord is based on chord name and number of hyphens
      const length = this.pattern.slice(loopBeat).match(/^.-+/)[0].length;

      this.chords[chordName].forEach(semitone => {
        this.playNote(semitone - 12, whenFunc(0), lengthFunc(length));
        this.playNote(semitone, whenFunc(0), lengthFunc(length));
      })
    }
  }

  playNote(note, when, length) {
    this.synth.playNote(note, when, length, 20);
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

  window.septemberVocals = septemberVocals;


  const cissyBeat = new CissyBeat(buffers.cissy);
  const cissyBass = new CissyBass(buffers.cissy);
  const mellotron = new Mellotron(mellotronBuffers);
  const drum808 = new Drum808();

  window.cissySampler = new SingleBufferSampler(buffers.cissy);


  const synth = new HarmonicSynth({
    attack: 0.05,
    decay: 0.1,
    sustain: 0.8,
    release: 0.2
  }, [1,1,0.5,0.5,0.2,0.2]);

  clock.setBpm(124.55);
  window.clock = clock;

  window.chic = new SingleBufferSampler(buffers.chic, {
    hit1: { offset: 34.52, length: 0.35, playbackRate: semitoneToRate(1.8) },
    hit2: { offset: 34.52, length: 0.4, playbackRate: semitoneToRate(3.8) },
  });


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
    cissyBass.onBeat(beat + 24, whenFunc, lengthFunc);
    mellotron.onBeat(beat - 8, whenFunc, lengthFunc);
    drum808.onBeat(beat, whenFunc, lengthFunc);

    if (beat % 16 == 8) {
      chic.play('hit1', whenFunc())
    }
    if (beat % 16 == 0) {
      chic.play('hit2', whenFunc())
    }

    if (beat % 16 == 15) {
      chic.playOffset(38.11, whenFunc(0), lengthFunc(0.5), 1, 0.82)
    }
    if (beat % 16 == 7 || beat % 16 == 15) {
      chic.playOffset(38.11, whenFunc(0.5), lengthFunc(1), 1, 0.82)
    }

  });

  const mixer = new Mixer([
    { name: 'Synth', node: synth, gain: 0.2 },
    { name: 'September Vocals', node: septemberVocals },
    { name: 'Cissy Beat', node: cissyBeat },
    { name: 'Cissy Bass', node: cissyBass },
    { name: 'Chic', node: chic },
    { name: 'Mellotron', node: mellotron, gain: 0.1 },
    { name: 'Cissy Sampler', node: cissySampler, gain: 1 },
    { name: 'Drum 808', node: drum808 }
  ]);

  connect(mixer, ctx.destination);
  window.mixer = mixer;

  //clock.start();

  const keydown = (event) => {
    const keys = [90, 83, 88, 68, 67, 86, 71, 66, 72, 78, 74, 77, 188];
    const semitone = keys.indexOf(event.which);

    const drums = {
      'z': 'kick',
      'x': 'snare',
      'c': 'hiHat',
      'v': 'conga',
      'b': 'rimShot',
      'n': 'clap',
      'm': 'cowBell',
      ',': 'maracas',
      '.': 'claves'
    }

    const drum = drums[event.key];

    if (event.shiftKey && semitone !== -1) {
      console.log(semitone);
      cissySampler.playOffset(16.69, 0, 0.17, 1, semitoneToRate(-8.8 + semitone))
      //mellotron.playNote(semitone, getCurrentTime(), 0.2);
    } else if (drum) {
      console.log(drum);
      drum808.play(drum, getCurrentTime());
    }
  };

  return {
    clock,
    keydown
  };
});

class Bus extends Node {
  constructor(info) {
    super();
    this.name = info.name;
    this.node = info.node;
    this.gain = createGain(1);

    if (typeof info.gain == 'number') {
      this.gain.gain.value = info.gain;
    }

    connect(this.node, this.gain, this.output);
  }
}

class Mixer extends Node {
  constructor(nodes) {
    super();

    this.masterGain = createGain(1);

    this.busses = nodes.map(info => {
      const bus = new Bus(info);
      connect(bus, this.masterGain);
      return bus;
    });

    connect(this.masterGain, this.output);
  }

  mute(bus) {
    this.busses[bus].output.gain.value = 0;
  }

  unMute(bus) {
    this.busses[bus].output.gain.value = 1;
  }
}
