var sass = require('node-sass');
var Processor = require('./lib/processor');

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
    'inline-image($filename: null, $mime_type: false)': function(filename, mime_type, done) {
      var src = processor.real_path(filename.getValue(), 'images');
      var data = fs.readFileSync(src).toString('base64');
      var mime_string = mime_type.getValue() ? mime_type.getValue() : mime.lookup(src);
      var base64Image = util.format('url(\'data:%s;base64,%s\')', mime_string, data);
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
          list.setValue(i, new sass.types.String('url(\'' + files[i].url + '\') format(\'' + files[i].type + '\')'));
        }
        done(list);
      });
    }
  };
};
