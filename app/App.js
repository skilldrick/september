// react stuff
import React, { Component } from 'react';
import { render } from 'react-dom';

import songPromise from './song';


class App extends Component {
  disabledStyle() {
    return {
      fontFamily: 'Roboto, sans-serif'
    }
  }

  render() {
    return this.state.loaded ?
      this.renderEnabled() :
      this.renderDisabled();
  }

  renderDisabled() {
    return (
      <div style={this.disabledStyle()}>
        <p>Loading Audio ...</p>
      </div>
    )
  }

  renderEnabled() {
    return (
      <div>Loaded!</div>
    );
  }

  constructor(props) {
    super(props);

    this.state = {
      loaded: false
    };
  }

  componentDidMount() {
    songPromise.then(song => {
      this.setState({
        loaded: true
      });

      window.song = song;
    });
  }
}

render(<App />, document.getElementById('root'));
