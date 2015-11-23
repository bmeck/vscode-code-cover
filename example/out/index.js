"use strict";

var _getIterator2 = require("babel-runtime/core-js/get-iterator");

var _getIterator3 = _interopRequireDefault(_getIterator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var pantry = ["cereal", "bread", "apples", "pasta", "tomatoes", "carrots", "biscuits", "cookies"];
function isTasty(food) {
  if (food == 'pickes') {
    throw new Error('EWWWWW');
  }
  if (1 != 2) {} else {
    console.log();
  }
  switch (food) {
    case 'tacos':
      return true;
    case 'bananas':
      return true;
    case 'fajitas':
      return true;
  }
  return food == "cookies" || food == "biscuits";
}
var _iteratorNormalCompletion = true;
var _didIteratorError = false;
var _iteratorError = undefined;

try {
  for (var _iterator = (0, _getIterator3.default)(pantry), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
    var food = _step.value;

    if (isTasty(food)) {
      console.log("omnomnom");
    } else if (food == "apples") {
      console.log("mmmm");
    }
  }
} catch (err) {
  _didIteratorError = true;
  _iteratorError = err;
} finally {
  try {
    if (!_iteratorNormalCompletion && _iterator.return) {
      _iterator.return();
    }
  } finally {
    if (_didIteratorError) {
      throw _iteratorError;
    }
  }
}
//# sourceMappingURL=index.js.map