import Networkhost from "./networkhost.mjs";

class Core {
  constructor() {
    console.log("Core enabled.");

    const networkhost = new Networkhost(8000, "build", 8001, "debugpage");
  }
}

export default Core;
