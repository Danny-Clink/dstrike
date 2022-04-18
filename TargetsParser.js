const fs = require("fs");
const { exec } = require("child_process");

const messageContainer = require("./messageContainer");

class TargetsParser {
  #hostPortPattern = new RegExp(/([0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3} \(([0-9]{1,3}\/[a-z].*)\))/, "g");

  async generateTargets() {
    const targets = this._handleTargets(this.#hostPortPattern);
    const tcp = targets.filter((target) => target.type === "tcp");
    const http = targets.filter((target) => target.type === "http");
    const https = targets.filter((target) => target.type === "https");

    await fs.writeFileSync(
      "./targets.json",
      JSON.stringify({ data: { tcp, http, https } }, null, 2)
    );

    exec(`git add targets.json"`, this._handleConsoleCommands.bind(this));
    exec(`git commit -m "update targets"`, this._handleConsoleCommands.bind(this));
    exec(`git push`, this._handleConsoleCommands.bind(this));
  }

  _handleTargets(regexp) {
    const targets = messageContainer.match(regexp);

    if(!targets) { return []; }

    return targets.reduce((result, target) => {
      const [ host, ports ] = target.split(" (");
      ports.split(", ").forEach((portType) => {
        const [ port, type ] = portType.split("/");

        result.push({ host, port: Number(port), type: type.replace(")", "") });
      });

      return result; 
    }, []);
  }

  _handleConsoleCommands(error, stdout, stderr) {
    if(error) { console.log(error); }
    if(stdout) { console.log(stdout); }
    if(stderr) { console.log(stderr); }
  }
}

(function() {
  new TargetsParser().generateTargets();
})();