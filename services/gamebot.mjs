import GameCell from "./gamecell.mjs";

export default class GameBot {
  constructor(difficulty) {
    this.difficulty = difficulty;
  }

  getMoves(board, pos) {
    let output = new Array();

    let target = this.decideColumn(board);

    let diff = target - pos;

    for (let i = 0; i < Math.abs(diff); i++) {
      if (diff <= 0) {
        output.push("LEFT");
      } else {
        output.push("RIGHT");
      }
    }

    output.push("DOWN");

    return output;
  }

  decideColumn(board) {
    switch (this.difficulty) {
      case 1:
        return this.easyBotMove(board);
        break;
      default:
        break;
    }
  }

  // Easy Bot: Random move
  easyBotMove(board) {
    let cols = board.length;
    let guess = Math.floor(Math.random() * cols);

    let isValid = false;
    while (!isValid) {
      isValid = true;
      if (board.at(guess).at(0).player != -99) {
        isValid = false;
        guess = Math.floor(Math.random() * cols);
      }
    }

    return guess;
  }
}
