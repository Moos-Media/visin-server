import express, { request, response } from "express";
import { Server, Socket } from "socket.io";
import * as http from "http";
import Tokenator from "./tokenator.mjs";
import GameBot from "./gamebot.mjs";

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
    this.CURRENTPLAYER = -99;
    this.players = new Array();
    this.activeSessions = new Array();
    this.buffer = new Array();
    this.GameBot = new GameBot(1);

    this.MODELBRIGHTNESS = 255;
    this.hasWaitingRandom = false;
    this.isBotGame = false;
    this.colSelected = 0;
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
          _stateManager.whiteOut();
        } else if (!_stateManager.getIsAvailable()) {
          statusOut = "blocked";
        }
        callback({
          status: statusOut,
          sessionID: ID,
        });
      });

      socket.on("/api/client/joinSession", (arg, callback) => {
        console.log("Received arg: " + arg);
        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          let status = "";
          if (element.sessionID == arg) {
            console.log("Found session");
            element.player2 = socket.id;
            _stateManager.updateActiveSession(arg);
            buildIO.sockets.to(element["player1"]).emit("playerjoined");
            console.log("status: " + status);
            status = "success";
            console.log("status: " + status);
          }
          callback({
            status: status,
          });
        }
      });

      socket.on("/api/client/requestRandomSession", (callback) => {
        let status = "failed";
        let sessionID = -99;
        let playerID = -99;

        if (
          !this.hasWaitingRandom &&
          _stateManager.getIsAvailable() &&
          this.activeSessions.length < 10
        ) {
          status = "success";
          sessionID = 200000;
          playerID = 1;

          this.activeSessions.push({
            player1: socket.id,
            player2: "",
            sessionID,
          });
          _stateManager.block();
          _stateManager.whiteOut();
          this.hasWaitingRandom = true;
        } else if (this.hasWaitingRandom) {
          status = "success";
          sessionID = 200000;
          playerID = 2;

          for (let i = 0; i < this.activeSessions.length; i++) {
            const element = this.activeSessions[i];
            if (element.sessionID == 200000) {
              element.player2 = socket.id;
            }
          }
          _stateManager.updateActiveSession(200000);
        } else if (!_stateManager.getIsAvailable()) {
          status = "blocked";
        }

        callback({
          status,
          sessionID,
          playerID,
        });
      });

      socket.on("/api/client/requestBotSession", (callback) => {
        let status = "failed";
        let sessionID = -99;
        let playerID = -99;

        if (_stateManager.getIsAvailable() && this.activeSessions.length < 10) {
          status = "success";
          sessionID = 300000;
          playerID = 1;

          this.activeSessions.push({
            player1: socket.id,
            player2: "",
            sessionID,
          });
          _stateManager.block();
          _stateManager.whiteOut();
          _stateManager.updateActiveSession(300000);
          this.isBotGame = true;
        } else if (!_stateManager.getIsAvailable()) {
          status = "blocked";
        }

        callback({
          status,
          sessionID,
          playerID,
        });
      });

      socket.on("api/client/endSession", (arg) => {
        let sessionToDelete = -1;

        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          if (element.sessionID == arg) {
            buildIO.sockets.to(element["player1"]).emit("delete");
            buildIO.sockets.to(element["player2"]).emit("delete");
            sessionToDelete = i;
          }
        }

        if (sessionToDelete > -1) {
          this.activeSessions.splice(sessionToDelete, 1);
          _stateManager.reset();
          _stateManager.setupTHMLOGO(2, 1);
          _stateManager.release();
          this.hasWaitingRandom = false;
          this.isBotGame = false;
          this.colSelected = 0;
        }
      });

      socket.on("/api/client/colorSelected", (ID, playerIndex, colorCode) => {
        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          if (element.sessionID != ID) continue;
          if (playerIndex == 1) {
            element.player1Color = colorCode;
            _stateManager.updatePlayer1Color(colorCode);
            this.colSelected += 1;
            _stateManager.showColorPicking(0, colorCode);
            buildIO.sockets
              .to(element.player2)
              .emit("color-blocked", colorCode);

            if (this.isBotGame) {
              let playerColor = colorCode[5];
              let botNum = playerColor + 1;
              if (botNum > 6) {
                botNum = botNum % 6;
              }
              let botCode = "COLOR";
              botCode = botCode.concat(botNum);
              element.player2Color = botCode;
              _stateManager.updatePlayer2Color(botCode);
              this.colSelected += 1;
              _stateManager.showColorPicking(1, botCode);
            }
          } else {
            element.player2Color = colorCode;
            _stateManager.updatePlayer2Color(colorCode);
            this.colSelected += 1;
            _stateManager.showColorPicking(1, colorCode);
            buildIO.sockets
              .to(element.player1)
              .emit("color-blocked", colorCode);
          }
        }
        console.log("Fabrne: " + this.colSelected);

        if (this.colSelected == 2) {
          console.log("Zwei Farben");
          _stateManager.startGame();
        }
      });

      socket.on(
        "/api/client/getAchievements",
        (SESSIONID, PLAYERID, callback) => {
          console.log(
            "Got request: " + "ID: " + SESSIONID + "PLAYER: " + PLAYERID
          );
          let output = _stateManager.getAch(PLAYERID);
          callback(output);
        }
      );

      socket.on("api/client/getMoveTime", (callback) => {
        let time = _stateManager.getTimePerMove();
        callback(time);
      });
      _ee.on("possible-bot-move", (data) => {
        if (!this.isBotGame) {
          return;
        }

        this.buffer = this.GameBot.getMoves(
          _stateManager.getCurrentBoardCopy(),
          _stateManager.getCurrentColumn()
        );
        console.log("Buffer: " + this.buffer);
      });

      _ee.on("update-time", (data) => {
        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          if (element.sessionID == data.sessionID) {
            let playerString = "player" + data.player;
            console.log(playerString);

            buildIO.sockets
              .to(element[playerString])
              .emit("update-time", data.time);
          }
        }
      });

      _ee.on("session-abandoned", (arg) => {
        console.log("Received");
        let sessionToDelete = -1;

        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          if (element.sessionID == arg) {
            buildIO.sockets.to(element["player1"]).emit("delete");
            buildIO.sockets.to(element["player2"]).emit("delete");
            sessionToDelete = i;
          }
        }

        if (sessionToDelete > -1) {
          this.activeSessions.splice(sessionToDelete, 1);
          _stateManager.reset();
          _stateManager.setupTHMLOGO(2, 1);
          _stateManager.release();
          this.hasWaitingRandom = false;
          this.isBotGame = false;
          this.colSelected = 0;
        }
      });

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
          this.hasWaitingRandom = false;
          this.isBotGame = false;
        }
      });

      _ee.on("game-draw", (data) => {
        let sessionToDelete = -1;

        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          if (element.sessionID == data.session) {
            buildIO.sockets.to(element["player1"]).emit("game-draw");
            buildIO.sockets.to(element["player2"]).emit("game-draw");
            sessionToDelete = i;
          }
        }

        if (sessionToDelete > -1) {
          this.activeSessions.splice(sessionToDelete, 1);
          _stateManager.release();
          this.hasWaitingRandom = false;
          this.isBotGame = false;
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
      if (
        data.username == process.env.DEBUG_USER &&
        data.passkey == process.env.DEBUG_PW
      ) {
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
        brightness: this.MODELBRIGHTNESS,
      });
    });

    debugApp.post("/api/show/setBrightness", (request, response) => {
      const data = request.body;

      if (tokenator.validateToken(data.SESSIONTOKEN)) {
        this.MODELBRIGHTNESS = data.inputValue;

        console.log("Set new Brightness: " + this.MODELBRIGHTNESS);

        response.json({
          success: true,
        });
      }
    });

    debugApp.post("/api/debug/setTime", (request, response) => {
      const data = request.body;

      if (tokenator.validateToken(data.SESSIONTOKEN)) {
        this.MODELBRIGHTNESS = data.inputValue;
        _stateManager.setTimePerMove(data.inputValue);

        console.log("Set new Time: " + data.inputValue);

        response.json({
          success: true,
        });
      }
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
