//Helper class fuction to create 2D Arrays

export default class Utils {
  make2DArray(x, y) {
    let output = new Array(x);
    for (let i = 0; i < x; i++) {
      output[i] = new Array(y);
    }
    return output;
  }
}
