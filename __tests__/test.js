/**
 * Test driver.
 */
/* eslint-env jest */

const fs = require('fs');
const path = require('path');
const otherSass = require('node-sass');
const defaultSass = require('sass');
const assetFunctions = require('../');

const sassDir = path.join(__dirname, 'scss');
const cssDir = path.join(__dirname, 'css');
const otherSassOpts = { sass: otherSass };
const files = fs.readdirSync(sassDir);

function renderAsync (file, options = {}, done) {
  const { sass = defaultSass } = options;

  options.images_path = `${__dirname}/images`;
  options.fonts_path = `${__dirname}/fonts`;

  return sass.render({
    functions: assetFunctions(options),
    file: `${__dirname}/scss/${file}` // dart-sass will not find w/o jest testEnvironment 'node'
  }, done);
}

function equalsFileAsync (file, suite, options, done) {
  renderAsync(file, options, (err, result) => {
    expect(err).toBeNull();
    if (err) {
      return done(err);
    }

    const cssPath = path.join(cssDir, suite, file.replace(/\.scss$/, '.css'));
    fs.readFile(cssPath, (err, expected) => {
      expect(err).toBeNull();
      if (err) {
        return done(err);
      }

      const rendered = result.css.toString();
      const raw = expected.toString();      
      
      // Output style differences between node-sass and dart-sass, spacing and quotes '|".
      // For output equality comparison, strip quotes and spaces.
      const stripRendered = rendered.replace(/\s+|"|'/g, '');
      const stripRaw = raw.replace(/\s+|"|'/g, '');

      expect(stripRendered).toEqual(stripRaw);
      done();
    });
  });
}

function asset_host (http_path, done) {
  done('http://example.com');
}

function query_asset_cache_buster (http_path, real_path, done) {
  setTimeout(done, 10, 'v=123');
}

function path_asset_cache_buster (http_path, real_path, done) {
  setTimeout(() => {
    const extname = path.extname(http_path);
    const basename = path.basename(http_path, extname);
    const dirname = path.dirname(http_path);
    
    done({
      path: `${path.join(dirname, `${basename}-v123`)}${extname}`,
      query: null
    });
  }, 10);
}

function chain (done, next, err) {
  if (err) {
    return done(err);
  }
  next();
}

describe('basic', function () {
  files.forEach(file => {
    test(file, done => {
      const run = equalsFileAsync.bind(this, file, 'basic');
      const next = chain.bind(this, done, () => {
        run(otherSassOpts, done);
      });
      run({}, next);
    });
  });
});

describe('asset_host', function () {
  files.forEach(file => {
    test(file, done => {
      const run = equalsFileAsync.bind(this, file, 'asset_host');
      const opts = { asset_host: asset_host };
      const next = chain.bind(this, done, () => {
        run({
          ...otherSassOpts,
          ...opts
        }, done);
      });
      run(opts, next);
    });
  });
});

describe('asset_cache_buster', function () {
  describe('using query', function () {
    files.forEach(file => {
      test(file, done => {
        const run = equalsFileAsync.bind(this, file, 'asset_cache_buster/query');
        const opts = { asset_cache_buster: query_asset_cache_buster };
        const next = chain.bind(this, done, () => {
          run({
            ...otherSassOpts,
            ...opts
          }, done);          
        });
        run(opts, next);
      });
    });
  });

  describe('using path', function () {
    files.forEach(file => {
      test(file, done => {
        const run = equalsFileAsync.bind(this, file, 'asset_cache_buster/path');
        const opts = { asset_cache_buster: path_asset_cache_buster };
        const next = chain.bind(this, done, () => {
          run({
            ...otherSassOpts,
            ...opts
          }, done);
        });
        run(opts, next);
      });
    });
  });
});
