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
  patterns = [
    ["K K K K ", "K K K K ", "K K K K ", "K K K K "],
    ["  S   S ", "  S  sS ", "  S   S ", "  S  sS "],
    ["HHHHHHHH", "HHHHHHHH", "HHHHHHHH", "HHHHHHHH"]
  ]

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

  play(instrument, when) {
    const names = {
      'K': 'kick',
      's': 'snare',
      'S': 'snare',
      'H': 'hiHat'
    };

    const gains = {
      'K': 1,
      's': 0.5,
      'S': 0.7,
      'H': 0.5
    };

    const node = (this.instruments[names[instrument]] || this.instruments[instrument])();
    const gainNode = createGain(gains[instrument]);
    connect(node, gainNode, this.output);
    node.start(when);
  }

  ticks = 2

  onTick(section, bar, beat, tick, when) {
    this.patterns.forEach(pattern => {
      const instrument = pattern[bar % 4][beat * this.ticks + tick];

      if (instrument && instrument !== " ") {
        this.play(instrument, when);
      }
    });
  }
}

class CissyBass extends Node {
  versePattern = [
    ["11.  .11.  ", "11.11.10.  ", "  .  .08.  ", "  .  .08.09"],
    ["10.  .08.  ", "06.06.01.  ", "  .  .03.  ", "  .  .03.03"],

    ["10.  .10.  ", "10.10.08.  ", "  .  .06.  ", "  .  .06.07"],
    ["08.  .06.  ", "03.03.01.  ", "  .  .03.  ", "  .  .03.03"],

    ["11.  .11.  ", "11.10.10.  ", "  .  .08.  ", "  .  .08.09"],
    ["10.  .08.  ", "06.06.01.  ", "  .  .03.  ", "  .  .03.03"],

    ["06.  .06.  ", "  .  .16.18", "06.  .06.  ", "  .  .16.18"],
    ["06.  .  .06", "06.  .06.  ", "  .  .06.  ", "  .06.06.06"]
  ]

  chorusPattern = [
    ["08.  .  .  ", "15.  .13.  ", "  .  .  .  ", "08.  .09.  "],
    ["10.  .08.  ", "06.  .03.03", "01.  .02.  ", "03.  .06.  "],

    ["08.  .  .  ", "15.  .13.  ", "  .  .  .  ", "08.08.09.  "],
    ["10.  .08.  ", "06.  .  .03", "01.  .01.  ", "03.  .06.  "],

    ["08.  .  .  ", "15.  .13.  ", "  .  .  .  ", "08.  .09.  "],
    ["10.  .08.  ", "06.  .03.03", "01.  .02.  ", "03.  .06.  "],

    ["06.  .06.  ", "  .  .16.18", "06.  .06.  ", "  .  .16.18"],
    ["06.  .  .06", "06.  .06.  ", "  .  .06.  ", "  .06.06.06"]
  ]

  introPattern = this.versePattern.slice(6);

  constructor(cissyBuffer) {
    super();

    this.sampler = new SingleBufferSampler(cissyBuffer);

    connect(this.sampler, this.output);
  }

  onTick(section, bar, beat, tick, when) {
    let pattern;
    switch (section) {
    case 'intro':
      pattern = this.introPattern;
      break;
    case 'chorus1':
      pattern = this.chorusPattern;
      break;
    default:
      pattern = this.versePattern;
    }

    const loopBar = bar % pattern.length;
    const semitone = pattern[loopBar][beat].split(".")[tick];
    const gain = tick % 2 === 0 ? 1 : 0.5; // reduced gain for off beats

    if (semitone && semitone !== "  ") {
      this.sampler.playOffset(16.69, when, 0.17, gain, semitoneToRate(-8.8 + +semitone), 0.01, 0.01)
    }
  }
}

class CissyBeat extends Node {
  patterns = [
    ["H H H H H H H Hh", "H H H H H H H Hh", "H H H H H H H Hh", "H H H H H H H Hh"],
    ["k   S   k k S  s", "k   S k   k S  k", "k   S  sk k S   ", "k   S k   k S Sk"],
    ["j       j j     ", "j     j   j     ", "j       j j     ", "j     j   j     "]
  ]

  constructor(cissyBuffer) {
    super();

    this.sampler = new SingleBufferSampler(cissyBuffer, {
      K: { offset: 42.73, length: 0.3 },
      S: { offset: 38.45, length: 0.2, gain: 1.2 },
      s: { offset: 38.45, length: 0.2, gain: 0.7 },
      H: { offset: 45.07, length: 0.2,
           fadeOut: 0.05, playbackRate: semitoneToRate(-0.7) },
      h: { offset: 45.07, length: 0.2, gain: 0.7,
           fadeOut: 0.05, playbackRate: semitoneToRate(-0.7) },
      k: { offset: 6.31, length: 0.13,
           fadeOut: 0.01, playbackRate: semitoneToRate(1) },
      j: { offset: 6.31, length: 0.13,
           fadeOut: 0.01, playbackRate: semitoneToRate(-3) },
    });

    window.sampler = this.sampler;

    connect(this.sampler, this.output);
  }

