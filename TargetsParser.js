const fs = require("fs");

const messageContainer = require("./messageContainer");

class TargetsParser {
  #multiplePorts = new RegExp(/([0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3} \(([0-9]{1,3}\/tcp, [0-9]{1,3}\/tcp)\))/, "g");
  #onePort = new RegExp(/([0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3} \(([0-9]{1,3}\/tcp))\)/, "g");

  generateTargets() {
    const targetsMultiplePorts = this._handleTargets(this.#multiplePorts);
    const targetsOnePort = this._handleTargets(this.#onePort);

    fs.writeFileSync(
      "./targets.json",
      JSON.stringify({ data: [...targetsMultiplePorts, ...targetsOnePort] }, null, 2)
    );
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
}

(function() {
  new TargetsParser().generateTargets();
})();