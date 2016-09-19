import { connect, Node } from 'sine/util';
import { createGain } from 'sine/nodes';

const round = (value) => Math.round(value * 10) / 10;

const ratioToDb = (ratio) => round(20 * Math.log10(ratio), 1);

const dbToRatio = (db) => round(Math.pow(10, db / 20), 1);

// Common base class for channel-like things
class ChannelBase extends Node {
  constructor(info) {
    super();
    this.name = info.name;

    this.channelGain = createGain();
    this.setGain(info.gain || 1);
  }

  setGain(gain) {
    this.channelGain.gain.value = gain;
  }

  setGainDb(db) {
    this.setGain(dbToRatio(db))
  }

  getGain() {
    return this.channelGain.gain.value;
  }

  getGainDb() {
    return ratioToDb(this.getGain());
  }
}

class Channel extends ChannelBase {
  constructor(info) {
    super(info);

    this.node = info.node;
    this.bus = info.bus;
    connect(this.node, this.channelGain, this.output);
  }

}

//FX need to have a "reflection" API so you can know which knobs to twiddle,
//should also include defaults values and descriptions and ranges for values?
class FxChain extends Node {
  constructor(fx, initialOrder) {
    super();
    this.fx = fx;
    this.connectNodes(initialOrder);
  }

  disconnectNodes() {
    this.input.disconnect();

    Object.keys(this.fx).forEach(key => {
      this.fx[key].disconnect();
    });
  }

  connectNodes(nodeNames=[]) {
    // Disconnect all nodes so they can be re-connected
    this.disconnectNodes();

    connect(
      this.input,
      ...nodeNames.map(name => this.fx[name]),
      this.output
    );
  }
}

class Bus extends ChannelBase {
  constructor(info) {
    super(info);

    this.key = info.key;
    this.bus = info.bus;

    if (info.fx) {
      this.fxChain = new FxChain(info.fx, info.fxOrder);
    } else {
      this.fxChain = createGain(1);
    }

    connect(this.input, this.fxChain, this.channelGain, this.output);
  }
}

export default class Mixer extends Node {
  constructor(options) {
    super();

    this.masterBus = new Bus({ key: 'Master', name: 'Master', bus: 'Out' });

    this.busses = options.busses.map(info => {
      const bus = new Bus(info);
      connect(bus, this.masterBus);
      return bus;
    }).concat([this.masterBus]);

    this.busMap = _.fromPairs(this.busses.map(bus => [bus.key, bus]));

    this.channels = options.channels.map(info => {
      const defaults = {
        gain: 1
      };

      return Object.assign(defaults, info);
    }).map(info => {
      const channel = new Channel(info);

      if (info.bus) {
        connect(channel, this.busMap[info.bus]);
      } else {
        connect(channel, this.masterBus);
      }

      return channel;
    });

    this.soloState = options.channels.map(_ => false);
    this.muteState = options.channels.map(_ => false);

    connect(this.masterBus, this.output);
  }

  toggleSolo(channel) {
    this.muteSoloChange(this.soloState, channel, true);
  }

  toggleMute(channel) {
    this.muteSoloChange(this.muteState, channel, true);
  }

  // checks to see if any channels are soloed
  soloMode() {
    return _.some(this.soloState);
  }

  setGain(channels, gain) {
    channels.forEach(channel => channel.output.gain.value = gain);
  }

  disableChannels(channels) {
    this.setGain(channels, 0);
  }

  enableChannels(channels) {
    this.setGain(channels, 1);
  }

  muteSoloChange(field, channel) {
    field[channel] = !field[channel];

    if (this.soloMode()) {
      const soloChannels = this.channels.filter((el, i) => this.soloState[i]);

      this.disableChannels(this.channels);
      this.enableChannels(soloChannels);
    } else {
      const muteChannels = this.channels.filter((el, i) => this.muteState[i]);

      this.enableChannels(this.channels);
      this.disableChannels(muteChannels);
    }
  }
}
