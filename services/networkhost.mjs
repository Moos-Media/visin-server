import express, { request, response } from "express";
import { Server, Socket } from "socket.io";
import * as http from "http";
import Tokenator from "./tokenator.mjs";

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
    this.CURRENTPLAYER = 0;
    this.players = new Array();
    this.activeSessions = new Array();
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

    //
    //Request Handling
    //
    buildIO.on("connection", (socket) => {
      this.players.push(socket.id);

      socket.on("/api/client/sendControl", (args) => {
        this.buffer.push(args.control);
      });

      socket.on("/api/client/startSession", (callback) => {
        let statusOut = "failed";
        let ID = 0;
        if (this.activeSessions.length < 10) {
          statusOut = "success";
          ID = Math.floor(Math.random() * 100000);
          this.activeSessions.push({
            player1: socket.id,
            player2: "",
            sessionID: ID,
          });
        }
        callback({
          status: statusOut,
          sessionID: ID,
        });
      });

      socket.on("/api/client/joinSession", (arg, callback) => {
        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          let status = "";
          if (element.sessionID == arg) {
            element.player2 = socket.id;
            buildIO.sockets.to(element["player1"]).emit("playerjoined");
            status = "success";
          }
          callback({
            status,
          });
        }
      });

      socket.on("/api/client/colorSelected", (ID, playerIndex, colorCode) => {
        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          if (element.sessionID != ID) continue;
          console.log("Hier");
          if (playerIndex == 0) {
            element.player1Color = colorCode;
            buildIO.sockets
              .to(element.player2)
              .emit("color-blocked", colorCode);
          } else {
            element.player2Color = colorCode;
            buildIO.sockets
              .to(element.player1)
              .emit("color-blocked", colorCode);
          }
        }
      });
    });

    //
    //
    //Debug
    //
    //
    const debugApp = express();

    const debugServer = http.createServer(debugApp);
    debugServer.listen(debugport);
    const debugIO = new Server(debugServer);
    debugApp.use(express.static(debugdirectory));
    debugApp.use(express.json({ limit: "1mb" }));

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

    debugApp.post("/api/show/getCurrentBoard", (request, response) => {
      const data = request.body;

      response.json({
        boardInfo: _stateManager.getCurrentBoardForShowing(),
        status: "success",
      });
    });

    debugIO.on("connection", () => {
      console.log("New Socket Connection Debug");
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
}
