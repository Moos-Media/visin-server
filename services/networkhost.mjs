import express, { request, response } from "express";
import { Server, Socket } from "socket.io";
import * as http from "http";
import Tokenator from "./tokenator.mjs";
import QueueManager from "./queuemanager.mjs";

export default class Networkhost {
  constructor(
    buildport,
    builddirectory,
    debugport,
    debugdirectory,
    _ee,
    _stateManager
  ) {
    //Set up Token Helper
    const tokenator = new Tokenator(process.env.SESSION_ID_LENGTH);
    const queueManager = new QueueManager();
    this.CURRENTPLAYER = 0;
    this.buffer = new Array();

    //Set up Servers with passed in values
    //
    //Build
    const buildApp = express();

    const buildServer = http.createServer(buildApp);
    buildServer.listen(buildport);
    const buildIO = new Server(buildServer);
    buildApp.use(express.static(builddirectory));
    buildApp.use(express.json({ limit: "1mb" }));
    buildIO.on("connection", this.newConnection);

    //
    //Request Handling
    //
    buildApp.post("/api/client/registerClient", (request, response) => {
      const data = request.body;
      // if (this.userList.length < process.env.MAX_CONCURRENT_PLAYERS) {
      //   response.json({ status: "success", userID: this.userList.length });
      //   this.userList.push(data.userKey);
      // }
      let userID = queueManager.registerClient(data.userKey);
      response.json({ status: "success", userID: userID });
    });

    buildApp.post("/api/client/sendControl", (request, response) => {
      const data = request.body;

      console.log(data.userID + data.control);
      response.json({ status: "success" });
      if (data.userID == this.CURRENTPLAYER) {
        this.buffer.push(data.control);
      }
    });
    //
    //Debug
    //
    const debugApp = express();

    const debugServer = http.createServer(debugApp);
    debugServer.listen(debugport);
    const debugIO = new Server(debugServer);
    debugApp.use(express.static(debugdirectory));
    debugApp.use(express.json({ limit: "1mb" }));
    debugIO.on("connection", this.newConnection);

    //
    //RequestHandling
    //
    debugApp.post("/api/debug/login", (request, response) => {
      const data = request.body;

      //Check for access
      if (data.username == "admin" && data.passkey == "admin") {
        let newToken = tokenator.generateToken();
        response.json({ result: true, sessionToken: newToken });
        console.log(newToken);
        console.log("Login successful");
      } else {
        response.json({ result: false });
      }
    });

    debugApp.post("/api/debug/getCurrentBoard", (request, response) => {
      const data = request.body;

      //Check for access
      if (tokenator.validateToken(data.sessionToken)) {
        response.json({
          boardInfo: _stateManager.getCurrentBoardForDebug(),
          status: "success",
        });
      }
    });
  }

  changePlayer(newPlayer) {
    this.CURRENTPLAYER = newPlayer;
    this.buffer = new Array();
  }

  getNextControl() {
    let output = "";
    if (this.buffer.length > 0) {
      output = this.buffer[0];
      this.buffer = this.buffer.slice(1);
    }
    return output;
  }

  newConnection(socket) {
    console.log("new connection from socket");
    console.log(socket);
  }
}
