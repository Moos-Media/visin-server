//class managing state of the game board

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
    this.activePlayer = -99;
    this.emitter = _ee;
    this.activeSession = 0;
    this.frameRate = frameRate;
    this.frameCount = 0;
    this.moveCount = 0;
    this.clearedForPlay = false;
    this.isAvailable = true;
    this.achPlayer1 = new Array(20).fill(false);
    this.achPlayer2 = new Array(20).fill(false);
    this.winningCells = [];
    this.timePerMove = process.env.GAMETIME;
    this.timeRem1 = 0;
    this.timeRem2 = 0;
    this.timeCounts = false;

    this.reset();

    this.setupTHMLOGO(2, 1);
  }

  //delete all gamecell data from board and reset all parameters from last game
  reset() {
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        this.board[i][j] = new GameCell("WHITE", "WHITE", this.frameRate);
      }
    }

    this.winningCells = [];
    this.pickStartingCell();
    this.activePlayer = -99;
    this.emitter.emit("active-player-changed", this.activePlayer);
    this.clearedForPlay = false;
    this.timeCounts = false;
    this.timeRem1 = 0;
    this.timeRem2 = 0;
  }

  //Start game
  startGame() {
    this.activePlayer = 1;

    //Wait 2 seconds, then remove color selection screen from board and display player 1
    setTimeout(() => {
      this.whiteOut();
      this.board[this.controlledX][this.controlledY].changeColor(
        this.player1Color
      );
      this.board[this.controlledX][this.controlledY].turnOnBlinking();
      this.emitter.emit("active-player-changed", this.activePlayer);

      //Calculate remaining game duration
      this.timeRem1 = Math.floor(this.timePerMove * 60);
      this.timeRem2 = Math.floor(this.timePerMove * 60);
      this.timeCounts = true;
    }, 2000);
  }

  //Reserve board for session and reset certain params
  block() {
    this.isAvailable = false;
    this.moveCount = 0;
    this.achPlayer1 = new Array(20).fill(false);
    this.achPlayer2 = new Array(20).fill(false);
  }

  //Releasy reservation
  release() {
    this.isAvailable = true;
  }

  //Getters and Setters
  getIsAvailable() {
    return this.isAvailable;
  }

  getActiveSession() {
    return this.activeSession;
  }

  getAch(player) {
    let toCheck;
    let output = new Array();

    //Check which player requested info
    player == 1 ? (toCheck = this.achPlayer1) : (toCheck = this.achPlayer2);

    //convert internal structure [true, false, true, ...] (20-Array of true and false) to client structure [0, 2, ...] (x Array of indexes of earned ach.)
    for (let i = 0; i < toCheck.length; i++) {
      const element = toCheck[i];

      if (element) {
        output.push(i);
      }
    }
    return output;
  }

  getCurrentBoardCopy() {
    return JSON.parse(JSON.stringify(this.board));
  }

  getCurrentColumn() {
    return this.controlledX;
  }

  getCurrentBoardForDebug() {
    let output = new Array();

    //Build Board for export
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

    //Build Board for export
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

  getTimePerMove() {
    return this.timePerMove;
  }

  setTimePerMove(newValue) {
    this.timePerMove = Math.floor(newValue);
    console.log("Set value:" + this.timePerMove);
  }

  //turn every cell to white and disable blinking
  whiteOut() {
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        this.board[i][j].changeColor("WHITE");
        this.board[i][j].turnOffBlinking();
      }
    }
  }

  //turn needed cells green
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

  //Main game update function
  async doGameTick(input) {
    // Increment Frame Counter and reset if needed
    this.frameCount += 1;
    if (this.frameCount >= this.frameRate) this.frameCount = 0;

    // Do Time Manipulation (Every 1 second remove 1 second of remaining time of current player and send updated time out)
    if (this.timeCounts && this.frameCount == 0) {
      if (this.activePlayer == 1) {
        this.timeRem1 -= 1;
        this.emitter.emit("update-time", {
          time: this.timeRem1,
          player: 1,
          sessionID: this.activeSession,
        });
      } else if (this.activePlayer == 2) {
        console.log("In here");
        this.timeRem2 -= 1;
        this.emitter.emit("update-time", {
          time: this.timeRem2,
          player: 2,
          sessionID: this.activeSession,
        });
      }
    }

    //If time is under 0 and last change was over SESSIONLIFE seconds ago, label session as abandoned
    let life = -1 * process.env.SESSIONLIFE;
    if (this.timeRem1 < life || this.timeRem2 < life) {
      console.log("Im IF");
      this.emitter.emit("session-abandoned", this.activeSession);
    }

    //Handle moves
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
      //Ceck cell below
      while (this.isValid(xOff, yOff)) {
        //turn off blinking
        this.board[this.controlledX][this.controlledY].turnOffBlinking();

        //swap with cell below
        this.swapCells(xOff, yOff);

        //wait 500 millis before looping again, until at bottom
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        await sleep(500);
      }

      //end move and calculate if won
      this.endMove();

      //Move left and right if cell is valis
    } else if (this.isValid(xOff, yOff)) {
      this.swapCells(xOff, yOff);
      // Do Hopping to different columns (check up to 5 cell in chosen direction for a valid column, jump to first one found)
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
    if (this.controlledX + _xOff < 0 || this.controlledX + _xOff >= this.width)
      return false;

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

  //Swap two cells and move controlled variables to new spot
  swapCells(_xOff, _yOff) {
    let old = this.board[this.controlledX][this.controlledY];
    this.board[this.controlledX][this.controlledY] =
      this.board[this.controlledX + _xOff][this.controlledY + _yOff];
    this.board[this.controlledX + _xOff][this.controlledY + _yOff] = old;

    this.controlledX += _xOff;
    this.controlledY += _yOff;
  }

  //update color of player and change color on board (could maybe be deprecated by now, as color choice is displayed first?!)
  updatePlayer1Color(colCode) {
    this.player1Color = colCode;
    this.board[this.controlledX][this.controlledY].changeColor(
      this.player1Color
    );
  }

  updatePlayer2Color(colCode) {
    this.player2Color = colCode;
  }

  //End of move -> check for win or loss
  endMove() {
    //Save player in board and stop blinking
    this.board[this.controlledX][this.controlledY].setPlayer(this.activePlayer);
    this.board[this.controlledX][this.controlledY].turnOffBlinking();
    this.moveCount += 1;

    let won = false;

    //Check for win
    //both players still have time, check for connect four
    if (this.timeRem1 > 0 && this.timeRem2 > 0) {
      won = this.isWon();

      //player 2 out of time, player 1 wins with any move
    } else if (this.activePlayer == 1 && this.timeRem2 <= 0) {
      won = true;
      //same logic other way round
    } else if (this.activePlayer == 2 && this.timeRem1 <= 0) {
      won = true;
    }

    //Change Active Player if not won and update everything necessary
    if (!won && this.moveCount < 42) {
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
      if (this.activePlayer == 2) {
        this.emitter.emit("possible-bot-move", this.controlledX);
      }

      //let winning cells blink
      //coordinates are stored in isWon function
    } else if (won) {
      for (let i = 0; i < this.winningCells.length; i++) {
        const element = this.winningCells[i];

        this.board[element[0]][element[1]].turnOnBlinking();
      }

      //Emit game won to notify players via network manager
      this.emitter.emit("game-won", {
        player: this.activePlayer,
        session: this.activeSession,
      });
      //Calculate achievements
      this.updateAchievements();

      //wait 10 secs before resetting the screen
      setTimeout(() => {
        this.reset();
        this.release();
        this.setupTHMLOGO(2, 1);
      }, 10000);
    }

    //draw is reached after 42 moves, same logic as above
    if (this.moveCount == 42) {
      this.emitter.emit("game-draw", {
        session: this.activeSession,
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

  //Pick random open cell in top row
  pickStartingCell() {
    let available = new Array();

    //Store all open cells
    for (let i = 0; i < this.width; i++) {
      const element = this.board[i][0];

      if (element.getPlayer() == -99) {
        available.push(i);
      }
    }

    //pick random index
    let pickedIndex = this._helperGetRandomInt(available.length);

    //store coordinates
    this.controlledX = available[pickedIndex];
    this.controlledY = 0;
  }

  _helperGetRandomInt(max) {
    return Math.floor(Math.random() * max);
  }

  showColorPicking(side, col) {
    //if necessary clear board first
    if (!this.clearedForPlay) {
      this.whiteOut();
      this.clearedForPlay = true;
    }

    //Calc additional offset in case of unround width (eg. 7 columns)
    let offsetOffset = this.width % 2;

    //Calc half width for player 2
    let halfWidth = Math.floor(this.width / 2);

    //Calc offset (start on left edge for p1, move to center and add unround modifier if needed for p2)
    let offset = 0;
    side == 0 ? (offset = 0) : (offset = halfWidth + offsetOffset);

    //color half a side in needed color
    for (let i = offset; i < offset + halfWidth; i++) {
      for (let j = 0; j < this.height; j++) {
        const element = this.board[i][j];

        element.changeColor(col);
      }
    }
  }

  //Long Achievement function
  //
  //Achievements are checked one by one, and players ach buffers are updated accordingly.
  //Checking logic depends on achievement, code should be self explanatory given the achievement being checked.
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
