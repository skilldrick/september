// react stuff
import React, { Component } from 'react';
import { render } from 'react-dom';

// material-ui components
import { deepOrange500 } from 'material-ui/styles/colors';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import CircularProgress from 'material-ui/CircularProgress';
import RaisedButton from 'material-ui/RaisedButton';
import injectTapEventPlugin from 'react-tap-event-plugin';

import MixerControl from './MixerControl';
import Footer from './Footer';
import songPromise from './song';

// Needed for onTouchTap
// http://stackoverflow.com/a/34015469/988941
injectTapEventPlugin();

const muiTheme = getMuiTheme({
  palette: {
    accent1Color: deepOrange500,
  },
});

class App extends Component {
  disabledStyle = {
    fontFamily: 'Roboto, sans-serif'
  }

  headingStyle = {
    fontFamily: 'Roboto, sans-serif'
  }

  render() {
    return this.state.loaded ?
      this.renderEnabled() :
      this.renderDisabled();
  }

  renderDisabled() {
    return (
      <MuiThemeProvider muiTheme={muiTheme}>
        <div style={this.disabledStyle}>
          <p>Loading Audio ...</p>
          <CircularProgress />
        </div>
      </MuiThemeProvider>);
  }

  renderEnabled() {
    return (
      <MuiThemeProvider muiTheme={muiTheme}>
        <div>
          <RaisedButton
            onClick={() => this.clock.start()}
            style={{ marginRight: 10 }}
          >
            Play!
          </RaisedButton>
          <RaisedButton onClick={() => this.clock.stop()}>Stop!</RaisedButton>

          <MixerControl mixer={this.mixer} />
          <Footer />
        </div>
      </MuiThemeProvider>
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
      window.addEventListener('keydown', song.keydown);

      this.clock = song.clock;

      this.mixer = song.mixer;

      this.setState({
        loaded: true
      });
    });
  }
}

render(<App />, document.getElementById('root'));
