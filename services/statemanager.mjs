import Utils from "./utils.mjs";
import GameCell from "./gamecell.mjs";

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
    this.isAvailable = true;
    this.achPlayer1 = new Array(20).fill(false);
    this.achPlayer2 = new Array(20).fill(false);
    this.winningCells = [];

    this.reset();

    this.setupTHMLOGO(2, 1);
  }

  reset() {
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        this.board[i][j] = new GameCell("WHITE", "WHITE", this.frameRate);
      }
    }

    this.winningCells = [];
    this.pickStartingCell();
    this.activePlayer = 1;
    this.clearedForPlay = false;
  }

  block() {
    this.isAvailable = false;
    this.moveCount = 0;
    this.achPlayer1 = new Array(20).fill(false);
    this.achPlayer2 = new Array(20).fill(false);
  }

  release() {
    this.isAvailable = true;
  }

  getIsAvailable() {
    return this.isAvailable;
  }

  getAch(player) {
    let toCheck;
    let output = new Array();

    player == 1 ? (toCheck = this.achPlayer1) : (toCheck = this.achPlayer2);

    for (let i = 0; i < toCheck.length; i++) {
      const element = toCheck[i];

      if (element) {
        output.push(i);
      }
    }
    return output;
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

  async doGameTick(input) {
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
        this.board[this.controlledX][this.controlledY].turnOffBlinking();
        this.swapCells(xOff, yOff);
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        await sleep(500);
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
      for (let i = 0; i < this.winningCells.length; i++) {
        const element = this.winningCells[i];

        this.board[element[0]][element[1]].turnOnBlinking();
      }

      this.emitter.emit("game-won", {
        player: this.activePlayer,
        session: this.activeSession,
      });
      this.updateAchievements();
      setTimeout(() => {
        this.reset();
        this.release();
        this.setupTHMLOGO(2, 1);
      }, 10000);
    } else if (this.moveCount == 42) {
      this.emitter.emit("game-draw", {
        session: this.activePlayer,
      });
      this.updateAchievements();
      setTimeout(() => {
        console.log("Test");
        this.reset();
        this.release();
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
    if (
      this.checkDirection(board, row, col, disc, 1, 0) || // Horizontal
      this.checkDirection(board, row, col, disc, 0, 1) || // Vertical
      this.checkDirection(board, row, col, disc, 1, 1) || // Diagonal /
      this.checkDirection(board, row, col, disc, 1, -1) // Diagonal \
    ) {
      return true;
    } else {
      // Clear the TEST array if no win is found
      this.TEST = [];
      return false;
    }
  }

  // Helper function to check a specific direction
  checkDirection(board, row, col, disc, rowDir, colDir) {
    let count = 0;
    let tempArray = []; // Temporary array to store potential winning positions

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
        tempArray.push([r, c]); // Store the position

        if (count === 4) {
          this.winningCells = tempArray; // Store the winning positions in TEST
          return true;
        }
      } else {
        count = 0;
        tempArray = []; // Reset the temporary array if the sequence is broken
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

  updateAchievements() {
    //Achievement 1: Win with horizontal line
    if (
      this.checkDirection(
        this.board,
        this.controlledX,
        this.controlledY,
        this.activePlayer,
        1,
        0
      )
    ) {
      if (this.activePlayer == 1) {
        this.achPlayer1[0] = true;
      } else if (this.activePlayer == 2) {
        this.achPlayer2[0] = true;
      }
    }

    //Achievement 2: Win with vertical line
    if (
      this.checkDirection(
        this.board,
        this.controlledX,
        this.controlledY,
        this.activePlayer,
        0,
        1
      )
    ) {
      if (this.activePlayer == 1) {
        this.achPlayer1[1] = true;
      } else if (this.activePlayer == 2) {
        this.achPlayer2[1] = true;
      }
    }

    //Achievement 3: Win with diagonal line
    if (
      this.checkDirection(
        this.board,
        this.controlledX,
        this.controlledY,
        this.activePlayer,
        1,
        -1
      ) ||
      this.checkDirection(
        this.board,
        this.controlledX,
        this.controlledY,
        this.activePlayer,
        1,
        1
      )
    ) {
      if (this.activePlayer == 1) {
        this.achPlayer1[2] = true;
      } else if (this.activePlayer == 2) {
        this.achPlayer2[2] = true;
      }
    }

    //Achievement 4: Draw
    if (
      !this.isWon(
        this.board,
        this.controlledX,
        this.controlledY,
        this.activePlayer
      ) &&
      this.moveCount == 42
    ) {
      this.achPlayer1[3] = true;
      this.achPlayer2[3] = true;
    }

    //Achievement 5: Win two connects with one stone
    let winCount = 0;
    if (
      this.checkDirection(
        this.board,
        this.controlledX,
        this.controlledY,
        this.activePlayer,
        1,
        0
      )
    )
      winCount += 1;
    if (
      this.checkDirection(
        this.board,
        this.controlledX,
        this.controlledY,
        this.activePlayer,
        0,
        1
      )
    )
      winCount += 1;
    if (
      this.checkDirection(
        this.board,
        this.controlledX,
        this.controlledY,
        this.activePlayer,
        1,
        1
      )
    )
      winCount += 1;
    if (
      this.checkDirection(
        this.board,
        this.controlledX,
        this.controlledY,
        this.activePlayer,
        1,
        -1
      )
    )
      winCount += 1;

    if (winCount == 2) {
      if (this.activePlayer == 1) {
        this.achPlayer1[4] = true;
      } else if (this.activePlayer == 2) {
        this.achPlayer2[4] = true;
      }
    }

    //Achievement 8: Win with color red
    if (
      this.isWon(
        this.board,
        this.controlledX,
        this.controlledY,
        this.activePlayer
      )
    ) {
      if (this.activePlayer == 1 && this.player1Color == "COLOR2") {
        this.achPlayer1[7] = true;
      } else if (this.activePlayer == 2 && this.player2Color == "COLOR2") {
        this.achPlayer2[7] = true;
      }
    }

    //Achievement 9: Win with color yellow
    if (
      this.isWon(
        this.board,
        this.controlledX,
        this.controlledY,
        this.activePlayer
      )
    ) {
      if (this.activePlayer == 1 && this.player1Color == "COLOR3") {
        this.achPlayer1[8] = true;
      } else if (this.activePlayer == 2 && this.player2Color == "COLOR3") {
        this.achPlayer2[8] = true;
      }
    }

    //Achievement 10: Win with color orange
    if (
      this.isWon(
        this.board,
        this.controlledX,
        this.controlledY,
        this.activePlayer
      )
    ) {
      if (this.activePlayer == 1 && this.player1Color == "COLOR5") {
        this.achPlayer1[9] = true;
      } else if (this.activePlayer == 2 && this.player2Color == "COLOR5") {
        this.achPlayer2[9] = true;
      }
    }

    //Achievement 11: Win with color cyan
    if (
      this.isWon(
        this.board,
        this.controlledX,
        this.controlledY,
        this.activePlayer
      )
    ) {
      if (this.activePlayer == 1 && this.player1Color == "COLOR6") {
        this.achPlayer1[10] = true;
      } else if (this.activePlayer == 2 && this.player2Color == "COLOR6") {
        this.achPlayer2[10] = true;
      }
    }

    //Achievement 12: Win with color pink
    if (
      this.isWon(
        this.board,
        this.controlledX,
        this.controlledY,
        this.activePlayer
      )
    ) {
      if (this.activePlayer == 1 && this.player1Color == "COLOR4") {
        this.achPlayer1[11] = true;
      } else if (this.activePlayer == 2 && this.player2Color == "COLOR4") {
        this.achPlayer2[11] = true;
      }
    }

    //Achievement 13: Win with color blue
    if (
      this.isWon(
        this.board,
        this.controlledX,
        this.controlledY,
        this.activePlayer
      )
    ) {
      if (this.activePlayer == 1 && this.player1Color == "COLOR1") {
        this.achPlayer1[12] = true;
      } else if (this.activePlayer == 2 && this.player2Color == "COLOR1") {
        this.achPlayer2[12] = true;
      }
    }
  }
}
