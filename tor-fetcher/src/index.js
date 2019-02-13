import makeTorModule from '../external/ceba.js/build/tor';
import makeTLSSocketModule from '../external/tls-socket-wasm/dist/tls-socket-wasm';
import FetchFactory from './fetch-factory';
import SocksSocket from './socks-socket';
if (!console) {
  console = {};
}
var old = console.log.bind(console);
window.console.log = function (...args) {
  old(...args);
  var logger = document.getElementById('log');
  const tr = document.createElement('tr');
  const th = document.createElement('th');
  th.appendChild(document.createTextNode(JSON.stringify(args)));
  tr.appendChild(th);
  logger.appendChild(tr);
  const container = document.getElementById('cont');
  container.scrollTop = container.scrollHeight;
};

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
  if (address !== 'ws://37.218.242.151:443/') {
    throw new Error('could not connect');
  }
  const ws = new WebSocket('wss://snowflake.bamsoftware.com');
  ws.binaryType = 'arraybuffer';
  return ws;
}

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
      remoteAddress: '127.0.0.1',
      remotePort: 6666,
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

const DEBUG = false;
const { TLSSocket, then } = makeTLSSocketModule();
then(() => {
  window.makeTunnelSocket = function(hostname, port) {
    return new SocksSocket(makeSocket(9050), hostname, port);
  }

  async function makeDataChannel(hostname, port, protocol) {
    console.log('Fetching url:', hostname, port, protocol);
    return new Promise((resolve, reject) => {
      const ws = new SocksSocket(makeSocket(9050), hostname, port);
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => resolve(protocol === 'https:' ? new TLSSocket(hostname, ws, { debug: DEBUG }) : ws);
      ws.onclose = () => reject(new Error('closed'));
      ws.onerror = reject;
    });
  }

  window.torFetch = FetchFactory({ makeDataChannel, debug: DEBUG });
});