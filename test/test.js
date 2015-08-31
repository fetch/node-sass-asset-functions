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

var query_asset_cache_buster = function(http_path, real_path, done) {
  setTimeout(function() {
    done('v=123');
  }, 1000 * Math.random());
};

var path_asset_cache_buster = function(http_path, real_path, done) {
  setTimeout(function() {
    var extname = path.extname(http_path)
      , basename = path.basename(http_path, extname)
      , dirname = path.dirname(http_path);
    
    done({path: path.join(dirname, basename + '-v123') + extname, query: null});
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
    render(file, {asset_cache_buster: query_asset_cache_buster}, function(err, file, result) {
      assert.equal(err, null);
      if(err) console.error(err);
      assertEqualsFile(result.css, path.join(cssDir, 'asset_cache_buster', 'query', file.replace(/\.scss$/, '.css')));
    });
    render(file, {asset_cache_buster: path_asset_cache_buster}, function(err, file, result) {
      assert.equal(err, null);
      if(err) console.error(err);
      assertEqualsFile(result.css, path.join(cssDir, 'asset_cache_buster', 'path', file.replace(/\.scss$/, '.css')));
    });
  });
});


