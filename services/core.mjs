import Networkhost from "./networkhost.mjs";
import settings from "settings-store";

class Core {
  constructor() {
    const networkhost = new Networkhost(
      process.env.PORT_PROD,
      "../visin-client",
      process.env.PORT_DEBUG,
      "../visin-debug"
    );

    //Initializing is optional when using Electron
    settings.init({
      appName: "Visin", //required,
      publisherName: "lsms65", //optional
      reverseDNS: process.env.REVERSE_DNS, //required for macOS
    });
  }
}

export default Core;
