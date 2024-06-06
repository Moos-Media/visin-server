import express, { request, response } from "express";
const SESSIONTOKEN = "MeinindividuellerSessionTokenTHM2024VISIN";

class Networkhost {
  constructor(buildport, builddirectory, debugport, debugdirectory) {
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
    buildserver.post("/api/client/sendKey", (request, response) => {
      const data = request.body;

      console.log(data.key);
      response.json({ status: "success" });
    });

    //Debug
    const debugserver = express();
    debugserver.listen(debugport, () =>
      console.log("Debug Server Listening at " + debugport)
    );
    debugserver.use(express.static(debugdirectory));
    debugserver.use(express.json({ limit: "1mb" }));

    //
    //RequestHandling
    //
    debugserver.post("/api/login", (request, response) => {
      const data = request.body;

      //Check for access
      if (data.username == "admin" && data.passkey == "admin") {
        response.json({ result: true, sessionToken: SESSIONTOKEN });
        console.log("Login successful");
      } else {
        response.json({ result: false });
      }
    });
  }
}

export default Networkhost;
