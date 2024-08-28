// Class for Access Tokens of Debug Page

export default class Tokenator {
  constructor(len = 8) {
    this.tokens = new Array();
    this.tokenLength = len;
  }

  generateToken() {
    let generatedTime = new Date();

    //Generate new random token
    let result = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < this.tokenLength) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }

    //Store token and creation time
    this.tokens.push({ token: result, time: generatedTime.getTime() });

    //return token
    return result;
  }

  //Check Token
  validateToken(input) {
    //Check Input Length
    if (input.length == 0) return false;

    //Check all stored Tokens
    let output = false;

    for (let i = 0; i < this.tokens.length; i++) {
      let currentElement = this.tokens.at(i);
      if (currentElement.token == input) {
        //If matching token is found, check if it is still valid (tokens die after 15 minutes)
        const now = new Date();
        const timestamp = now.getTime();
        if (timestamp - currentElement.time < process.env.TOKENLIFE) {
          output = true;
        }
      }
    }

    return output;
  }
}
