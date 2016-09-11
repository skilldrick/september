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

  onTick(bar, beat, tick, when) {
    if (tick == 0) {
      this.play('kick', when);
      this.play('hiHat', when);

      if (beat % 2 == 1) {
        this.play('snare', when, 0.7);
      }
    }

    if (bar % 2 == 1 && beat == 2 && tick == 1) {
      this.play('snare', when, 0.5);
    }

    if (tick == 1) {
      this.play('hiHat', when, 0.5);
    }
  }
}

class CissyBass extends Node {
  pattern = [
    ["11.  .11.  ", "11.11.10.  ", "  .  .08.  ", "  .  .08.09"],
    ["10.  .08.  ", "06.06.01.  ", "  .  .03.  ", "  .  .03.03"],

    ["10.  .10.  ", "10.10.08.  ", "  .  .06.  ", "  .  .06.07"],
    ["08.  .06.  ", "03.03.01.  ", "  .  .03.  ", "  .  .03.03"],

    ["11.  .11.  ", "11.10.10.  ", "  .  .08.  ", "  .  .08.09"],
    ["10.  .08.  ", "06.06.01.  ", "  .  .03.  ", "  .  .03.03"],

    ["06.  .06.  ", "  .  .16.18", "06.  .06.  ", "  .  .16.18"],
    ["06.  .  .06", "06.  .06.  ", "  .  .06.  ", "  .06.06.06"]
  ]

  constructor(cissyBuffer) {
    super();

    this.sampler = new SingleBufferSampler(cissyBuffer);

    connect(this.sampler, this.output);
  }

  onTick(bar, beat, tick, when) {
    const semitone = this.pattern[(bar + 6) % 8][beat].split(".")[tick];
    const gain = tick % 2 === 0 ? 1 : 0.5; // reduced gain for off beats

    if (semitone && semitone !== "  ") {
      this.sampler.playOffset(16.69, when, 0.17, gain, semitoneToRate(-8.8 + +semitone), 0.01, 0.01)
    }
  }
}

