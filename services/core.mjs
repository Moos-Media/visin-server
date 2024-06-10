import Networkhost from "./networkhost.mjs";
import settings from "settings-store";

class Core {
  constructor() {
    console.log("Core enabled.");

    const networkhost = new Networkhost(
      8000,
      "../visin-client",
      8001,
      "../visin-debug"
    );

    //Initializing is optional when using Electron
    settings.init({
      appName: "Visin", //required,
      publisherName: "lsms65", //optional
      reverseDNS: "localhost:8001", //required for macOS
    });
  }
}

export default Core;
