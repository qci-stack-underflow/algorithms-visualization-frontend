export default class Hardcoded {
  _mssg = "";

  constructor() {
    this._mssg = "Hello from Node/vite with ES and JS!"
  }

  getMessage() {
    return this._mssg;
  }
}
