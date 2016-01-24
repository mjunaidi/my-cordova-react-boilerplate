var gulp = require('gulp');
var gutil = require("gulp-util");
var shell = require('gulp-shell')
var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');
var runSequence = require('run-sequence');
var path = require("path");
var preprocess = require('gulp-preprocess');
var packageJson = require('./package.json');
//var cordova = require('gulp-cordova-create');
var clean = require('gulp-clean');

const WEBPACK_SERVER_HOST = 'http://localhost';
const WEBPACK_SERVER_PORT = 3000;
const STATIC_PATH = 'static';
const BUNDLE_FILE = 'bundle.js';
const APP_NAME = packageJson.name;
const APP_ID = packageJson.id;
const APP_VERSION = packageJson.version;

var webpackOptionsLoader = {
  test: /.jsx?$/,
  loaders: ['babel?presets[]=react,presets[]=es2015,presets[]=stage-0'],
  include: path.join(__dirname, 'src'),
  exclude: /node_modules/
};
var webpackOptions = {
  module: {
    loaders: [
      webpackOptionsLoader,
      {
        test: /\.scss$/,
        loaders: ['style', 'css', 'sass']
      },
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        loader: 'url-loader?limit=100000'
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        loader: 'eslint-loader'
      }
    ]
  },
  entry: [
    './src/index.jsx'
  ],
  output: {
    path: path.join(__dirname, './release/www/' + STATIC_PATH + '/'),
    filename: BUNDLE_FILE
  },
  sassLoader: {
    includePaths: [
      path.resolve(__dirname, './node_modules/bootstrap-sass/assets/stylesheets/'),
      path.resolve(__dirname, './node_modules/compass-mixins/lib/')
    ]
  },
  eslint: {

  },
  debug: true,
  progress: false,
  emitError: true,
  emitWarning: true,
  failOnError: true,
  stats: {
    colors: true,
    reasons: true
  },
  devtool: 'source-map'
};

/**
 * remove release directory, which allow to install new cordova project
 */
gulp.task('clear-release', function () {
  return gulp.src('release', {read: false})
    .pipe(clean());
});

/**
 * copy non bundled files from src to dist directory
 */
gulp.task('copy-layout', function() {
  return gulp.src(['./src/index.html'])
    .pipe(preprocess({
      context: {
        BUNDLE_PATH: './' + STATIC_PATH + '/' + BUNDLE_FILE,
        APP_NAME: APP_NAME
      }
    }))
    .pipe(gulp.dest('./release/www'))
});

/**
 * copy non bundled files from src to dist directory with path to hot loader server
 */
gulp.task('copy-layout-hot', function() {
  return gulp.src(['./src/index.html'])
    .pipe(preprocess({
      context: {
        BUNDLE_PATH: WEBPACK_SERVER_HOST + ':' + WEBPACK_SERVER_PORT +'/' + STATIC_PATH + '/' + BUNDLE_FILE,
        APP_NAME: APP_NAME
      }
    }))
    .pipe(gulp.dest('./release/www'))
});

/**
 * Compile react jsx ES6 & ES7 to ES5 js
 */
gulp.task('compile-react', function(done) {
  webpack(webpackOptions, function(err, stats) {
    if(err) console.log(err);
    gutil.log("[webpack]", stats.toString({}));
    done();
  });
});

/**
 * Compile react jsx ES6 & ES7 to ES5 js and run webpack hot loader server
 */
gulp.task('compile-react-hot', function(done) {
  webpackOptions.entry = [
    'webpack-dev-server/client?' + WEBPACK_SERVER_HOST + ':' + WEBPACK_SERVER_PORT,
    'webpack/hot/only-dev-server'
  ].concat(webpackOptions.entry);
  webpackOptions.plugins = [
    new webpack.HotModuleReplacementPlugin({})
  ];
  webpackOptionsLoader.loaders.unshift('react-hot');
  webpackOptions.output.publicPath = WEBPACK_SERVER_HOST + ':' + WEBPACK_SERVER_PORT + '/' + STATIC_PATH + '/';

  new WebpackDevServer(webpack(webpackOptions), {
    hot: true,
    publicPath: '/' + STATIC_PATH + '/'
  }).listen(WEBPACK_SERVER_PORT, "localhost", function(err) {
    if(err) console.log(err);
    done();
    console.log('webpack dev server listening at ' + WEBPACK_SERVER_HOST + ':' + WEBPACK_SERVER_PORT);
  });
});

/**
 * Create defauld cordova project in release directory.
 * It could be run once
 */
gulp.task('create-cordova', ['clear-release'], shell.task('./node_modules/.bin/cordova create release ' + APP_ID + ' ' + APP_NAME));

/**
 * Add ios platform to created cordova project
 * It could be run once
 */
gulp.task('platform-ios', shell.task('cd release && ../node_modules/.bin/cordova platform add ios'));

/**
 * Add android platform to created cordova project
 * It could be run once
 */
gulp.task('platform-android', shell.task('cd release && ../node_modules/.bin/cordova platform add android'));

/**
 * Clear previous html code from release/www
 */
gulp.task('clear-cordova-www', function () {
  return gulp.src('release/www', {read: false})
    .pipe(clean());
});

/**
 * Build mobile ready apps for all installed platforms
 * Run after any changes
 */
gulp.task('build-cordova', shell.task('cd release && ../node_modules/.bin/cordova build'));

/**
 * Build mobile ready apps for ios platform
 * Run after any changes instead `build-cordova`
 */
gulp.task('build-ios', shell.task('cd release && ../node_modules/.bin/cordova build ios'));

/**
 * Build mobile ready apps for android platform
 * Run after any changes instead `build-cordova`
 */
gulp.task('build-android', shell.task('cd release && ../node_modules/.bin/cordova build android'));

/**
 * Run ios emulation - this also build app
 */
gulp.task('emulate-ios', shell.task('cd release && ../node_modules/.bin/cordova emulate ios'));

/**
 * Run android emulation - this also build app
 */
gulp.task('emulate-android', shell.task('cd release && ../node_modules/.bin/cordova emulate android'));

/**
 * Higher level task, should be run once for create cordova project (it could be run more times but it is time consuming)
 */
gulp.task('init-cordova', function(done) {
  runSequence('create-cordova', 'platform-ios', 'platform-android', done);
});

/**
 * Fill cordova project with proper html, js, css
 */
gulp.task('prepare-build', function(done) {
  runSequence('clear-cordova-www', 'copy-layout', 'compile-react', done);
});

/**
 * Emulate ios app with hot loader
 */
gulp.task('prebuild-ios-hot', function(done) {
  runSequence('clear-cordova-www', 'copy-layout-hot', 'compile-react-hot', 'emulate-ios', done);
});

/**
 * Emulate android app with hot loader
 */
gulp.task('prebuild-ios-hot', function(done) {
  runSequence('clear-cordova-www', 'copy-layout-hot', 'compile-react-hot', 'emulate-android', done);
});
