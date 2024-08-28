//Main .mjs file, starts other classes with logic inside
import Core from "./services/core.mjs";
import dotenv from "dotenv";
import Utils from "./services/utils.mjs";

//Load Defaults from .env file
dotenv.config();

//Setup utils and core instances
const util = new Utils();
const applicationcore = new Core();
