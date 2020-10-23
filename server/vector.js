module.exports = class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  add(vector) {
    return new Vector(this.x + vector.x, this.y + vector.y);
  }
  mult(factor) {
    return new Vector(this.x * factor, this.y * factor);
  }
  copy() {
    return new Vector(this.x, this.y);
  }
};
