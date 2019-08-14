var fs = require('fs')
var path = require('path')
var assetFunctions = require('../')

var renderAsync = function(file, options, done) {
  options = options || {}
  options.images_path = __dirname + '/images'
  options.fonts_path = __dirname + '/fonts'
  var sass = options.implementation || require('node-sass');

  return sass.render({
    functions: assetFunctions(options),
    file: __dirname + '/scss/' + file
  }, done)
}

var normalize = function(s) {
  if (!s) {
    return s
  }
  return s.replace(/(\r\n|\n|\r)/gm, '')
    .replace(/\s\}/gm, '}')
    .replace(/'/gm, "\"")
}

var equalsFileAsync = function(file, suite, options, done) {
  renderAsync(file, options, function(err, result) {
    expect(err).toBeNull()
    var cssPath = path.join(cssDir, suite, file.replace(/\.scss$/, '.css'))
    fs.readFile(cssPath, function(err, expected) {
      expect(err).toBeNull()
      expect(normalize(result.css.toString())).toEqual(normalize(expected.toString()))
      done()
    })
  })
}

var sassDir = path.join(__dirname, 'scss')
var cssDir = path.join(__dirname, 'css')

var asset_host = function(http_path, done) {
  done('http://example.com')
}

var query_asset_cache_buster = function(http_path, real_path, done) {
  setTimeout(function() {
    done('v=123')
  }, 10)
}

var path_asset_cache_buster = function(http_path, real_path, done) {
  setTimeout(function() {
    var extname = path.extname(http_path)
      , basename = path.basename(http_path, extname)
      , dirname = path.dirname(http_path)
    
    done({path: path.join(dirname, basename + '-v123') + extname, query: null})
  }, 10)
}

var files = fs.readdirSync(sassDir)

describe.each(['node-sass', 'sass'])('with require("%s")', function(impl) {

  describe('basic', function() {
    files.forEach(function(file) {
      test(file, function(done) {
        equalsFileAsync(file, 'basic', {implementation: require(impl)}, done)
      })
    })
  })

  describe('asset_host', function() {
    files.forEach(function(file) {
      test(file, function(done) {
        equalsFileAsync(file, 'asset_host', { asset_host: asset_host, implementation: require(impl) }, done)
      })
    })
  })

  describe('asset_cache_buster', function() {
    describe('using query', function() {
      files.forEach(function(file) {
        test(file, function(done) {
          equalsFileAsync(file, 'asset_cache_buster/query', { asset_cache_buster: query_asset_cache_buster, implementation: require(impl) }, done)
        })
      })
    })

    describe('using path', function() {
      files.forEach(function(file) {
        test(file, function(done) {
          equalsFileAsync(file, 'asset_cache_buster/path', { asset_cache_buster: path_asset_cache_buster, implementation: require(impl) }, done)
        })
      })
    })
  })

})