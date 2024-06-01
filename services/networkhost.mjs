import express, { request, response } from "express";

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
        response.json({ result: true });
      } else {
        response.json({ result: false });
      }
    });
  }
}

export default Networkhost;
