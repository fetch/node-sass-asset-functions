# Node SASS Asset functions

> Exposes a set of functions to Sass that keep physical asset location details out of your source code. Also allows one to define a cache-busting policy or specify specific asset hosts.

![Verify](https://github.com/fetch/node-sass-asset-functions/workflows/Verify/badge.svg)
[![npmjs](https://badge.fury.io/js/node-sass-asset-functions.svg)](https://www.npmjs.com/package/node-sass-asset-functions)

_**NB** Please note that the `functions` option of dart-sass/node-sass is still experimental (>= v3.0.0)._

## Origin

Originally created for transition from Compass to Libsass, this module provides some of the asset functions that came with [Compass](http://compass-style.org). Tested with [dart-sass](https://github.com/sass/dart-sass) or [node-sass](https://github.com/sass/node-sass).

## Breaking Change 1.0.0

* [node-sass](https://github.com/sass/node-sass) is [deprecated](https://sass-lang.com/blog/libsass-is-deprecated)
* Default Sass compiler is now the [dart-sass](https://github.com/sass/dart-sass) javascript implementation.
* New option `sass` allows you to override the default compiler.
* Dart Sass is now the [primary implementation of Sass](https://sass-lang.com/dart-sass), and the default sass compiler.

## Installation

```
npm install --save[-dev] node-sass-asset-functions
```

## Usage

Basic usage is as easy as setting the `functions` property:

```js
const sass = require('sass');
const fiber = require('fibers');
const assetFunctions = require('node-sass-asset-functions');

sass.render({
  functions: assetFunctions(),
  file: scss_filename,
  fiber, // dart-sass async render performance detail
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
const sass = require('sass');
const fiber = require('fibers');
const assetFunctions = require('node-sass-asset-functions');

sass.render({
  functions: assetFunctions({
    images_path: 'public/img',
    http_images_path: '/img'
  }),
  file: scss_filename,
  fiber,
  [, options..]
}, function(err, result) { /*...*/ });
```

### Overriding the default compiler with Node-Sass

Example using the node-sass compiler using the new option `sass`.

```js
const sass = require('node-sass');
const assetFunctions = require('node-sass-asset-functions');

sass.render({
  functions: assetFunctions({ sass }),
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
  fiber,
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
  fiber,
  [, options..]
}, function(err, result) { /*...*/ });
```

##### A more advanced example:

Here we include the file's  hexdigest in the path, using the [`hexdigest`](https://github.com/koenpunt/node-hexdigest) module.

For example, `/images/myimage.png` would become `/images/myimage-8557f1c9b01dd6fd138ba203e6a953df6a222af3.png`.

```js
const sass = require('sass');
const fiber = require('fibers');
const path = require('path');
const fs = require('fs');
const hexdigest = require('hexdigest');

sass.render({
  functions: assetFunctions({
    asset_cache_buster: function(http_path, real_path, done){
      hexdigest(real_path, 'sha1', function(err, digest) {
        if (err) {
          // an error occurred, maybe the file doesn't exist.
          // Calling `done` without arguments will result in an unmodified path.
          done();
        } else {
          const extname = path.extname(http_path);
          const basename = path.basename(http_path, extname);
          const new_name = `${basename}-${digest}${extname}`;
          done({path: path.join(path.dirname(http_path), new_name), query: null});
        }
      });
    }
  }),
  file: scss_filename,
  fiber,
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
