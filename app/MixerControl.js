import React, { Component, ReactDOM } from 'react';

import Checkbox from 'material-ui/Checkbox';
import Slider from 'material-ui/Slider';
import FontIcon from 'material-ui/FontIcon';
import IconButton from 'material-ui/IconButton';
import Chip from 'material-ui/Chip';


import _ from 'lodash';


export default class MixerControl extends Component {

  render() {
    const channelControls = this.props.mixer.channels.map((el, i) => {
      return (<ChannelControl
        onChange={(val) => this.props.mixer.channels[i].setGainDb(val) }
        toggleSolo={() => this.toggleSolo(i)}
        toggleMute={() => this.toggleMute(i)}
        solo={this.state.soloState[i]}
        mute={this.state.muteState[i]}
        defaultValue={el.getGainDb()}
        label={el.name}
        bus={el.bus}
        key={i}
      />);
    });

    const busControls = this.props.mixer.busses.map((el, i) => {
      return (<ChannelControl
        onChange={(val) => this.props.mixer.busses[i].setGainDb(val) }
        defaultValue={el.getGainDb()}
        label={el.name}
        bus={el.bus}
        key={i}
      />);
    });

    return (
      <div style={Object.assign({
        display: 'flex',
        flexWrap: 'wrap'
      }, this.props.style)}>
        {channelControls}
        <VerticalDivider />
        {busControls}
      </div>
    );

  }

  toggleSolo = (i) => {
    this.props.mixer.toggleSolo(i);
    this.setState({ soloState: this.props.mixer.soloState });
  }

  toggleMute = (i) => {
    this.props.mixer.toggleMute(i);
    this.setState({ muteState: this.props.mixer.muteState });
  }

  constructor(props) {
    super(props);

    this.state = {
      soloState: props.mixer.soloState,
      muteState: props.mixer.muteState
    };
  }
}

function VerticalDivider(props) {
  const style = {
    width: 1,
    borderRight: '1px solid #e0e0e0'
  }

  return <div style={style}></div>;
}

class ChannelControl extends Component {
  labelStyle = {
    fontFamily: 'Roboto, sans-serif'
  }

  buttonTextStyle = {
    fontSize: 18,
    position: 'relative',
    top: -3
  }

  buttonStyle = {
    backgroundColor: 'gray'
  }

  muteStyle = Object.assign({}, this.buttonStyle, {
    backgroundColor: 'orange'
  })

  soloStyle = Object.assign({}, this.buttonStyle, {
    backgroundColor: 'yellow',
  })

  render() {
    return (
      <div style={{width: 120, textAlign: 'center'}}>
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

        <IconButton
          disabled={!this.props.toggleSolo}
          onClick={this.props.toggleSolo}
          style={this.props.solo ? this.soloStyle : {}}
        >
          <FontIcon>
            <span style={this.buttonTextStyle}>S</span>
          </FontIcon>
        </IconButton>

        <IconButton
          disabled={!this.props.toggleMute}
          onClick={this.props.toggleMute}
          style={this.props.mute ? this.muteStyle : {}}
        >
          <FontIcon>
            <span style={this.buttonTextStyle}>M</span>
          </FontIcon>
        </IconButton>

        <p style={this.labelStyle}>{this.props.label}</p>

        <Chip style={{margin: 'auto'}}>{this.props.bus || "Master"}</Chip>
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
