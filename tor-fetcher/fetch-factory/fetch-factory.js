import { HTTPParser } from 'http-parser-js';

const _TextEncoder = typeof TextEncoder !== 'undefined' ? TextEncoder : require('util').TextEncoder;

const encoder = new _TextEncoder('utf-8');

function toByteArray(data) {
  if (typeof data === 'string') {
    return encoder.encode(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return new Uint8Array(data);
}

async function doRequest(request, _socket, options, log) {
  const socket = _socket;
  return new Promise((resolve, reject) => {
    if (options.timeout && typeof options.timeout === 'number') {
      setTimeout(() => {
        socket.close();
        reject(new Error('minifetch timeout'));
      }, options.timeout);
    }
    const parser = new HTTPParser(HTTPParser.RESPONSE);
    const kOnHeaders = HTTPParser.kOnHeaders | 0;
    const kOnHeadersComplete = HTTPParser.kOnHeadersComplete | 0;
    const kOnBody = HTTPParser.kOnBody | 0;
    const kOnMessageComplete = HTTPParser.kOnMessageComplete | 0;
    const kOnExecute = HTTPParser.kOnExecute | 0;

    let body = new Uint8Array();
    let versionMajor;
    let versionMinor;
    let headers;
    let method;
    let url;
    let statusCode;
    let statusMessage;
    let upgrade;
    let shouldKeepAlive;

    parser[kOnHeaders] = (_headers, _url) => {
      log('kOnHeaders', _headers, _url);
    };
    parser[kOnHeadersComplete] = (_versionMajor, _versionMinor, _headers, _method,
      _url, _statusCode, _statusMessage, _upgrade, _shouldKeepAlive) => {
      versionMajor = _versionMajor;
      versionMinor = _versionMinor;
      headers = _headers || [];
      statusCode = _statusCode;
      statusMessage = _statusMessage;
      upgrade = _upgrade;
      shouldKeepAlive = _shouldKeepAlive;

      const realHeaders = new Map();
      for (let i = 0; i < headers.length; i += 2) {
        realHeaders.set(headers[i], headers[i + 1]);
      }
      headers = realHeaders;
      if (method === 'CONNECT') {
        // See skipBody
        return 2;
      }
      return undefined;
    };
    parser[kOnBody] = (b, start, len) => {
      log('kOnBody', b, start, len);
      if (len > 0) {
        // FIXME: quite inefficient, but assuming bodies will not be very big...
        // TODO: set max body?
        const newBody = new Uint8Array(body.length + len);
        newBody.set(body);
        newBody.set(b.subarray(start, start + len), body.length);
        body = newBody;
      }
    };
    parser[kOnMessageComplete] = () => {
      log('kOnMessageComplete');
      const response = new Response(body, {
        status: statusCode,
        statusText: statusMessage,
        headers: new Headers(headers)
      });
      response._socket = socket;
      resolve(response);
      // socket.close();
    };
    parser[kOnExecute] = () => {
      log('kOnExecute');
    };
    // TODO: timeout? AbortController?
    socket.onerror = (error) => {
      log('socket error', error);
      socket.close();
      reject(error || new Error('Socket error'));
      parser.close();
    };
    socket.onmessage = (message) => {
      log('socket message(1)', message);
      const data = toByteArray(message.data);
      log('socket message(2)', data);
      const len = data.length;
      const ret = parser.execute(Buffer.from(data));
      if (ret !== len) {
        // TODO: these close are breaking something, should test.
        socket.close();
        reject(new Error('Invalid http response'));
      }
    };
    socket.onclose = () => {
      log('onclose(1)');
      const ret = parser.finish();
      log('onclose(2)', ret);
      reject(new Error('Closed before valid http response'));
      parser.close();
    };
    socket.send(request);
  });
}

// makeDataChannel receives a hostname, port and protocol and returns a Promise which
// resolves to an open socket-like object.
export default function FetchFactory({ makeDataChannel, debug = false }) {
  return async (_url, _options = {}) => {
    const options = _options;
    const log = debug ? console.log.bind(console, '[minifetch]', _url) : function noop() {};

    if (typeof _url !== 'string') {
      throw new Error('Url must be a string');
    }
    if (options === null || (typeof options !== 'object' && options !== undefined)) {
      throw new Error('Options must be an object or undefined');
    }
    const whitelistedOptions = ['method', 'body', 'debug', 'headers', 'timeout'];
    let method = 'GET';
    let body;
    if (options) {
      const keys = Object.keys(options).sort();
      const len = keys.length;
      for (let i = 0; i < len; i += 1) {
        if (whitelistedOptions.indexOf(keys[i]) === -1) {
          throw new Error(`Option "${keys[i]}" is not supported`);
        }
      }
      if (options.headers !== undefined) {
        options.headers = new Headers(options.headers);
      }
      if (options.method !== undefined) {
        if (typeof options.method !== 'string') {
          throw new Error('Method must be a string');
        }
        const whitelistedMethods = ['GET', 'POST', 'CONNECT'];
        method = options.method.toUpperCase();
        if (whitelistedMethods.indexOf(method) === -1) {
          throw new Error(`Method "${method}" is not supported`);
        }
      }
      if (options.body !== undefined) {
        if (options.body instanceof ArrayBuffer) {
          body = new Uint8Array(options.body);
        } else if (ArrayBuffer.isView(options.body)) {
          body = new Uint8Array(
            options.body.buffer,
            options.body.byteOffset,
            options.body.byteLength
          );
        } else if (typeof options.body === 'string') {
          body = encoder.encode(options.body);
        } else {
          throw new Error('Unsupported body type');
        }
      }
    }

    const url = new URL(_url);
    const { protocol } = url;
    if (protocol !== 'http:' && protocol !== 'https:') {
      throw new Error(`Unsupported protocol "${protocol}"`);
    }
    const port = url.port || (protocol === 'http:' ? '80' : '443');
    const pathname = method === 'CONNECT' ? url.host : url.pathname;

    // Let's build the raw request, easy!
    let request = '';
    request += `${method} ${pathname} HTTP/1.1\r\n`;
    request += `Host: ${url.host}\r\n`;
    request += 'Connection: close\r\n'; // keep-alive?
    if (options.headers) {
      options.headers.forEach((value, key) => {
        // TODO: need to be more strict
        request += `${key}: ${value}\r\n`;
      });
    }
    request += '\r\n';

    request = encoder.encode(request);
    if (body) {
      const tmp = new Uint8Array(request.length + body.length);
      tmp.set(request, 0);
      tmp.set(body, request.length);
      request = tmp;
    }

    // For simplicity, assuming responses will be small
    const socket = await makeDataChannel(url.hostname, port, protocol);

    return doRequest(request, socket, options, log);
  };
}
