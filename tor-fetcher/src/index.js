// import makeTorModule from '../external/ceba.js/build/tor';
import makeTLSSocketModule from '../external/tls-socket-wasm/dist/tls-socket-wasm';
// import { HTTPParser } from 'http-parser-js';
import FetchFactory from '../fetch-factory/fetch-factory';

// const torModule = makeTorModule();
// const tlsSocketModule = makeTLSSocketModule();

// TODO: wait for initialization, in case it's not synchronous.
const { TLSSocket, then } = makeTLSSocketModule();
const DEBUG = true;

async function makeDataChannel(hostname, port, protocol) {
  console.log('Protocol:', hostname, port, protocol);
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:7777');
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => resolve(new TLSSocket(hostname, ws, { debug: DEBUG }));
    ws.onclose = () => reject(new Error('closed'));
    ws.onerror = reject;
  });
}

then(() => {
  window.myfetch = FetchFactory({ makeDataChannel, debug: DEBUG });
});