  ticks = 4

  onTick(section, bar, beat, tick, when) {
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
    A: [0, 4, 9],
    B: [2, 4, 9],
    C: [0, 4, 7],
    D: [0, 5, 7],
    E: [2, 5, 12],
    F: [2, 7, 11],
    G: [0, 7, 11],
    H: [0, 5, 9],
    I: [0, 5, 7],
  }

  //               |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
  versePattern  = "A-----B-C---D---A---B---C-----D-A-----B-C---D---A---B---C-------"
  chorusPattern = "E---F---G---H-I-"

  onBeat(section, bar, beat, when, lengthFunc) {
    let pattern;
    switch (section) {
    case 'intro':
      pattern = null;
      break;
    case 'verse1':
    case 'verse2':
      pattern = this.versePattern;
      break;
    case 'chorus1':
    case 'chorus2':
    case 'chorus3':
    case 'chorus4':
    case 'bridge1':
      pattern = this.chorusPattern;
      break;
    default:
      pattern = null
    }

    if (!pattern) return;

    const patternLength = pattern.length / 4;
    const loopBeat = (bar % patternLength) * 4 + beat;
    const chordName = pattern[loopBeat];

    if (chordName && chordName != ' ' && chordName != '-') {
      // find out how long this chord is based on chord name and number of hyphens
      const length = pattern.slice(loopBeat).match(/^.-+/)[0].length;

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
  pattern = {
    intro: [
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "   A    ", "        "],
    ],

    verse1: [
      ["        ", "        ", "        ", "       B"],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "C       "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "       D", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "   E    ", "        "],
      ["        ", "        ", "  F     ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "G       "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "       H", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
    ],

    chorus1: [
      ["A       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "       B"],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
    ],

    bridge1: [
      ["A       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["B       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["C       ", "        ", "        ", "        "],
      ["    D   ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "    a   ", "        "],
    ],

    verse2: [
      ["        ", "        ", "    B   ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "       C", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "D       "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "       E", "        "],
      ["        ", "        ", "   F    ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "   G    ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "       H"],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
    ],

    chorus2: [
      ["A       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["B       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "    C   ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["D       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["E       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
    ],

    chorus3: [
      ["   A    ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["   B    ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "    C   ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["D       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["E       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "    a   ", "        "],
    ],

    chorus4: [
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["B       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["C       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["E       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["E       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["F       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["E       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["E       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["F       ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
      ["        ", "        ", "        ", "        "],
    ]

  }


  constructor(buffer) {
    super();

    this.sampler = new SingleBufferSampler(buffer, {
      // verse 1
      intro_A: { offset: 22, length: 2.5 },
      verse1_B: { offset: 24.65, length: 2.55 },
      verse1_C: { offset: 28.07, length: 2.85 },
      verse1_D: { offset: 31.85, length: 5.3 },
      verse1_E: { offset: 37.4, length: 1.85 },
      verse1_F: { offset: 39.25, length: 4.2 },
      verse1_G: { offset: 43.45, length: 3.8 },
      verse1_H: { offset: 47.25, length: 6.25, fadeOut: 0.01 },

      // chorus 1
      chorus1_A: { offset: 53.53, length: 7.65, fadeIn: 0.01  },
      chorus1_B: { offset: 61.17, length: 7.65 },

      // bridge
      bridge1_A: { offset: 68.8, length: 3.81 },
      bridge1_B: { offset: 72.58, length: 3.77 },
      bridge1_C: { offset: 76.4, length: 2.1 },
      bridge1_D: { offset: 78.5, length: 3 },

      // verse 2
      bridge1_a: { offset: 83.2, length: 1.9 },
      verse2_B: { offset: 85.1, length: 3.5 },
      verse2_C: { offset: 89.1, length: 3.3 },
      verse2_D: { offset: 92.97, length: 5 },
      verse2_E: { offset: 98.6, length: 1.7 },
      verse2_F: { offset: 100.3, length: 3.8 },
      verse2_G: { offset: 104.1, length: 3.8 },
      verse2_H: { offset: 108.58, length: 5.84, fadeOut: 0.05 },

      // chorus 2
      chorus2_A: { offset: 114.3, length: 7.65, fadeIn: 0.01  },
      chorus2_B: { offset: 121.97, length: 6.8 },
      chorus2_C: { offset: 128.78, length: 4.5 },
      chorus2_D: { offset: 133.27, length: 3.8 },
      chorus2_E: { offset: 137.1, length: 7.2 },
      chorus2_F: { offset: 144.85, length: 7.5 },

      // chorus 3
      chorus3_A: { offset: 144.85, length: 7.5 },
      chorus3_B: { offset: 152.45, length: 6.5 },
      chorus3_C: { offset: 159.1, length: 4.5 },
      chorus3_D: { offset: 163.65, length: 3.75 },
      chorus3_E: { offset: 167.4, length: 6.8 },

      // chorus 4
      chorus3_a: { offset: 174.2, length: 4.5 },
      chorus4_B: { offset: 178.7, length: 3.7 },
      chorus4_C: { offset: 182.45, length: 7.4 },
      chorus4_D: { offset: 190, length: 3.7 },
      chorus4_E: { offset: 193.7, length: 3.7 },
      chorus4_F: { offset: 197.4, length: 7 },
    });

    window.sept = this.sampler;

    connect(this.sampler, this.output);
  }

  onTick(section, bar, beat, tick, when, lengthFunc) {
    const sample = this.pattern[section][bar][beat][tick];

    if (sample && sample !== " ") {
      this.sampler.play(section + "_" + sample, when);
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

  onBeat(section, bar, beat, when) {
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

  onTick(section, bar, beat, tick, when, lengthFunc) {
    const pattern = (section == 'intro') ? this.pattern.slice(2) : this.pattern;
    const sample = pattern[bar % 4][beat * 2 + tick];

    if (sample && sample != ' ') {
      this.sampler.play(sample, when);
    }
  }
}

class Song {
  constructor(bpm, beatsPerBar = 4, sections) {
    clock.setBpm(bpm);

    this.beatCb = _.noop;
    this.halfBeatCb = _.noop;
    this.quarterBeatCb = _.noop;
    this.eighthBeatCb = _.noop;

    this.sections = this.processSections(sections);

    clock.onBeat((beat, whenFunc, lengthFunc) => {
      const bar = Math.floor(beat / beatsPerBar);
      const beatInBar = beat % beatsPerBar

      const sectionInfo = this.getSection(bar);
      const section = sectionInfo.name;

      const barInSection = bar - sectionInfo.start;

      this.beatCb(section, barInSection, beatInBar, whenFunc(0), lengthFunc);
      this.callTickCallbacks(this.halfBeatCb, 2, section, barInSection, beatInBar, whenFunc, lengthFunc);
      this.callTickCallbacks(this.quarterBeatCb, 4, section, barInSection, beatInBar, whenFunc, lengthFunc);
      this.callTickCallbacks(this.eighthBeatCb, 8, section, barInSection, beatInBar, whenFunc, lengthFunc);
    });
  }

  processSections(sections) {
    let lengthSoFar = 0;

    sections.forEach(section => {
      section.start = lengthSoFar;
      section.end = section.start + section.bars;
      lengthSoFar += section.bars;
    });

    return sections;
  }

  getSection(bar) {
    for (let section of this.sections) {
      if (bar >= section.start && bar < section.end) {
        return section;
      }
    }

    return "END"
  }

  callTickCallbacks(cb, ticksPerBeat, section, bar, beatInBar, whenFunc, lengthFunc) {
    for (let tick = 0; tick < ticksPerBeat; tick++) {
      cb(section, bar, beatInBar, tick, whenFunc(tick / ticksPerBeat), lengthFunc);
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

  const song = new Song(124.55, 4, [
    { name: "intro", bars: 2 },
    { name: "verse1", bars: 16 },
    { name: "chorus1", bars: 8 },
    { name: "bridge1", bars: 8 },
    { name: "verse2", bars: 16 },
    { name: "chorus2", bars: 16 },
    { name: "chorus3", bars: 16 },
    { name: "chorus4", bars: 48 },
  ]);

  song.onBeat((section, bar, beat, when, lengthFunc) => {
    console.log(section);
    synthNotes.onBeat(section, bar, beat, when);
    mellotron.onBeat(section, bar, beat, when, lengthFunc);
  });

  song.onHalfBeat((section, bar, beat, tick, when, lengthFunc) => {
    drum808.onTick(section, bar, beat, tick, when);
    chic.onTick(section, bar, beat, tick, when, lengthFunc);
  });

  song.onQuarterBeat((section, bar, beat, tick, when, lengthFunc) => {
    cissyBeat.onTick(section, bar, beat, tick, when);
    cissyBass.onTick(section, bar, beat, tick, when);
  });

  song.onEighthBeat((section, bar, beat, tick, when, lengthFunc) => {
    septemberVocals.onTick(section, bar, beat, tick, when, lengthFunc);
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

  console.log(clock);
  //clock.beat = 54 * 4;
  //clock.timeInBeats = 54 * 4;

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
      //cissyBass.sampler.playOffset(16.69, getCurrentTime(), 0.17, 1, semitoneToRate(-8.8 + +semitone), 0.01, 0.01)
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

class Channel extends Node {
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

    this.channels = nodes.map(info => {
      const channel = new Channel(info);
      connect(channel, this.masterGain);
      return channel;
    });

    connect(this.masterGain, this.output);
  }

  mute(channel) {
    this.channels[channel].mute();
  }

  unMute(channel) {
    this.channels[channel].unMute();
  }
}
