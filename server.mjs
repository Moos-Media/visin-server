import Core from "./services/core.mjs";
import dotenv from "dotenv";
import Utils from "./services/utils.mjs";

dotenv.config();
const util = new Utils();
const applicationcore = new Core();
