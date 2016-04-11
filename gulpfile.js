'use strict';
var gulp           = require('gulp'),
    browserSync    = require('browser-sync'),
    browserify     = require('browserify'),
    source         = require('vinyl-source-stream'),
    buffer         = require('vinyl-buffer'),
    gutil          = require('gulp-util'),
    sourcemaps     = require('gulp-sourcemaps'),
    gulpif         = require('gulp-if'),
    jshint         = require('gulp-jshint'),
    stylish        = require('jshint-stylish'),
    uglify         = require('gulp-uglify'),
    sass           = require('gulp-sass'),
    autoprefixer   = require('gulp-autoprefixer'),
    changed        = require('gulp-changed'),
    imagemin       = require('gulp-imagemin'),
    ghPages        = require('gulp-gh-pages');

var ENV;


/****************************************************/
// asset precompile tasks
/****************************************************/
function bundler(bundle) {
  return bundle.bundle()
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe( gulpif(ENV === 'production', uglify().on('error', gutil.log)) )
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist/scripts'))
    .pipe( gulpif(ENV === 'development', browserSync.reload({ stream: true })) );
}

var bundle = browserify({
  entries: ['./app/scripts/app.js'],
  debug: true
});
bundle.on('update', function() { bundler(bundle); });
bundle.on('log', gutil.log);

gulp.task('browserify', function() { bundler(bundle); });


gulp.task('lint', function() {
  gulp.src('./app/scripts/**/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter(stylish));
});

gulp.task('sass', function(){
  gulp.src('./app/styles/**/*.{scss,sass,css}')
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemaps.write())
    .pipe(autoprefixer({ browsers: ['last 2 version'] }))
    .pipe(gulp.dest('./dist/styles'))
    .pipe( gulpif(ENV === 'development', browserSync.reload({ stream: true })) );
});

gulp.task('images', function(){
  gulp.src('./app/images/**')
    .pipe(changed('./dist/images')) // Ignore unchanged files
    .pipe(imagemin())
    .pipe(gulp.dest('./dist/images'))
    .pipe( gulpif(ENV !== 'production', browserSync.reload({ stream: true })) );
});

/****************************************************/
// Move files not involved in a precompile
/****************************************************/
gulp.task('move', function(){
  gulp.src('./app/*.{html,txt}')
    .pipe(gulp.dest('./dist'));
});

/****************************************************/
// Dev tasks
/****************************************************/
gulp.task('development', function(){
  // this is a hack, no?
  ENV = 'development';
});

gulp.task('production', function(){
  // this is a hack, no?
  ENV = 'production';
});

gulp.task('watch', function(){
  gulp.watch(['./app/styles/**/*.{scss,sass,css}'], ['sass', browserSync.reload]);

  gulp.watch(['./app/**/*.html'], ['move', browserSync.reload]);

  gulp.watch(['./app/scripts/**/*.{js,hbs}'], ['lint', 'browserify', browserSync.reload]);
});

gulp.task('serve', function(){
  browserSync({
    server: { baseDir: 'dist' }
  });
});

gulp.task('gh-pages', function(){
  return gulp.src('./dist/**/*')
    .pipe(ghPages());
});

/****************************************************/
// Exported tasks
/****************************************************/
gulp.task('build', ['lint', 'browserify', 'sass', 'images', 'move']);

gulp.task('dev', ['development', 'build', 'serve', 'watch']);

gulp.task('deploy', ['production', 'build', 'gh-pages']);
