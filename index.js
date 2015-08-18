var fs = require('fs')
  , path = require('path')
  , util = require('util')
  , crypto = require('crypto');

var sass = require('node-sass')
  , sizeOf = require('image-size')
  , mime = require('mime');

function extend(destination, source) {
  for (var property in source)
    destination[property] = source[property];
  return destination;
}

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

  this.paths = {
    images_path: 'public/images',
    fonts_path: 'public/fonts',
    http_images_path: '/images',
    http_fonts_path: '/fonts'
  };
  var path;
  for(path in this.paths){
    if(this.options[path]){
      this.paths[path] = this.options[path];
    }
  }
};

Processor.prototype.cache_buster = function(filepath, real_path, done) {
  if (!this.options.cache_buster) {
    return done(filepath);
  }
  if (typeof this.options.cache_buster == 'function') {
    return this.options.cache_buster(filepath, real_path, done);
  }
  return cache_buster(filepath, real_path, done);
};

Processor.prototype.asset_host = function(filepath, done) {
  if (!this.options.asset_host) {
    return done(filepath);
  }
  var resolve = function(host){
    done(url.resolve(host, filepath));
  };
  var asset_host = this.options.asset_host;
  if (typeof asset_host == 'function') {
    asset_host(filepath, function(host){
      resolve(host);
    });
  } else {
    resolve(asset_host);
  }
};

Processor.prototype.real_path = function(filepath, segment) {
  return path.resolve(path.join(this.paths[segment + '_path'], filepath));
};

Processor.prototype.http_path = function(filepath, segment) {
  return path.join(this.paths['http_' + segment + '_path'], filepath);
};

Processor.prototype.image_width = function(filepath) {
  return sizeOf(this.real_path(filepath, 'images')).width;
};

Processor.prototype.image_height = function(filepath) {
  return sizeOf(this.real_path(filepath, 'images')).height;
};

Processor.prototype.asset_url = function(filepath, segment, done) {
  var http_path = this.http_path(filepath, segment);
  if (this.cache_buster) {
    this.cache_buster(http_path, this.real_path(filepath, segment), done);
  } else {
    done(http_path);
  }
};

Processor.prototype.image_url = function(filepath, done) {
  this.asset_url(filepath, 'images', done);
};

Processor.prototype.font_url = function(filepath, done) {
  this.asset_url(filepath, 'fonts', done);
};

Processor.prototype.font_files = function(files, done) {
  var format_map = {
    eot: 'embedded-opentype',
    ttf: 'truetype'
  };
  var i = 0, parts, ext, dir, file;
  var result = [];
  for(;i < files.length; ++i){
    file = files[i];
    parts = file.split('#');
    filename = parts[0];
    anchor = parts[1];
    ext = path.extname(filename);
    format = ext.substring(1);

    if (format_map[format]) {
      format = format_map[format];
    }
    this.font_url(file, function(url){
      result[i] = {url: url, format: format};
      if(result.length === files.length){
        done(result);
      }
    });
  }
};

module.exports = function(options){
  var opts = options || {};
  var processor = new Processor(opts);

  return {
    'image-url($filename: null, $only_path: false)': function(filename, only_path, done) {
      processor.image_url(filename.getValue(), function(url){
        if(!only_path.getValue()) url = 'url(\'' + url + '\')';
        done(new sass.types.String(url));
      });
    },
    'inline-image($filename: null, $only_path: false)': function(filename, only_path, done) {
      var src = processor.real_path(filename.getValue(), 'images');
      var data = fs.readFileSync(src).toString('base64');
      var base64Image = util.format('data:%s;base64,%s', mime.lookup(src), data);
      if(!only_path.getValue()) base64Image = 'url(\'' + base64Image + '\')';
      done(new sass.types.String(base64Image));
    },
    'image-width($filename: null)': function(filename) {
      var image_width = processor.image_width(filename.getValue());
      return new sass.types.Number(image_width, 'px');
    },
    'image-height($filename: null)': function(filename) {
      var image_height = processor.image_height(filename.getValue());
      return new sass.types.Number(image_height, 'px');
    },
    'font-url($filename: null, $only-path: false)': function(filename, only_path, done) {
      processor.font_url(filename.getValue(), function(url){
        if(!only_path.getValue()) url = 'url(\'' + url + '\')';
        done(new sass.types.String(url));
      });
    },
    'font-files($filenames...)': function(list, done) {
      var l = list.getLength(), i = 0, filenames = [];
      for(;i < l;++i) {
        filenames[i] = list.getValue(i).getValue();
      }

      processor.font_files(filenames, function(files){
        list = new sass.types.List(files.length);
        i = 0;
        for (;i < l;++i) {
          list.setValue(i, new sass.types.String('url(\'' + files[i].url + '\') format(\'' + files[i].format + '\')'));
        }
        done(list);
      });
    }
  };

};
