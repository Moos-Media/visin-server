import Utils from "./utils.mjs";
import GameCell from "./gamecell.mjs";

export default class StateManager {
  constructor(inputWidth = 22, inputHeight = 8) {
    this.width = inputWidth;
    this.height = inputHeight;
    this._utils = new Utils();
    this.board = this._utils.make2DArray(this.width, this.height);
    this.controlledX = 5;
    this.controlledY = 0;

    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        this.board[i][j] = new GameCell();
      }
    }

    this.board[this.controlledX][this.controlledY].changeColor("COLOR1");
  }

  getCurrentBoardForDebug() {
    let output = new Array();

    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        let currentElement = this.board[j][i];
        output.push({
          color: currentElement.getColor(),
          isOn: currentElement.getIsOn(),
        });
      }
    }

    return {
      width: this.width,
      height: this.height,
      board: output,
    };
  }

  whiteOut() {
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        this.board[i][j].changeColor("WHITE");
      }
    }
  }
  setupTHMLOGO(xOff, yOff) {
    this.board[xOff + 1][yOff].changeColor("GREEN");
    this.board[xOff + 2][yOff].changeColor("GREEN");

    this.board[xOff + 0][yOff + 1].changeColor("GREEN");
    this.board[xOff + 1][yOff + 1].changeColor("GREEN");
    this.board[xOff + 2][yOff + 1].changeColor("GREEN");

    this.board[xOff + 0][yOff + 2].changeColor("GREEN");
    this.board[xOff + 1][yOff + 2].changeColor("GREEN");
    this.board[xOff + 2][yOff + 2].changeColor("GREEN");

    this.board[xOff + 0][yOff + 3].changeColor("GREEN");
    this.board[xOff + 1][yOff + 3].changeColor("GREEN");
    this.board[xOff + 2][yOff + 3].changeColor("GREEN");
  }

  doGameTick(input) {
    this.board[this.controlledX][this.controlledY].changeColor("WHITE");

    switch (input) {
      case "LEFT":
        this.controlledX -= 1;
        break;
      case "RIGHT":
        this.controlledX += 1;
        break;
      default:
        break;
    }

    this.board[this.controlledX][this.controlledY].changeColor("COLOR1");
  }
}
