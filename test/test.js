var util = require('util');

function debug(label, value) {
  console.log(label, util.inspect(value));
}

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var sass = require('node-sass');
var assetFunctions = require('../');

var render = function(file, options, done) {
  options = options || {};
  options.images_path = 'test/images';
  options.fonts_path = 'test/fonts';

  return sass.render({
    functions: assetFunctions(options),
    file: __dirname + '/scss/' + file
  }, function(err, result) {
    if(err) console.error(err);
    done(err, file, result);
  });
};

var assertEqualsFile = function(actual, file) {
  fs.readFile(file, function(err, expected) {
    assert.equal(err, null);
    try {
      assert.equal(actual.toString(), expected.toString());
    } catch (e) {
      debug('ACTUAL  ', actual.toString());
      debug('EXPECTED', expected.toString());
      throw e;
    }
  });
};

var sassDir = path.join(__dirname, 'scss');
var cssDir = path.join(__dirname, 'css');

var asset_host = function(http_path, done) {
  done('http://example.com');
};

var asset_cache_buster = function(http_path, real_path, done) {
  setTimeout(function() {
    if (http_path.substr(-4, 4) == '.gif') {
      done({path: http_path.replace(/\.gif$/, '-v123.gif'), query: null});
    } else {
      done('v=123');
    }
  }, 1000 * Math.random());
};

fs.readdir(sassDir, function(err, files) {
  files.forEach(function(file) {
    render(file, {}, function(err, file, result) {
      assert.equal(err, null);
      assertEqualsFile(result.css, path.join(cssDir, 'basic', file.replace(/\.scss$/, '.css')));
    });
    render(file, {asset_host: asset_host}, function(err, file, result) {
      assert.equal(err, null);
      if(err) console.error(err);
      assertEqualsFile(result.css, path.join(cssDir, 'asset_host', file.replace(/\.scss$/, '.css')));
    });
    render(file, {asset_cache_buster: asset_cache_buster}, function(err, file, result) {
      assert.equal(err, null);
      if(err) console.error(err);
      assertEqualsFile(result.css, path.join(cssDir, 'asset_cache_buster', file.replace(/\.scss$/, '.css')));
    });
  });
});


