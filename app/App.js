// react stuff
import React, { Component } from 'react';
import { render } from 'react-dom';

import Footer from './Footer';
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
      <div>
        <button onClick={() => this.clock.start()}>Play!</button>
        <button onClick={() => this.clock.stop()}>Stop!</button>

        <Footer />
      </div>
    );
  }

  constructor(props) {
    super(props);

    this.state = {
      loaded: false
    };
  }

  componentDidMount() {
    songPromise.then(clock => {
      this.clock = clock;

      this.setState({
        loaded: true
      });
    });
  }
}

render(<App />, document.getElementById('root'));
