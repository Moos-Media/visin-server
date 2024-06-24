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

    this.board[this.controlledX][this.controlledY].changeColor("COLOR2");
  }

  getCurrentBoardForDebug() {
    let output = new Array();

    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        let currentElement = this.board[j][i];
        output.push({
          color: currentElement.update(),
          isOn: currentElement.getIsOn(),
          isBlinking: currentElement.getIsBlinking(),
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
    // Get Offsets for move direction
    let xOff,
      yOff = 0;

    switch (input) {
      case "LEFT":
        xOff = -1;
        yOff = 0;
        break;
      case "RIGHT":
        xOff = 1;
        yOff = 0;
        break;
      case "DOWN":
        xOff = 0;
        yOff = 1;
        break;
      default:
        xOff = 0;
        yOff = 0;
        break;
    }

    // Do basic Movements
    // Drop Down
    if (input == "DOWN") {
      while (this.isValid(xOff, yOff)) {
        this.swapCells(xOff, yOff);
      }
      //Move left and right
    } else if (this.isValid(xOff, yOff)) {
      this.swapCells(xOff, yOff);
      // Do Hopping to different columns
    } else {
      console.log("HIER");
      for (let i = 0; i < 5; i++) {
        if (this.isValid(i * xOff, yOff)) {
          this.swapCells(i * xOff, yOff);
          break;
        }
      }
    }
  }

  isValid(_xOff, _yOff) {
    console.log("Checked Offsets are: " + _xOff + _yOff);
    // Check for Out-Of-Bounds of X Move
    if (this.controlledX == 0 && _xOff < 0) return false;
    if (this.controlledX == this.width - 1 && _xOff > 0) return false;

    // Check for Out-Of-Bound of Y Move
    if (this.controlledY == this.height - 1 && _yOff > 0) return false;

    // Check for blocked cells
    if (
      this.board[this.controlledX + _xOff][
        this.controlledY + _yOff
      ].getColor() != "WHITE"
    )
      return false;

    return true;
  }

  swapCells(_xOff, _yOff) {
    let old = this.board[this.controlledX][this.controlledY];
    this.board[this.controlledX][this.controlledY] =
      this.board[this.controlledX + _xOff][this.controlledY + _yOff];
    this.board[this.controlledX + _xOff][this.controlledY + _yOff] = old;

    this.controlledX += _xOff;
    this.controlledY += _yOff;
  }
}
