import Utils from "./utils.mjs";
import GameCell from "./gamecell.mjs";
import GameSession from "./gamesession.mjs";

export default class StateManager {
  constructor(inputWidth = 22, inputHeight = 8, frameRate, _ee) {
    this.width = inputWidth;
    this.height = inputHeight;
    this._utils = new Utils();
    this.board = this._utils.make2DArray(this.width, this.height);
    this.controlledX = 5;
    this.controlledY = 0;
    this.player1Color = "COLOR1";
    this.player2Color = "COLOR2";
    this.activePlayer = 1;
    this.emitter = _ee;
    this.activeSession = 0;
    this.frameRate = frameRate;
    this.moveCount = 0;
    this.clearedForPlay = false;

    this.reset();

    this.setupTHMLOGO(2, 1);
  }

  reset() {
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        this.board[i][j] = new GameCell("WHITE", "WHITE", this.frameRate);
      }
    }

    this.pickStartingCell();
    this.moveCount = 0;
  }

  useForPlay() {
    this.whiteOut();
    this.board[this.controlledX][this.controlledY].changeColor(
      this.player1Color
    );
    this.board[this.controlledX][this.controlledY].turnOnBlinking();
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

  getCurrentBoardForShowing() {
    let output = new Array();
    let currentElement;

    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        //First Row Left to Right etc.
        if (i % 2 == 1) {
          currentElement = this.board[j][i];
        } else {
          // Second Row Right to Left etc.
          currentElement = this.board[this.width - j - 1][i];
        }
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
      this.endMove();
      //Move left and right
    } else if (this.isValid(xOff, yOff)) {
      this.swapCells(xOff, yOff);
      // Do Hopping to different columns
    } else {
      for (let i = 0; i < 5; i++) {
        if (this.isValid(i * xOff, yOff)) {
          this.swapCells(i * xOff, yOff);
          break;
        }
      }
    }
  }

  isValid(_xOff, _yOff) {
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

  updatePlayer1Color(colCode) {
    this.player1Color = colCode;
    this.board[this.controlledX][this.controlledY].changeColor(
      this.player1Color
    );
  }

  updatePlayer2Color(colCode) {
    this.player2Color = colCode;
  }

  endMove() {
    this.board[this.controlledX][this.controlledY].setPlayer(this.activePlayer);
    this.board[this.controlledX][this.controlledY].turnOffBlinking();
    this.moveCount += 1;

    let won = this.isWon();

    //Change Active Player if not won
    if (!won) {
      this.pickStartingCell();

      if (this.activePlayer == 1) {
        this.activePlayer = 2;
        this.board[this.controlledX][this.controlledY].changeColor(
          this.player2Color
        );
      } else {
        this.activePlayer = 1;
        this.board[this.controlledX][this.controlledY].changeColor(
          this.player1Color
        );
      }
      this.board[this.controlledX][this.controlledY].turnOnBlinking();
      this.emitter.emit("active-player-changed", this.activePlayer);
    } else if (won) {
      this.emitter.emit("game-won", {
        player: this.activePlayer,
        session: this.activeSession,
      });
      setTimeout(() => {
        this.reset();
        this.setupTHMLOGO(2, 1);
      }, 10000);
      this.reset();
    } else if (this.moveCount == 42) {
      this.emitter.emit("game-draw", {
        session: this.activePlayer,
      });
      setTimeout(() => {
        this.reset();
        this.setupTHMLOGO(2, 1);
      }, 10000);
    }
  }
  // Function to check for a win
  isWon(
    board = this.board,
    row = this.controlledX,
    col = this.controlledY,
    disc = this.activePlayer
  ) {
    return (
      this.checkDirection(board, row, col, disc, 1, 0) || // Horizontal
      this.checkDirection(board, row, col, disc, 0, 1) || // Vertical
      this.checkDirection(board, row, col, disc, 1, 1) || // Diagonal /
      this.checkDirection(board, row, col, disc, 1, -1) // Diagonal \
    );
  }
  // Helper function to check a specific direction
  checkDirection(board, row, col, disc, rowDir, colDir) {
    let count = 0;

    for (let i = -3; i <= 3; i++) {
      const r = row + i * rowDir;
      const c = col + i * colDir;

      if (
        r >= 0 &&
        r < board.length &&
        c >= 0 &&
        c < board[0].length &&
        board[r][c].getPlayer() === disc
      ) {
        count++;
        if (count === 4) return true;
      } else {
        count = 0;
      }
    }

    return false;
  }

  updateActiveSession(newSession) {
    this.activeSession = newSession;
  }

  pickStartingCell() {
    let available = new Array();
    for (let i = 0; i < this.width; i++) {
      const element = this.board[i][0];

      if (element.getPlayer() == -99) {
        available.push(i);
      }
    }

    let pickedIndex = this._helperGetRandomInt(available.length);

    this.controlledX = available[pickedIndex];
    this.controlledY = 0;
  }

  _helperGetRandomInt(max) {
    return Math.floor(Math.random() * max);
  }

  showColorPicking(side, col) {
    if (!this.clearedForPlay) {
      this.whiteOut();
      this.clearedForPlay = true;
    }
    let offsetOffset = this.width % 2;
    let halfWidth = Math.floor(this.width / 2);
    let offset = 0;
    side == 0 ? (offset = 0) : (offset = halfWidth + offsetOffset);

    for (let i = offset; i < offset + halfWidth; i++) {
      for (let j = 0; j < this.height; j++) {
        const element = this.board[i][j];

        element.changeColor(col);
      }
    }
  }
}
