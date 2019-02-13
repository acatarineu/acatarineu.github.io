class SocketServer {
  constructor(config) {
    if (!config || config.host !== '127.0.0.1' || typeof config.port !== 'number') {
      throw new Error(`Wrong listening server ${(config && config.port)}`);
    }
    this.config = config;
    this.listeners = {};
    this.server = net.createServer((socket) => {
      let remoteAddress = socket.remoteAddress;
      if (remoteAddress.indexOf('::ffff:') === 0) {
        remoteAddress = remoteAddress.slice(7);
      }
      const _socket = new TcpSocket(socket, remoteAddress, socket.remotePort);
      _socket.readyState = TcpSocket.OPEN;
      this.listeners.connection(_socket);
    });
    this.server.listen(config.port, config.port);
  }

  on(name, cb) {
    this.listeners[name] = cb;
  }

  close() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.server.close();
    delete this.server;
    delete this.listeners;
    delete this.config;
  }
}