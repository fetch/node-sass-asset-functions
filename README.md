# Node SASS Asset functions [![Build Status](https://travis-ci.org/fetch/node-sass-asset-functions.svg?branch=master)](https://travis-ci.org/fetch/node-sass-asset-functions) [![npmjs](https://badge.fury.io/js/node-sass-asset-functions.svg)](https://www.npmjs.com/package/node-sass-asset-functions)

To ease the transitioning from Compass to Libsass, this module provides some of Compass' asset functions for [node-sass](https://github.com/sass/node-sass) or [sass](https://github.com/sass/sass)

_**NB** Please note that the `functions` option of node-sass is still experimental (>= v3.0.0)._

## Installation

```
npm install --save[-dev] node-sass-asset-functions
```

## Usage

Basic usage is as easy as setting the `functions` property:

```js
var sass = require('node-sass');
var assetFunctions = require('node-sass-asset-functions');

sass.render({
  functions: assetFunctions(),
  file: scss_filename,
  [, options..]
}, function(err, result) { /*...*/ });
```

You can specify the paths of your resources using the following options (shown with defaults):

```js
{
  images_path: 'public/images',
  fonts_path: 'public/fonts',
  http_images_path: '/images',
  http_fonts_path: '/fonts'
}
```

So if for example your images reside in `public/img` instead of `images/images`, you use it as follows:

```js
var sass = require('node-sass');
var assetFunctions = require('node-sass-asset-functions');

sass.render({
  functions: assetFunctions({
    images_path: 'public/img',
    http_images_path: '/img'
  }),
  file: scss_filename,
  [, options..]
}, function(err, result) { /*...*/ });
```

### Additional options

#### `asset_host`: a function which completes with a string used as asset host.

```js
sass.render({
  functions: assetFunctions({
    asset_host: function(http_path, done){
      done('http://assets.example.com');
      // or use the supplied path to calculate a host
      done('http://assets' + (http_path.length % 4) + '.example.com');
    }
  }),
  file: scss_filename,
  [, options..]
}, function(err, result) { /*...*/ });
```

#### `asset_cache_buster`: a function to rewrite the asset path

When this function returns a string, it's set as the query of the path. When returned an object, `path` and `query` will be used.

```js
sass.render({
  functions: assetFunctions({
    asset_cache_buster: function(http_path, real_path, done){
      done('v=123');
    }
  }),
  file: scss_filename,
  [, options..]
}, function(err, result) { /*...*/ });
```

#### `implementation`: a function to switch sass implementation

If you like to use other sass implementation (like `sass`), you can use `implementation` option to pass the module.

When you omit `implementation` option, `node-sass` ( version `^4.9.3` ) is implicitly used. ( See `devDependencies` of [package.json](https://github.com/fetch/node-sass-asset-functions/blob/master/package.json) )

```js
var sass = require('sass')

sass.render({
  functions: assetFunctions({
    implementation: sass,
  }),
  file: scss_filename,
  [, options..]
}, function(err, result) { /*...*/ });
```

##### A more advanced example:

Here we include the file's  hexdigest in the path, using the [`hexdigest`](https://github.com/koenpunt/node-hexdigest) module.

For example, `/images/myimage.png` would become `/images/myimage-8557f1c9b01dd6fd138ba203e6a953df6a222af3.png`.

```js
var path = require('path')
  , fs = require('fs')
  , hexdigest = require('hexdigest');

sass.render({
  functions: assetFunctions({
    asset_cache_buster: function(http_path, real_path, done){
      hexdigest(real_path, 'sha1', function(err, digest) {
        if (err) {
          // an error occurred, maybe the file doesn't exists.
          // Calling `done` without arguments will result in an unmodified path.
          done();
        } else {
          var extname = path.extname(http_path)
            , basename = path.basename(http_path, extname);
          var new_name = basename + '-' + digest + extname;
          done({path: path.join(path.dirname(http_path), new_name), query: null});
        }
      });
    }
  }),
  file: scss_filename,
  [, options..]
}, function(err, result) { /*...*/ });
```

### Available functions

- `image-url($filename: null, $only_path: false)`
- `image-width($filename: null)`
- `image-height($filename: null)`
- `font-url($filename: null, $only-path: false)`
- `font-files($filenames...)`
- and more to come

### Usage with Grunt

Using this module with Grunt is just as easy:

```js
var assetFunctions = require('node-sass-asset-functions');

module.exports = function(grunt){
  grunt.initConfig({
    // ...
    sass: {
      options: {
        functions: assetFunctions()
      },
      dist: {
        'public/stylesheets/application.css': 'app/assets/stylesheets/application.css.scss'
      }
    }
    // ...
  });
};
```

## See also

[`node-sass-css-importer`](https://github.com/fetch/node-sass-css-importer): Import CSS files into `node-sass`, just like [`sass-css-importer`](https://github.com/chriseppstein/sass-css-importer) did for Compass  

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request
