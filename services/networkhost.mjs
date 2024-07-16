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
    this.CURRENTPLAYER = 1;
    this.players = new Array();
    this.activeSessions = new Array();
    this.buffer = new Array();
    this.isUsedForPlay = false;
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
        if (args.player == this.CURRENTPLAYER) {
          this.buffer.push(args.control);
          if (!this.isUsedForPlay) {
            this.isUsedForPlay = true;
            _stateManager.useForPlay();
          }
        }
      });

      socket.on("/api/client/startSession", (callback) => {
        let statusOut = "failed";
        let ID = 0;
        if (this.activeSessions.length < 10 && _stateManager.getIsAvailable()) {
          statusOut = "success";
          ID = Math.floor(Math.random() * 100000);
          this.activeSessions.push({
            player1: socket.id,
            player2: "",
            sessionID: ID,
          });
          _stateManager.block();
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
            _stateManager.updateActiveSession(arg);
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
          if (playerIndex == 1) {
            element.player1Color = colorCode;
            _stateManager.updatePlayer1Color(colorCode);
            _stateManager.showColorPicking(0, colorCode);
            buildIO.sockets
              .to(element.player2)
              .emit("color-blocked", colorCode);
          } else {
            element.player2Color = colorCode;
            _stateManager.updatePlayer2Color(colorCode);
            _stateManager.showColorPicking(1, colorCode);
            buildIO.sockets
              .to(element.player1)
              .emit("color-blocked", colorCode);
          }
        }
      });

      socket.on(
        "/api/client/getAchievements",
        (SESSIONID, PLAYERID, callback) => {
          console.log(SESSIONID);
          console.log(PLAYERID);

          let test = new Array();
          test.push(1);
          test.push(15);
          test.push(16);
          callback(test);
        }
      );

      _ee.on("game-won", (data) => {
        let sessionToDelete = -1;
        let winner = "";
        let loser = "";
        if (data.player == 1) {
          winner = "player1";
          loser = "player2";
        } else {
          winner = "player2";
          loser = "player1";
        }

        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          if (element.sessionID == data.session) {
            buildIO.sockets.to(element[winner]).emit("won");
            buildIO.sockets.to(element[loser]).emit("lost");
            sessionToDelete = i;
          }
        }

        if (sessionToDelete > -1) {
          this.activeSessions.splice(sessionToDelete, 1);
          _stateManager.release();
        }
      });

      _ee.on("game-draw", (data) => {
        let sessionToDelete = -1;

        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          if (element.sessionID == data.session) {
            buildIO.sockets.to(element[element.player1]).emit("draw");
            buildIO.sockets.to(element[element.player2]).emit("draw");
            sessionToDelete = i;
          }
        }

        if (sessionToDelete > -1) {
          this.activeSessions.splice(sessionToDelete, 1);
          _stateManager.release();
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

    debugApp.post("/api/show/getBrightness", (request, response) => {
      const data = request.body;

      response.json({
        brightness: 255,
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
