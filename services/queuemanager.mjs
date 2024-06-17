import Utils from "./utils.mjs";
import EventEmitter from "node:events";

export default class QueueManager {
  constructor(_ee) {
    this.ee = _ee;
    this.myUtil = new Utils();
    this.registeredClients = new Array();
  }

  registerClient(_userKey) {
    let firstConnection = new Date();
    if (this.registeredClients.length < 100) {
      this.registeredClients.push(firstConnection.getTime());
    }
    return this.registeredClients.length - 1;
  }
}
