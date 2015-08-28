# Node SASS Asset functions

To ease the transitioning from Compass to Libsass, this module provides some of Compass' asset functions for [node-sass](https://github.com/sass/node-sass)

_**NB** Please note that the `functions` option of node-sass is still experimental (>= v3.0.0)._

## Installation

```
npm install --save[-dev] node-sass-asset-functions
```

## Usage

Basic usage is as easy as setting the `functions` property:

```js
var sass = require('node-sass');
var assetFunctions = require('node-sass-assets-functions');

sass.render({
  functions: assetFunctions(),
  file: scss_filename,
  [, options..]
}, function(err, result) { /*...*/ });
```

There are a few options you can pass to the module, shown here with the defaults:

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
var assetFunctions = require('node-sass-assets-functions');

sass.render({
  functions: assetFunctions({
    images_path: 'public/img',
    http_images_path: '/img'
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
var assetFunctions = require('node-sass-assets-functions');

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
