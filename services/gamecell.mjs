export default class GameCell {
  constructor(_color = "WHITE", _blinkingColor = "WHITE", _frameRate = 30) {
    this.color = _color;
    this.player = -99;
    this.blinkingColor = _blinkingColor;
    this.isOn = true;
    this.isBlinking = false;
    this.FRAMERATE = _frameRate;
    this.frameInterval = Math.floor(this.FRAMERATE / 2) + 1;
    this.elapsedFrames = 0;
  }
  update() {
    //increment Frame Counter
    this.elapsedFrames += 1;
    let output = "";

    if (this.elapsedFrames < this.frameInterval && this.isBlinking) {
      output = this.blinkingColor;
    } else {
      output = this.color;
    }

    if (this.elapsedFrames > this.FRAMERATE) {
      this.elapsedFrames = 0;
    }

    return output;
  }

  changeColor(newColor) {
    this.color = newColor;
  }

  changeBlinkingColor(newColor) {
    this.blinkingColor = newColor;
  }
  toggleState() {
    this.isOn = !this.isOn;
  }
  toggleBlinking() {
    this.isBlinking = !this.isBlinking;
  }

  turnOn() {
    this.isOn = true;
  }

  turnOff() {
    this.isOn = false;
    this.color = "BLACK";
  }

  turnOnBlinking() {
    this.isBlinking = true;
  }

  turnOffBlinking() {
    this.isBlinking = false;
  }

  getColor() {
    return this.color;
  }

  getIsOn() {
    return this.isOn;
  }

  getIsBlinking() {
    return this.isBlinking;
  }

  setPlayer(_player) {
    this.player = _player;
  }

  getPlayer() {
    return this.player;
  }
}
