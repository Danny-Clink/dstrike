const HttpsProxyAgent = require("https-proxy-agent");
const { SocksProxyAgent } = require("socks-proxy-agent");
const axios = require("axios");

class ProxyChecker {
  constructor() {
    this.link = "https://google.com";
    this._axiosResolveInterceptor();
  }

  async getProxies() {
    const [ socks4, socks5 ] = await Promise.all([
      this._getSocks4(),
      this._getSocks5(),
    ]);

    return [
      ...socks4,
      ...socks5,
    ];
  }

  async _getSocks4() {
    const proxyList = await this._getProxy("socks4");
    const requests = this._batchProxies(proxyList);

    console.info("[Info]:", "Proxy check started, method: socks4");
    const responses = await Promise.all(requests);
    console.info("[Info]:", "Proxy check ended");

    return this._reduceProxy(responses);
  }

  async _getSocks5() {
    const proxyList = await this._getProxy("socks5");
    const requests = this._batchProxies(proxyList);

    console.info("[Info]:", "Proxy check started, method: socks5");
    const responses = await Promise.all(requests);
    console.info("[Info]:", "Proxy check ended");

    return this._reduceProxy(responses);
  }

  async _getHttp() {
    const proxyList = await this._getProxy("http");
    const requests = this._batchProxies(proxyList);

    console.info("[Info]:", "Proxy check started, method: http");
    const responses = await Promise.all(requests);
    console.info("[Info]:", "Proxy check ended");

    return this._reduceProxy(responses);
  }

  async _getHttps() {
    const proxyList = await this._getProxy("https");
    const requests = this._batchProxies(proxyList);

    console.info("[Info]:", "Proxy check started, method: https");
    const responses = await Promise.all(requests);
    console.info("[Info]:", "Proxy check ended");

    return this._reduceProxy(responses);
  }

  async _getProxy(type) {
    const proxies = await axios({
      url: `https://www.proxy-list.download/api/v1/get?type=${type}`,
      method: "GET"
    });

    return proxies && proxies.data ? 
      proxies.data.split(/\r\n/).map((endpoint) => ({ server: `${type}://${endpoint}`, type })) : []
  }

  _axiosResolveInterceptor() {
    axios.interceptors.response
      .use((response) => response, (error) => Promise.resolve(error));
  }

  _batchProxies(proxyList) {
    return proxyList.map((endpoint) => {
      return axios({
        url: this.link,
        method: "GET",
        httpsAgent: endpoint.type === "socks4" || endpoint.type === "socks5" ?
          new SocksProxyAgent(endpoint.server) : new HttpsProxyAgent(endpoint.server),
        timeout: 10000,
        clarifyTimeoutError: false,
      });
    });
  }

  _reduceProxy(responses) {
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
}

module.exports = ProxyChecker;
