import Networkhost from "./networkhost.mjs";
import settings from "settings-store";
import EventEmitter from "node:events";
import StateManager from "./statemanager.mjs";

let FRAMERATE = 30;

class Core {
  constructor() {
    const ee = new EventEmitter();

    let stateManager = new StateManager(7, 6, FRAMERATE, ee);
    setInterval(() => {
      stateManager.doGameTick(networkhost.getNextControl());
    }, 1000 / FRAMERATE);

    const networkhost = new Networkhost(
      process.env.PORT_PROD,
      "../visin-client",
      process.env.PORT_DEBUG,
      "../visin-debug",
      ee,
      stateManager
    );

    ee.on("active-player-changed", (data) => {
      networkhost.changePlayer(data);
    });

    //Initializing is optional when using Electron
    settings.init({
      appName: "Visin", //required,
      publisherName: "lsms65", //optional
      reverseDNS: process.env.REVERSE_DNS, //required for macOS
    });
  }
}

export default Core;
