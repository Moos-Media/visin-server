//Class organizing all network duties
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

    //Helpers for "non-normal" game modes (random and bot)
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
    //Request Handling, clients opening the page automatically connect via socket
    //
    buildIO.on("connection", (socket) => {
      this.players.push(socket.id);

      //Handler for incoming control
      socket.on("/api/client/sendControl", (args) => {
        //If sending player is current Player, add input to buffer, else drop it
        if (args.player == this.CURRENTPLAYER) {
          this.buffer.push(args.control);
        }
      });

      //Handler for starting session (play with friend and get shareable code)
      socket.on("/api/client/startSession", (callback) => {
        let statusOut = "failed";
        let ID = 0;

        //Check if max number of concurrent sessions (internal structure, current limit 10) isn't exceeded
        //Check if Board is available for play
        if (this.activeSessions.length < 10 && _stateManager.getIsAvailable()) {
          statusOut = "success";

          //generate random session code (should normally be 5 chars long, could be shorter, depending on random)
          ID = Math.floor(Math.random() * 100000);

          //Save new Session to session list (saving ID from above and socket ids from players, to send message back)
          this.activeSessions.push({
            player1: socket.id,
            player2: "",
            sessionID: ID,
          });

          //Block the game board so no other players could joing
          _stateManager.block();

          //Remove THM Logo
          _stateManager.whiteOut();

          //If board is in use, send status blocked
        } else if (!_stateManager.getIsAvailable()) {
          statusOut = "blocked";
        }

        //send status and session id back
        callback({
          status: statusOut,
          sessionID: ID,
        });
      });

      //Handler for joining by code
      socket.on("/api/client/joinSession", (arg, callback) => {
        //Loop through all current sessions
        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          let status = "";

          //If session with matching id is found continue
          if (element.sessionID == arg) {
            //Save socket id of second player
            element.player2 = socket.id;

            //Set this session as active session (by id)
            _stateManager.updateActiveSession(arg);

            //Inform player 1 that player 2 joined
            buildIO.sockets.to(element["player1"]).emit("playerjoined");
            status = "success";
          }
          callback({
            status: status,
          });
        }
      });

      //Handler for random game session
      socket.on("/api/client/requestRandomSession", (callback) => {
        let status = "failed";
        let sessionID = -99;
        let playerID = -99;

        //Check if this is first random inquiry, board is available and sessions not maxed out
        if (
          !this.hasWaitingRandom &&
          _stateManager.getIsAvailable() &&
          this.activeSessions.length < 10
        ) {
          //If all true, set session id to 200.000 (out of normal range!)
          status = "success";
          sessionID = 200000;
          playerID = 1;

          //Save info to session list
          this.activeSessions.push({
            player1: socket.id,
            player2: "",
            sessionID,
          });

          //block board and delete logo
          _stateManager.block();
          _stateManager.whiteOut();

          //save info that random player is waiting
          this.hasWaitingRandom = true;

          //if random is already waiting, send info out
        } else if (this.hasWaitingRandom) {
          status = "success";
          sessionID = 200000;
          playerID = 2;

          //loop through all sessions to find the one with a random waiting
          for (let i = 0; i < this.activeSessions.length; i++) {
            const element = this.activeSessions[i];

            //Save socket id of player 2
            if (element.sessionID == 200000) {
              element.player2 = socket.id;
            }
          }

          //Set active session
          _stateManager.updateActiveSession(200000);

          //Error out if board isnt available
        } else if (!_stateManager.getIsAvailable()) {
          status = "blocked";
        }

        //Return status, player id and session id
        callback({
          status,
          sessionID,
          playerID,
        });
      });

      //Handler for Bot Request
      socket.on("/api/client/requestBotSession", (callback) => {
        let status = "failed";
        let sessionID = -99;
        let playerID = -99;

        //Check if board and session is available
        if (_stateManager.getIsAvailable() && this.activeSessions.length < 10) {
          status = "success";

          //assign sesion ID 300.000 (out of normal range!)
          sessionID = 300000;
          playerID = 1;

          //save info of human player into session list
          this.activeSessions.push({
            player1: socket.id,
            player2: "",
            sessionID,
          });

          //Prepare game as usual
          _stateManager.block();
          _stateManager.whiteOut();
          _stateManager.updateActiveSession(300000);

          //save status that bot is playing for internal use
          this.isBotGame = true;

          //error out if board is blocked
        } else if (!_stateManager.getIsAvailable()) {
          status = "blocked";
        }

        //Send info out
        callback({
          status,
          sessionID,
          playerID,
        });
      });

      //Handler for game cancellation
      socket.on("api/client/endSession", (arg) => {
        let sessionToDelete = -1;

        //Loop through all sessions to find matching session
        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          //if found, tell both players to delete session now (client changes screen and resets itself)
          if (element.sessionID == arg) {
            buildIO.sockets.to(element["player1"]).emit("delete");
            buildIO.sockets.to(element["player2"]).emit("delete");
            sessionToDelete = i;
          }
        }

        //Remove Session from list
        if (sessionToDelete > -1) {
          this.activeSessions.splice(sessionToDelete, 1);

          //Reset board and prepare for next game
          _stateManager.reset();
          _stateManager.setupTHMLOGO(2, 1);
          _stateManager.release();

          //Reset gamemode helpers aswell
          this.hasWaitingRandom = false;
          this.isBotGame = false;
          this.colSelected = 0;
        }
      });

      //Handler for color selection
      socket.on("/api/client/colorSelected", (ID, playerIndex, colorCode) => {
        //Loop through session to find matching one
        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          if (element.sessionID != ID) continue;

          //Handle choice of player 1
          if (playerIndex == 1) {
            //Save color
            element.player1Color = colorCode;
            _stateManager.updatePlayer1Color(colorCode);

            //Track number of players who have chosen a color (needed for random game mode)
            this.colSelected += 1;

            //Show color on lights
            _stateManager.showColorPicking(0, colorCode);

            //Block choice of same color for player 2
            buildIO.sockets
              .to(element.player2)
              .emit("color-blocked", colorCode);

            //choose bots color in case of botgame
            if (this.isBotGame) {
              let playerColor = colorCode[5];
              let botNum = playerColor + 1;
              if (botNum > 6) {
                botNum = botNum % 6;
              }
              let botCode = "COLOR";
              botCode = botCode.concat(botNum);

              //save color
              element.player2Color = botCode;
              _stateManager.updatePlayer2Color(botCode);
              this.colSelected += 1;
              //show on lights
              _stateManager.showColorPicking(1, botCode);
            }
            //handle player 2
          } else {
            //save color
            element.player2Color = colorCode;
            _stateManager.updatePlayer2Color(colorCode);
            this.colSelected += 1;

            //display color on lights
            _stateManager.showColorPicking(1, colorCode);

            //block same choice for p1
            buildIO.sockets
              .to(element.player1)
              .emit("color-blocked", colorCode);
          }
        }
        //Start game if both players chose a color
        if (this.colSelected == 2) {
          _stateManager.startGame();
        }
      });

      //Handler for Achievement request
      socket.on(
        "/api/client/getAchievements",
        (SESSIONID, PLAYERID, callback) => {
          //get achievementlist from state Manager
          let output = _stateManager.getAch(PLAYERID);

          //sent it out
          callback(output);
        }
      );

      //Handler for Time request
      socket.on("api/client/getMoveTime", (callback) => {
        //get info
        let time = _stateManager.getTimePerMove();

        //send it out
        callback(time);
      });

      //Event Handler for bot move requst
      _ee.on("possible-bot-move", (data) => {
        if (!this.isBotGame) {
          return;
        }

        //get Move Buffer from bot class and save it to moves buffer
        this.buffer = this.GameBot.getMoves(
          _stateManager.getCurrentBoardCopy(),
          _stateManager.getCurrentColumn()
        );
      });

      //Event Handler for move clock countdown (triggered every second)
      _ee.on("update-time", (data) => {
        //Find matching session
        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          if (element.sessionID == data.sessionID) {
            //build Player string to access data from session object ("player1" or "player2")
            let playerString = "player" + data.player;

            //Inform active player of new remaining time
            buildIO.sockets
              .to(element[playerString])
              .emit("update-time", data.time);
          }
        }
      });

      //Event Handler for abandoned sessions
      _ee.on("session-abandoned", (arg) => {
        let sessionToDelete = -1;

        //find matching session
        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          //if session found, inform both players of deletion
          if (element.sessionID == arg) {
            buildIO.sockets.to(element["player1"]).emit("delete");
            buildIO.sockets.to(element["player2"]).emit("delete");
            sessionToDelete = i;
          }
        }

        //delte session and prepare for next users
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

      //Event Handler for Game win
      _ee.on("game-won", (data) => {
        let sessionToDelete = -1;

        //Build strings to access data from game sesion object ("player1" or "player2")
        let winner = "";
        let loser = "";
        if (data.player == 1) {
          winner = "player1";
          loser = "player2";
        } else {
          winner = "player2";
          loser = "player1";
        }

        //Find matching session
        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          //Inform players of result
          if (element.sessionID == data.session) {
            buildIO.sockets.to(element[winner]).emit("won");
            buildIO.sockets.to(element[loser]).emit("lost");
            sessionToDelete = i;
          }
        }

        //Delete and reset for next round
        if (sessionToDelete > -1) {
          this.activeSessions.splice(sessionToDelete, 1);
          _stateManager.release();
          this.hasWaitingRandom = false;
          this.isBotGame = false;
          this.colSelected = 0;
        }
      });

      //Event Handler for Game draw
      _ee.on("game-draw", (data) => {
        let sessionToDelete = -1;

        //Find matching session
        for (let i = 0; i < this.activeSessions.length; i++) {
          const element = this.activeSessions[i];

          //Inform players of result
          if (element.sessionID == data.session) {
            buildIO.sockets.to(element["player1"]).emit("game-draw");
            buildIO.sockets.to(element["player2"]).emit("game-draw");
            sessionToDelete = i;
          }
        }

        //Delete and reset for next round
        if (sessionToDelete > -1) {
          this.activeSessions.splice(sessionToDelete, 1);
          _stateManager.release();
          this.hasWaitingRandom = false;
          this.isBotGame = false;
          this.colSelected = 0;
        }
      });
    });

    //
    //
    //Debug Server Setup
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
        //generate and respond with token
        let newToken = tokenator.generateToken();
        response.json({ result: true, sessionToken: newToken });
        console.log(newToken);

        //error out
      } else {
        response.json({ result: false });
      }
    });

    //Get Board for Debug view
    debugApp.post("/api/debug/getCurrentBoard", (request, response) => {
      const data = request.body;

      //Check for access
      if (tokenator.validateToken(data.sessionToken)) {
        //get data and send it out
        response.json({
          boardInfo: _stateManager.getCurrentBoardForDebug(),
          status: "success",
        });
      }
    });

    //Get Board info for model
    debugApp.post("/api/show/getCurrentBoard", (request, response) => {
      const data = request.body;

      //Get data and send it out
      response.json({
        boardInfo: _stateManager.getCurrentBoardForShowing(),
        status: "success",
      });
    });

    //Send Brightness to Model
    debugApp.post("/api/show/getBrightness", (request, response) => {
      const data = request.body;

      response.json({
        brightness: this.MODELBRIGHTNESS,
      });
    });

    //Save new Brightness
    debugApp.post("/api/show/setBrightness", (request, response) => {
      const data = request.body;

      //Check access
      if (tokenator.validateToken(data.SESSIONTOKEN)) {
        //save and respond
        this.MODELBRIGHTNESS = data.inputValue;

        response.json({
          success: true,
        });
      }
    });

    //set new time for players
    debugApp.post("/api/debug/setTime", (request, response) => {
      const data = request.body;

      //Check Access
      if (tokenator.validateToken(data.SESSIONTOKEN)) {
        //save data and respond
        _stateManager.setTimePerMove(data.inputValue);

        response.json({
          success: true,
        });
      }
    });
  }

  //Update active player and clear move buffer
  changePlayer(newPlayer) {
    this.CURRENTPLAYER = newPlayer;
    this.buffer = new Array();
  }

  //Get control from buffer, if buffer empty return ""
  getNextControl() {
    let output = "";
    if (this.buffer.length > 0) {
      output = this.buffer[0];
      this.buffer = this.buffer.slice(1);
    }
    return output;
  }
}
