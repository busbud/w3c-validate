var request = require('superagent');
var inspect = require('util').inspect;
var _       = require('underscore');

function Validator(ignore) {
  this.ignore = ignore || [];
}

/**
 * Validates a string of HTML with the W3C validator
 *
 * @param {String} buffer      The string to validate
 * @param {Function} callback  fn(err)
 */
Validator.prototype.validate = function (buffer, callback) {
  var self   = this;
  var output = 'json';

  if (!buffer) {
    return callback(new Error('buffer must be a non-empty string of HTML markup to validate'));
  }

  var req = request.post('http://validator.w3.org/check');
  req.set('User-Agent', 'w3c-validate - npm module');
  req.field('output', output);
  req.field('uploaded_file', buffer);
  req.end(function (err, res) {
    if (err) {
      return callback(err);
    }

    function keepError (msg) {
      return msg.type == 'error'
          && self.ignore.indexOf(msg.message) == -1;
    }

    function toErrorContext (lines) {
      return function (msg) {
        // Provide context for understanding where the error occurred
        // in the markup.
        // msg.lastColumn indicates the position of the
        // closing tag of the offending element
        var lineno = parseInt(msg.lastLine) - 1;
        var line   = lines[lineno];
        var colno  = parseInt(msg.lastColumn);
        var start  = line.lastIndexOf('<', colno-1);

        var context = line && line.substr(start - 20, (colno - start) + 40);

        // Clean up output
        return {
          error:   msg.message,
          context: context
        };
      };
    }

    var lines  = buffer.split('\n');
    var errors = _(res.body.messages)
      .chain()
      .filter(keepError)
      .map(toErrorContext(lines))
      .value();

    if (errors && errors.length > 0) {
      var error = new Error('Validation errors: ' + inspect(errors, true, null));
      return callback(error);
    }

    return callback(null);
  });
};

/**
 * Create a validator with an optional list of exception messages to ignore
 *
 * @param {Array} ignore - optional
 * @return {Validator}
 */
module.exports.createValidator = function(ignore) {
  return new Validator(ignore);
};