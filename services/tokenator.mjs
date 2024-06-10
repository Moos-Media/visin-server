export default class Tokenator {
  constructor(len = 8) {
    this.tokens = new Array();
    this.tokenLength = len;
  }

  generateToken() {
    let generatedTime = new Date();
    let result = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < this.tokenLength) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }

    this.tokens.push({ token: result, time: generatedTime.getTime() });

    return result;
  }

  validateToken(input) {
    //Check Input Length
    if (input.length == 0) return false;

    //Check all stored Tokens
    let output = false;

    for (i = 0; i < this.tokens.length; i++) {
      currentElement = this.tokens.at(i);
      if (tcurrentElement.token == input) {
        const now = new Date();
        const timestamp = now.getTime();
        if (timestamp - currentElement.time < 900000) {
          output = true;
        }
      }
    }

    return output;
  }
}
