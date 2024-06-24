import Networkhost from "./networkhost.mjs";
import settings from "settings-store";
import EventEmitter from "node:events";
import StateManager from "./statemanager.mjs";

let FRAMERATE = 30;

class Core {
  constructor() {
    let stateManager = new StateManager(22, 6, FRAMERATE);
    setInterval(() => {
      stateManager.doGameTick(networkhost.getNextControl());
    }, 1000 / FRAMERATE);

    const ee = new EventEmitter();

    const networkhost = new Networkhost(
      process.env.PORT_PROD,
      "../visin-client",
      process.env.PORT_DEBUG,
      "../visin-debug",
      ee,
      stateManager
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
