'use strict';
var gulp           = require('gulp'),
    browserSync    = require('browser-sync'),
    browserify     = require('browserify'),
    source         = require('vinyl-source-stream'),
    buffer         = require('vinyl-buffer'),
    gutil          = require('gulp-util'),
    gulpif         = require('gulp-if'),
    jshint         = require('gulp-jshint'),
    stylish        = require('jshint-stylish'),
    sass           = require('gulp-sass'),
    cleanCSS       = require('gulp-clean-css'),
    autoprefixer   = require('gulp-autoprefixer'),
    changed        = require('gulp-changed'),
    imagemin       = require('gulp-imagemin'),
    ghPages        = require('gulp-gh-pages');

var ENV;

var b = browserify('./app/scripts/app.js', {debug: true})
  .transform("babelify", {
    presets: ["es2015"],
  });
b.on('log', gutil.log);

function bundler(b) {
  return b
    .bundle()
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('app.js'))
    .pipe(buffer())
    // .pipe(sourcemaps.init({ loadMaps: true }))
    // .pipe(uglify().on('error', gutil.log))
    // .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist/scripts'))
}


/****************************************************/
// asset compilation tasks
/****************************************************/
gulp.task('browserify', function() {
  return bundler(b);
});

gulp.task('lint', function() {
  return gulp.src('./app/scripts/**/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter(stylish));
});

gulp.task('move', function(){
  return gulp.src('./app/*.{html,txt}')
    .pipe(gulp.dest('./dist'));
});

gulp.task('sass', function(){
  return gulp.src('./app/styles/**/*.{scss,sass,css}')
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({ browsers: ['last 2 version'] }))
    .pipe(cleanCSS())
    .pipe(gulp.dest('./dist/styles'))
    .pipe( gulpif(ENV === 'development', browserSync.reload({ stream: true })) );
});

gulp.task('images', function(){
  return gulp.src('./app/images/**')
    .pipe(changed('./dist/images')) // Ignore unchanged files
    .pipe(imagemin())
    .pipe(gulp.dest('./dist/images'))
    .pipe( gulpif(ENV === 'development', browserSync.reload({ stream: true })) );
});


/****************************************************/
// Sync Tasks
/****************************************************/
gulp.task('reload', ['move', 'sass', 'lint', 'browserify'], browserSync.reload);

gulp.task('watch', function(){
  gulp.watch(['./app/scripts/**/*.js'], ['lint', 'browserify', 'reload'])

  gulp.watch(['./app/**/*.html'], ['move', 'reload']);

  gulp.watch(['./app/styles/**/*.{scss,sass,css}'], ['sass', 'reload']);
});


/****************************************************/
// Production tasks
/****************************************************/
gulp.task('development', function(){
  // this is a hack, no?
  ENV = 'development';
});

gulp.task('production', function(){
  // this is a hack, no?
  ENV = 'production';
});

gulp.task('serve', function(){
  browserSync({
    server: { baseDir: './dist' },
    port: process.env.PORT || 3000
  });
});

gulp.task('gh-pages', function(){
  return gulp.src('./dist/**/*')
    .pipe(ghPages());
});


/****************************************************/
// Exported tasks
/****************************************************/
gulp.task('build', ['lint', 'browserify', 'sass', 'move', 'images']);

gulp.task('dev', ['development', 'build', 'watch', 'serve']);

gulp.task('deploy', ['production', 'build', 'gh-pages']);
