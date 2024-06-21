import express, { request, response } from "express";
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
    const buildserver = express();
    buildserver.listen(buildport, () =>
      console.log("Build Server Listening at " + buildport)
    );
    buildserver.use(express.static(builddirectory));
    buildserver.use(express.json({ limit: "1mb" }));
    //
    //Request Handling
    //
    buildserver.post("/api/client/registerClient", (request, response) => {
      const data = request.body;
      // if (this.userList.length < process.env.MAX_CONCURRENT_PLAYERS) {
      //   response.json({ status: "success", userID: this.userList.length });
      //   this.userList.push(data.userKey);
      // }
      let userID = queueManager.registerClient(data.userKey);
      response.json({ status: "success", userID: userID });
    });

    buildserver.post("/api/client/sendControl", (request, response) => {
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
    const debugserver = express();
    debugserver.listen(debugport, () =>
      console.log("Debug Server Listening at " + debugport)
    );
    debugserver.use(express.static(debugdirectory));
    debugserver.use(express.json({ limit: "1mb" }));

    //
    //RequestHandling
    //
    debugserver.post("/api/debug/login", (request, response) => {
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

    debugserver.post("/api/debug/getCurrentBoard", (request, response) => {
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
}
