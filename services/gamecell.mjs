export default class GameCell {
  constructor(_color = "WHITE") {
    this.color = _color;
    this.isOn = true;
  }

  changeColor(newColor) {
    this.color = newColor;
  }
  toggleState() {
    this.isOn = !this.isOn;
  }
  turnOn() {
    this.isOn = true;
  }

  turnOff() {
    this.isOn = false;
  }

  getColor() {
    return this.color;
  }

  getIsOn() {
    return this.isOn;
  }
}
