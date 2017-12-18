module.exports = {
  trim: function(s, c) {
    if (c === "]") c = "\\]";
    if (c === "\\") c = "\\\\";
    return s.replace(new RegExp("^[" + c + "]+|[" + c + "]+$", "g"), "");
  },
  trimzero: function(s) {
    // ^\0+ beginning of string, zero character, one or more times
    // |    or
    // \0+$ zero character, one or more times, end of string
    return s.replace(/^\0+|\0+$/g, '');
  }
};
