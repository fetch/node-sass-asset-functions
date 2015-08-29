var path = require('path')
  , util = require('util')
  , url = require('url');

var sass = require('node-sass')
  , sizeOf = require('image-size')
  , async = require('async');

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

Processor.prototype.asset_cache_buster = function(http_path, real_path, done) {
  if (typeof this.options.asset_cache_buster !== 'function') {
    throw new Error('asset_cache_buster should be a function');
  }
  var http_path_url = url.parse(http_path);
  this.options.asset_cache_buster(http_path, real_path, function(value) {
    if (typeof value == 'string') {
      http_path_url.search = value;
    } else {
      http_path_url.path = value.path;
      http_path_url.search = value.query;
    }
    done(url.format(http_path_url));
  });
};

Processor.prototype.asset_host = function(filepath, done) {
  if (typeof this.options.asset_host !== 'function') {
    throw new Error('asset_host should be a function');
  }
  this.options.asset_host(filepath, function(host){
    done(url.resolve(host, filepath));
  });
};

Processor.prototype.real_path = function(filepath, segment) {
  var fragmentIndex = filepath.indexOf('#');
  if (~fragmentIndex) {
    filepath = filepath.substring(0, fragmentIndex);
  }
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

  var next = function(http_path){
    if (this.options.asset_host) {
      this.asset_host(http_path, done);
    } else {
      done(http_path);
    }
  }.bind(this);

  if (this.options.asset_cache_buster) {
    this.asset_cache_buster(http_path, this.real_path(filepath, segment), next);
  } else {
    next(http_path);
  }
};

Processor.prototype.image_url = function(filepath, done) {
  this.asset_url(filepath, 'images', done);
};

Processor.prototype.font_url = function(filepath, done) {
  this.asset_url(filepath, 'fonts', done);
};

var font_format_map = {
  eot: 'embedded-opentype',
  ttf: 'truetype'
};

Processor.prototype.font_files = function(files, done) {
  var i = 0, parts, ext, dir, file;
  var result = [];

  var font_url = this.font_url.bind(this);

  async.map(files, function(file, done) {
    parts = file.split('#');
    filename = parts[0];
    anchor = parts[1];
    ext = path.extname(filename);
    format = ext.substring(1);

    if (font_format_map[format]) {
      format = font_format_map[format];
    }

    font_url(file, function(url) {
      done(null, {url: url, format: format});
    });
  }, function(err, results) {
    done(results);
  });
};

module.exports = function(options) {
  var opts = options || {};
  var processor = new Processor(opts);

  return {
    'image-url($filename: null, $only_path: false)': function(filename, only_path, done) {
      processor.image_url(filename.getValue(), function(url) {
        if(!only_path.getValue()) url = 'url(\'' + url + '\')';
        done(new sass.types.String(url));
      });
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
      processor.font_url(filename.getValue(), function(url) {
        if(!only_path.getValue()) url = 'url(\'' + url + '\')';
        done(new sass.types.String(url));
      });
    },
    'font-files($filenames...)': function(list, done) {
      var l = list.getLength(), i = 0, filenames = [];
      for(;i < l;++i) {
        filenames[i] = list.getValue(i).getValue();
      }

      processor.font_files(filenames, function(files) {
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
