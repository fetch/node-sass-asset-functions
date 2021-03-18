/**
 * Internal processor for the asset function suite.
 */
const fs = require('fs');
const path = require('path');
const url = require('url');
const mime = require('mime');
const sizeOf = require('image-size');

const defaultPaths = {
  images_path: 'public/images',
  fonts_path: 'public/fonts',
  http_images_path: '/images',
  http_fonts_path: '/fonts'  
};

const FONT_TYPES = {
  woff: 'woff',
  woff2: 'woff2',
  otf: 'opentype',
  opentype: 'opentype',
  ttf: 'truetype',
  truetype: 'truetype',
  svg: 'svg',
  eot: 'embedded-opentype'
};

class Processor {
  constructor (options = {}) {
    this.options = options;
    const {
      images_path = defaultPaths.images_path,
      fonts_path = defaultPaths.fonts_path,
      http_images_path = defaultPaths.http_images_path,
      http_fonts_path = defaultPaths.http_fonts_path
    } = options;
    this.paths = {
      images_path, fonts_path, http_images_path, http_fonts_path
    }
  }

  asset_cache_buster (http_path, real_path, done) {
    const { asset_cache_buster: buster } = this.options;

    if (typeof buster !== 'function') {
      throw new Error('asset_cache_buster should be a function');
    }

    const http_path_url = url.parse(http_path);

    buster(http_path, real_path, value => {
      let new_url;

      if (typeof value == 'object') {
        const parsed_path = url.parse(value.path);
        new_url = {
          pathname: parsed_path.pathname,
          search: value.query || http_path_url.search
        };
      } else {
        new_url = {
          pathname: http_path_url.pathname,
          search: value
        };
      }

      done(url.format(new_url));
    });
  }

  asset_host (filepath, done) {
    const { asset_host: ahost } = this.options;
    
    if (typeof ahost !== 'function') {
      throw new Error('asset_host should be a function');
    }

    ahost(filepath, host => {
      done(url.resolve(host, filepath));
    });
  }

  real_path (filepath, segment) {
    const sanitized_filepath = filepath.replace(/(#|\?).+$/, '');
    return path.resolve(this.paths[`${segment}_path`], sanitized_filepath);
  }

  http_path (filepath, segment) {
    return path.join(this.paths[`http_${segment}_path`], filepath).replace(/\\/g, '/');
  }
  
  image_width (filepath, done) {
    done(sizeOf(this.real_path(filepath, 'images')).width);
  }
  
  image_height (filepath, done) {
    done(sizeOf(this.real_path(filepath, 'images')).height);
  }
  
  inline_image (filepath, mime_type, done) {
    const src = this.real_path(filepath, 'images');
  
    mime_type = mime_type || mime.lookup(src);

    fs.readFile(src, (err, data) => {
      if (err) {
        throw new Error(`inline_image failed to read ${src}: ${err}`);
      }
      done(`data:${mime_type};base64,${data.toString('base64')}`);
    });
  }
  
  asset_url (filepath, segment, done) {
    let fragment = '';
    let sanitized_http_path = this.http_path(filepath, segment);
    const real_path = this.real_path(filepath, segment);
    const fragmentIndex = sanitized_http_path.indexOf('#');

    const restoreFragment = url => done(url + fragment);
    const next = http_path => {
      if (this.options.asset_host) {
        this.asset_host(http_path, restoreFragment);
      } else {
        restoreFragment(http_path);
      }
    }

    if (~fragmentIndex) {
      fragment = sanitized_http_path.substring(fragmentIndex);
      sanitized_http_path = sanitized_http_path.substring(0, fragmentIndex);
    }

    if (this.options.asset_cache_buster) {
      this.asset_cache_buster(sanitized_http_path, real_path, next);
    } else {
      next(sanitized_http_path);
    }
  }
  
  image_url (filepath, done) {
    this.asset_url(filepath, 'images', done);
  }
  
  font_url (filepath, done) {
    this.asset_url(filepath, 'fonts', done);
  }

  font_files (files, done) {
    const processed_files = [];
    let count = 0;
  
    const complete = (index, type) => {
      return url => {
        processed_files[index] = {url: url, type: type};
        if (++count == files.length) {
          done(processed_files);
        }
      };
    };
  
    let i = 0, parts, ext, file, next, type;
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
  }
}

module.exports = Processor;
