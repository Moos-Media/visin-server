//class for Bot Logic

export default class GameBot {
  constructor(difficulty) {
    this.difficulty = difficulty;
  }

  //Main Function, returns Array of game moves
  getMoves(board, pos) {
    let output = new Array();

    //Pick target column
    let target = this.decideColumn(board);

    //calculate offset -> needed amount of side moves
    let diff = target - pos;

    //Build move array based on calculated differential
    for (let i = 0; i < Math.abs(diff); i++) {
      if (diff <= 0) {
        output.push("LEFT");
      } else {
        output.push("RIGHT");
      }
    }

    //Finish array with down move
    output.push("DOWN");

    return output;
  }

  //Pick Bot algorithm (only one implemented so far)
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

    //Check if picked location is valid (isn't blocked by other players stone, if so pick new one.)
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
