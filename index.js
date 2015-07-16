var fs = require('fs')
  , path = require('path')
  , util = require('util')
  , crypto = require('crypto');

var sass = require('node-sass')
  , sizeOf = require('image-size');

var file_digest = function(path, algo, cb) {
  var shasum, stream;
  shasum = crypto.createHash(algo);
  stream = fs.ReadStream(path);
  stream.on('data', function(d) {
    shasum.update(d);
  });
  stream.on('end', function() {
    cb(shasum.digest('hex'));
  });
};

var cache_buster = function(http_path, real_path, cb) {
  fs.exists(real_path, function(exists) {
    var basename, dirname, extname;
    if (exists) {
      dirname = path.dirname(http_path);
      extname = path.extname(http_path);
      basename = path.basename(http_path, extname);
      file_digest(real_path, 'sha1', function(hash) {
        var new_path = util.format('%s/%s-%s%s', dirname, basename, hash, extname);
        cb(new_path);
      });
    } else {
      cb(http_path);
    }
  });
};

var Processor = function(options) {
  this.options = options || {};

  this.options.images_path = this.options.images_path || 'public/images';
  this.options.http_images_path = this.options.http_images_path || '/images';

  this.cache_buster = false;
  if (this.options.cache_buster) {
    this.cache_buster = typeof this.options.cache_buster == 'function' ? this.options.cache_buster : cache_buster;
  }
};

Processor.prototype.real_path = function(filepath) {
  return path.join(this.options.images_path, filepath);
};

Processor.prototype.http_path = function(filepath) {
  return path.join(this.options.http_images_path, filepath);
};

Processor.prototype.image_width = function(filepath) {
  return sizeOf(this.real_path(filepath)).width;
};

Processor.prototype.image_height = function(filepath) {
  return sizeOf(this.real_path(filepath)).height;
};

Processor.prototype.image_url = function(filepath, done) {
  var http_path = this.http_path(filepath);
  if (this.cache_buster) {
    this.cache_buster(http_path, this.real_path(filepath), done);
  } else {
    done(http_path);
  }
};

module.exports = function(options){
  var opts = options || {};
  var processor = new Processor(opts);

  return {
    'image-url($filename: null)': function(filename, done) {
      processor.image_url(filename.getValue(), function(url){
        done(new sass.types.String('url(' + url + ')'));
      });
    },
    'image-width($filename: null)': function(filename) {
      var image_width = processor.image_width(filename.getValue());
      return new sass.types.Number(image_width, 'px');
    },
    'image-height($filename: null)': function(filename) {
      var image_height = processor.image_height(filename.getValue());
      return new sass.types.Number(image_height, 'px');
    }
  };

};
