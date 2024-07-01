import GameCell from "./gamecell.mjs";

export default class GameSession {
  constructor() {
    this.controlledX = 5;
    this.controlledY = 0;
    this.player1Color = "COLOR1";
    this.player2Color = "COLOR2";
    this.activePlayer = 1;
    this.emitter = _ee;
    this.activeSession = 0;
    this.moveCount = 0;
  }
}
