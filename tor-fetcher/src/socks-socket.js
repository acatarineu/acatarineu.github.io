// https://samsclass.info/122/proj/how-socks5-works.html
function SocksSocket(ws, domain, port) {
  var self = this;

  this.CONNECTING = 0;
  this.OPEN = 1;
  this.CLOSING = 2;
  this.CLOSED = 3;

  this.readyState = this.CONNECTING;

  this.step = 0;

  this.ws = ws;
  this.domain = domain;
  this.port = port;
  this.ws.onopen = function() {
    self.start();
  };

  this.ws.onclose = function() {
    self.readyState = self.CLOSED;
    self.onclose();
  };

  this.ws.onerror = function(e) {
    self.readyState = self.CLOSED;
    self.onerror(e);
  };

  this._error = function(e) {
    self.onerror(e);
    try {
      self.ws.close();
    } catch (e) {
      // pass
    }
    self.ws = null;
  }

  this.ws.onmessage = function(m) {
    var data = new Uint8Array(m.data);
    if (self.step === 1) {
      if (data.length !== 2 || data[0] !== 5 || data[1] !== 0) {
        self._error(new Error('bad data 1'));
      } else {
        self.connect();
      }
    } else if (self.step === 2) {
      if (data.length !== 10) {
        self._error(new Error('bad data 2'));
      } else {
        self.step = 3;
        self.readyState = self.OPEN;
        self.onopen();
      }
    } else {
      self.onmessage(m);
    }
  };
}

SocksSocket.prototype.start = function() {
  this.step = 1;
  this.ws.send(new Uint8Array([0x05, 0x01, 0x00]));
};

SocksSocket.prototype.connect = function() {
  this.step = 2;
  var domain = (new TextEncoder()).encode(this.domain);

  var data = new Uint8Array(7 + domain.length);
  data[0] = 0x05;
  data[1] = 0x01;
  data[2] = 0x00;
  data[3] = 0x03;
  data[4] = domain.length;
  data.set(domain, 5);
  data[data.length - 2] = (this.port >> 8) & 0xFF;
  data[data.length - 1] = this.port & 0xFF;

  this.ws.send(data);
};

SocksSocket.prototype.send = function(x) {
  this.ws.send(x);
}

SocksSocket.prototype.close = function(x) {
  if (this.ws) {
    this.readyState = this.CLOSED;
    this.ws.close();
    this.ws = null;
  }
}

export default SocksSocket;