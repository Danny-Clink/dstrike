const fs = require("fs");
const { exec } = require("child_process");

const messageContainer = require("./messageContainer");

class TargetsParser {
  #multiplePorts = new RegExp(/([0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3} \(([0-9]{1,3}\/tcp, [0-9]{1,3}\/tcp)\))/, "g");
  #onePort = new RegExp(/([0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3} \(([0-9]{1,3}\/tcp))\)/, "g");

  async generateTargets() {
    const targetsMultiplePorts = this._handleTargets(this.#multiplePorts);
    const targetsOnePort = this._handleTargets(this.#onePort);

    await fs.writeFileSync(
      "./targets.json",
      JSON.stringify({ data: [...targetsMultiplePorts, ...targetsOnePort] }, null, 2)
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
          const [ port ] = portType.split("/");

          result.push({ host, port: Number(port) });
        });

        return result; 
    }, []);
  }

  _handleConsoleCommands(error, stdout, stderr) {
    if(error) { console.log(error); }
    if(stdout) { console.log(); }
    if(stderr) { console.log(); }
  }
}

(function() {
  new TargetsParser().generateTargets();
})();