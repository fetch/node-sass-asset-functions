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
    file: __dirname + '/scss/' + file,
  }, function(err, result){
    if(err) console.error(err);
    done(err, file, result);
  });
};

var assertEqualsFile = function(rendered, file) {
  fs.readFile(file, function(err, content){
    assert.equal(err, null);
    assert.equal(rendered.toString(), content.toString());
  });
};

var sassDir = path.join(__dirname, 'scss');
var cssDir = path.join(__dirname, 'css');

fs.readdir(sassDir, function(err, files) {
  files.forEach(function(file){
    render(file, {}, function(err, file, result){
      assert.equal(err, null);
      assertEqualsFile(result.css, path.join(cssDir, file.replace(/\.scss$/, '.css')));
    })
  });
});
