// Main Server Logic Class

import Networkhost from "./networkhost.mjs";
import EventEmitter from "node:events";
import StateManager from "./statemanager.mjs";

let FRAMERATE = 50;

class Core {
  constructor() {
    //Setup internal Event emitter that is shared in multiple classes
    const ee = new EventEmitter();

    //Setup new State Manager with rows, cols, Framerate and event emitter
    let stateManager = new StateManager(
      process.env.ROWS,
      process.env.COLS,
      FRAMERATE,
      ee
    );

    //Setup Network Host Service (Debug and Client routes)
    const networkhost = new Networkhost(
      process.env.PORT_PROD,
      "../visin-client",
      process.env.PORT_DEBUG,
      "../visin-debug",
      ee,
      stateManager
    );

    //Setup Main Game Loop (is run every frame)
    setInterval(() => {
      stateManager.doGameTick(networkhost.getNextControl());
    }, 1000 / FRAMERATE);

    //Route new Player info from statemanager to networkhost
    ee.on("active-player-changed", (data) => {
      networkhost.changePlayer(data);
    });
  }
}

export default Core;
