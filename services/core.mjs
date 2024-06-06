import Networkhost from "./networkhost.mjs";

class Core {
  constructor() {
    console.log("Core enabled.");

    const networkhost = new Networkhost(
      8000,
      "../visin-client",
      8001,
      "../visin-debug"
    );
  }
}

export default Core;