class CissyBeat extends Node {
  patterns = [
    ["HHHHHHH", "HHHHHHHH", "HHHHHHHH", "HHHHHHHH"],
    ["K S KKS", "K SK KS ", "K S KKS ", "K SK KSS"]
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

  ticks = 2

  onTick(bar, beat, tick, when) {
    this.patterns.forEach(pattern => {
      const sample = pattern[bar % 4][beat * this.ticks + tick];

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

  onBeat(bar, beat, when, lengthFunc) {
    // this is some pretty gross math to have to do
    const loopBeat = ((bar - 2) % 8) * 4 + beat;
    const chordName = this.pattern[loopBeat];

    if (chordName && chordName != ' ' && chordName != '-') {
      // find out how long this chord is based on chord name and number of hyphens
      const length = this.pattern.slice(loopBeat).match(/^.-+/)[0].length;

      this.chords[chordName].forEach(semitone => {
        this.playNote(semitone - 12, when, lengthFunc(length));
        this.playNote(semitone, when, lengthFunc(length));
      })
    }
  }


  playNote(note, when, length) {
    this.synth.playNote(note, when, length, 20);
  }
}

class SeptemberVocals extends Node {
  constructor(buffer) {
    super();

    this.sampler = new SingleBufferSampler(buffer, {
      verse1_1: 22,
      verse1_2: 37.4,
      chorus1_1: 51.6
    });

    this.sampler.setLengths({
      verse1_1: 15.4,
      verse1_2: 14.2,
      chorus1_1: 15
    });

    connect(this.sampler, this.output);
  }

  onTick(bar, beat, tick, when, lengthFunc) {
    if (bar % 16 == 1 && beat == 2 && tick == 3) {
      this.sampler.play('verse1_1', when);
    }

    if (bar % 16 == 9 && beat == 2 && tick == 3) {
      this.sampler.play('verse1_2', when);
    }
  }
}

class SynthNotes extends Node {
  patterns = [
    ["AAAA", "AAAA"],
    ["    ", "BB  "]
  ]

  noteMap = {
    A: 12,
    B: 14
  }

  constructor() {
    super();

    this.synth = new HarmonicSynth({
      attack: 0.05,
      decay: 0.1,
      sustain: 0.8,
      release: 0.2
    }, [1,1,0.5,0.5,0.2,0.2]);

    connect(this.synth, this.output);
  }

  onBeat(bar, beat, when) {
    this.patterns.forEach(pattern => {
      const note = pattern[bar % 2][beat];

      if (note != " ") {
        this.synth.playNote(this.noteMap[note], when, 0.1);
      }
    });
  }
}

class Chic extends Node {
  pattern = ["A       ", "       Y", "B       ", "      XY"]

  constructor(buffer) {
    super();

    this.sampler = new SingleBufferSampler(buffer, {
      A: { offset: 34.52, length: 0.35, playbackRate: semitoneToRate(1.8) },
      B: { offset: 34.52, length: 0.4, playbackRate: semitoneToRate(3.8) },
      X: { offset: 38.11, length: 0.25, gain: 1.3, playbackRate: 0.82 },
      Y: { offset: 38.11, length: 0.5, gain: 1.6, playbackRate: 0.82 }
    });

    connect(this.sampler, this.output);
  }

  onTick(bar, beat, tick, when, lengthFunc) {
    const sample = this.pattern[(bar + 2) % 4][beat * 2 + tick];

    if (sample && sample != ' ') {
      this.sampler.play(sample, when);
    }
  }
}

class Song {
  constructor(bpm, beatsPerBar = 4) {
    clock.setBpm(bpm);

    this.beatCb = _.noop;
    this.halfBeatCb = _.noop;
    this.quarterBeatCb = _.noop;
    this.eighthBeatCb = _.noop;

    clock.onBeat((beat, whenFunc, lengthFunc) => {
      const bar = Math.floor(beat / beatsPerBar);
      const beatInBar = beat % beatsPerBar

      this.beatCb(bar, beatInBar, whenFunc(0), lengthFunc);
      this.callTickCallbacks(this.halfBeatCb, 2, bar, beatInBar, whenFunc, lengthFunc);
      this.callTickCallbacks(this.quarterBeatCb, 4, bar, beatInBar, whenFunc, lengthFunc);
      this.callTickCallbacks(this.eighthBeatCb, 8, bar, beatInBar, whenFunc, lengthFunc);
    });
  }

  callTickCallbacks(cb, ticksPerBeat, bar, beatInBar, whenFunc, lengthFunc) {
    for (let tick = 0; tick < ticksPerBeat; tick++) {
      cb(bar, beatInBar, tick, whenFunc(tick / ticksPerBeat), lengthFunc);
    }
  }

  onBeat(cb) {
    this.beatCb = cb;
  }

  onHalfBeat(cb) {
    this.halfBeatCb = cb;
  }

  onQuarterBeat(cb) {
    this.quarterBeatCb = cb;
  }

  onEighthBeat(cb) {
    this.eighthBeatCb = cb;
  }

  start() {
    clock.start();
  }
}

export default Promise.all([
  loadInitialBuffers(),
  loadMellotron()
]).then(([buffers, mellotronBuffers]) => {

  const chic = new Chic(buffers.chic);
  const synthNotes = new SynthNotes();
  const septemberVocals = new SeptemberVocals(buffers.september)
  const cissyBeat = new CissyBeat(buffers.cissy);
  const cissyBass = new CissyBass(buffers.cissy);
  const mellotron = new Mellotron(mellotronBuffers);
  const drum808 = new Drum808();

  const song = new Song(124.55, 4);

  song.onBeat((bar, beat, when, lengthFunc) => {
    synthNotes.onBeat(bar, beat, when);
    mellotron.onBeat(bar, beat, when, lengthFunc);
  });

  song.onHalfBeat((bar, beat, tick, when, lengthFunc) => {
    cissyBeat.onTick(bar, beat, tick, when);
    drum808.onTick(bar, beat, tick, when);
    chic.onTick(bar, beat, tick, when, lengthFunc);
  });

  song.onQuarterBeat((bar, beat, tick, when, lengthFunc) => {
    cissyBass.onTick(bar, beat, tick, when);
  });

  song.onEighthBeat((bar, beat, tick, when, lengthFunc) => {
    septemberVocals.onTick(bar, beat, tick, when, lengthFunc);
  });

  const mixer = new Mixer([
    { name: 'Synth', node: synthNotes, gain: 0.2 },
    { name: 'September Vocals', node: septemberVocals },
    { name: 'Cissy Beat', node: cissyBeat },
    { name: 'Cissy Bass', node: cissyBass },
    { name: 'Chic', node: chic },
    { name: 'Mellotron', node: mellotron, gain: 0.1 },
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
      mellotron.playNote(semitone, getCurrentTime(), 0.2);
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
      this.setGain(info.gain);
    }

    connect(this.node, this.gain, this.output);

    this.unMute();
  }

  setGain(gain) {
    this.gain.gain.value = gain;
  }

  mute() {
    this.muted = true;
    this.output.gain.value = 0;
  }

  unMute() {
    this.muted = false;
    this.output.gain.value = 1;
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
    this.busses[bus].mute();
  }

  unMute(bus) {
    this.busses[bus].unMute();
  }
}
