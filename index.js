var path = require('path')
  , url = require('url');

var sass = require('node-sass')
  , sizeOf = require('image-size');

var Processor = function(options) {
  this.options = options || {};

  this.paths = {
    images_path: 'public/images',
    fonts_path: 'public/fonts',
    http_images_path: '/images',
    http_fonts_path: '/fonts'
  };

  var path;
  for(path in this.paths) {
    if(this.options[path]) {
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
    if (typeof value == 'object') {
      http_path_url.path = value.path;
      http_path_url.search = value.query;
    } else {
      http_path_url.search = value;
    }
    done(url.format(http_path_url));
  });
};

Processor.prototype.asset_host = function(filepath, done) {
  if (typeof this.options.asset_host !== 'function') {
    throw new Error('asset_host should be a function');
  }
  this.options.asset_host(filepath, function(host) {
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

  var next = function(http_path) {
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

var FONT_TYPES = {
  woff: 'woff',
  woff2: 'woff2',
  otf: 'opentype',
  opentype: 'opentype',
  ttf: 'truetype',
  truetype: 'truetype',
  svg: 'svg',
  eot: 'embedded-opentype'
};

Processor.prototype.font_files = function(files, done) {
  var processed_files = [];

  var complete = function(index, type){
    return function(url) {
      processed_files.push({index: index, url: url, type: type});
      if (processed_files.length == files.length) {
        done(processed_files);
      }
    };
  };

  var i = 0, parts, ext, file, next, type;
  for (; i < files.length; ++i) {
    file = files[i];
    next = files[i + 1];

    parts = url.parse(file);
    if (FONT_TYPES[next]) {
      type = files.splice(i + 1, 1);
    } else {
      ext = path.extname(parts.path);
      type = ext.substring(1);
    }
    type = FONT_TYPES[type];
    this.font_url(file, complete(i, type));
  }
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
      var len = list.getLength(), i = 0, filenames = [];
      for(; i < len; ++i) {
        filenames[i] = list.getValue(i).getValue();
      }

      processor.font_files(filenames, function(files) {
        len = files.length;
        i = 0;
        list = new sass.types.List(len);
        for (; i < len; ++i) {
          list.setValue(files[i].index, new sass.types.String('url(\'' + files[i].url + '\') format(\'' + files[i].type + '\')'));
        }
        done(list);
      });
    }
  };
};
