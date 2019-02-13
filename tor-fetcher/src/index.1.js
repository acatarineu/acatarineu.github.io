import makeTorModule from '../external/ceba.js/build/tor';
// import makeTLSSocketModule from '../external/tls-socket-wasm/dist/tls-socket-wasm';
// import { HTTPParser } from 'http-parser-js';
// import FetchFactory from './fetch-factory';
// import SocksSocket from './socks-socket';

const mockedServers = new Map();
class SocketServer {
  constructor(config) {
    this.port = parseInt(config.port, 10);
    this.listeners = {};
    mockedServers.set(this.port, this);
  }

  on(name, cb) {
    this.listeners[name] = cb;
  }

  close() {
    if (this.closed) {
      return;
    }
    mockedServers.delete(this.port);
    this.closed = true;
    delete this.listeners;
  }
}

function SnowFlakeSocket(address, protocols) {
  console.log('ostiass!!!', address, protocols);
  if (address !== 'ws://37.218.242.151:443/') {
    throw new Error('could not connect');
  }
  const ws = new WebSocket('wss://snowflake.bamsoftware.com');
  ws.binaryType = 'arraybuffer';
  return ws;
}

// Why does the ws work in chrome but not in firefox?
// class SnowFlakeSocket {
//   constructor(address, protocols) {
//     console.log('ostiass!!!', address, protocols);
//     if (address !== 'ws://37.218.242.151:443/') {
//       throw new Error('could not connect');
//     }
//     // return new WebSocket('wss://snowflake.bamsoftware.com', protocols);
//     this.ws = new WebSocket('wss://snowflake.bamsoftware.com');
//     this.ws.binaryType = 'arraybuffer';
//     // return this.ws;

//     // setInterval(() => console.log(this.ws), 1000);

//     this.ws.onopen = function() {
//       console.log('ws.onopen')
//       this.onopen && this.onopen();
//     }.bind(this);

//     this.ws.onclose = function() {
//       console.log('ws.onclose')
//      this.onclose && this.onclose();
//     }.bind(this);

//     this.ws.onerror = function(e) {
//       console.log('ws.onerror')
//      this.onerror && this.onerror(e);
//     }.bind(this);

//     this.ws.onmessage = function(m) {
//       console.log('ws.onmessage')
//      this.onmessage && this.onmessage(m);
//     }.bind(this);
//   }

//   // send(data) {
//   //   console.log('hehe data', data);
//   //   this.ws.send(data);
//   // }

//   // close() {
//   //   console.log('hehe close');
//   //   this.ws.close();
//   // }
// }

// This starts the Tor Client. CustomSocketServer and CustomSocket allows us to
// mock the socket implementation as well as the local listening server (usually SOCKS proxy).
// We are using a fixed bridge (SnowFlake WebSocket bridge).
const instance = makeTorModule({
  CustomSocketServer: SocketServer,
  CustomSocket: SnowFlakeSocket,
  arguments: ['UseBridges', '1', 'Bridge', '37.218.242.151:443'], // snowflake.bamsoftware.com
});

function makeSocket(torPort) {
  const mockedServer = mockedServers.get(torPort);

  // TODO: check onerror, onopen...?
  var wsIn = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    _socket: {
      remoteAddress: ip,
      remotePort: port,
    },
    send: function(data) {
      wsOut.onmessage({ data });
    },
    close: function() {
      if (wsIn.readyState !== wsIn.CLOSED) {
        setTimeout(() => wsOut.close(), 0);
        wsIn.readyState = wsIn.CLOSED;
        wsIn.onclose && wsIn.onclose();
      }
    },
    readyState: 1,
  };

  var wsOut = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    send: function(data) {
      wsIn.onmessage({ data });
    },
    close: function() {
      if (wsOut.readyState !== wsOut.CLOSED) {
        setTimeout(() => wsIn.close(), 0);
        wsOut.readyState = wsOut.CLOSED;
        wsOut.onclose && wsOut.onclose();
      }
    },
    readyState: 0,
  };

  setTimeout(() => mockedServer.listeners.connection(wsIn), 0);
  setTimeout(() => {
    wsOut.readyState = 1;
    wsOut.onopen && wsOut.onopen();
  }, 0);

  return wsOut;
}
