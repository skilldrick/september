import React, { Component, ReactDOM } from 'react';

import Checkbox from 'material-ui/Checkbox';
import Slider from 'material-ui/Slider';

import _ from 'lodash';


export default class MixerControl extends Component {

  render() {
    const channelControls = this.props.mixer.channels.map((el, i) => {
      return (<ChannelControl
        onChange={(val) => this.props.mixer.channels[i].setGainDb(val) }
        defaultValue={el.getGainDb()}
        label={el.name}
        key={i}
      />);
    });

    return (
      <div style={Object.assign({
        display: 'flex',
        flexWrap: 'wrap'
      }, this.props.style)}>
        {channelControls}
      </div>
    );

  }
}


class ChannelControl extends Component {
  labelStyle = {
    fontFamily: 'Roboto, sans-serif'
  }

  render() {
    return (
      <div style={{width: 100, textAlign: 'center'}}>
          <Slider
            defaultValue={this.props.defaultValue}
            max={12}
            min={-24}
            step={0.1}
            onChange={this.onChange}
            axis="y"
            style={{marginLeft: 'auto', marginRight: 'auto', width: 18, height: 100, marginBottom: 10}}
          />
        <p style={this.labelStyle}>{this.state.value}</p>
        <p style={this.labelStyle}>{this.props.label}</p>
      </div>
    );
  }

  onChange = _.throttle((e, val) => {
    this.setState({ value: val });
    this.props.onChange(val);
  }, 100);

  constructor(props) {
    super(props);

    this.state = {
      value: props.defaultValue
    };
  }
}
