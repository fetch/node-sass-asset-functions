var sass = require('node-sass');
var deasync = require('deasync');
var Processor = require('./lib/processor');

function syncOrAsync(method, transform, done) {
  if(typeof done === 'function') {
    return async(method, transform, done)
  } else {
    return sync(method, transform)
  }
}

function sync(method, transform) {
  return function() {
    try {
      return transform(null, method.apply(null, arguments))
    } catch(e) {
      return transform(e)
    }
  }
}

function async(method, transform, done) {
  return function() {
    var args = [].slice.apply(arguments)
    args.push(function(err, result) {
      done(transform(err, result))
    })
    method.apply(null, args)
  }
}

module.exports = function(options) {
  var opts = options || {};
  var processor = new Processor(opts);

  return {
    'image-url($filename, $only_path: false)': function(filename, only_path, done) {
      var transform = function(err, url) {
        if(err !== null) {
          return new sass.types.Error(err)
        }
        if(!only_path.getValue()) url = 'url(\'' + url + '\')';
        return new sass.types.String(url)
      }

      return syncOrAsync(processor.image_url.bind(processor), transform, done)(filename.getValue())
    },
    'inline-image($filename, $mime_type: null)': function(filename, mime_type, done) {
      mime_type = mime_type instanceof sass.types.Null ? null : mime_type.getValue();
      var transform = function(err, dataUrl) {
        if(err !== null) {
          return new sass.types.Error(err)
        }
        return new sass.types.String('url(\'' + dataUrl + '\')')
      }

      return syncOrAsync(processor.inline_image.bind(processor), transform, done)(filename.getValue(), mime_type)
    },
    'image-width($filename)': function(filename, done) {
      var transform = function(err, image_width) {
        if (err !== null) {
          return new sass.types.Error(err)
        }
        return new sass.types.Number(image_width, 'px')
      }
      return syncOrAsync(processor.image_width.bind(processor), transform, done)(filename.getValue())
    },
    'image-height($filename)': function(filename, done) {
      var transform = function(err, image_height) {
        if (err !== null) {
          return new sass.types.Error(err)
        }
        return new sass.types.Number(image_height, 'px')
      }
      return syncOrAsync(processor.image_height.bind(processor), transform, done)(filename.getValue())
    },
    'font-url($filename, $only-path: false)': function(filename, only_path, done) {
      var transform = function(err, url) {
        if (err !== null) {
          return new sass.types.Error(err)
        }
        if(!only_path.getValue()) url = 'url(\'' + url + '\')';
        return new sass.types.String(url);
      }
      return syncOrAsync(processor.font_url.bind(processor), transform, done)(filename.getValue())
    },
    'font-files($filenames...)': function(list, done) {
      var len = list.getLength(), i = 0, filenames = Array(len);
      for(; i < len; ++i) {
        filenames[i] = list.getValue(i).getValue();
      }

      var transform = function(err, files) {
        if (err !== null) {
          return new sass.types.Error(err)
        }
        len = files.length;
        i = 0;
        list = new sass.types.List(len);
        for (; i < len; ++i) {
          list.setValue(i, new sass.types.String('url(\'' + files[i].url + '\') format(\'' + files[i].type + '\')'));
        }
        return list
      }

      return syncOrAsync(processor.font_files.bind(processor), transform, done)(filenames)
    }
  };
};
