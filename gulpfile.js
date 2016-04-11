'use strict';
var gulp           = require('gulp'),
    browserSync    = require('browser-sync'),
    browserify     = require('browserify'),
    source         = require('vinyl-source-stream'),
    buffer         = require('vinyl-buffer'),
    gutil          = require('gulp-util'),
    sourcemaps     = require('gulp-sourcemaps'),
    gulpif         = require('gulp-if'),
    uglify         = require('gulp-uglify'),
    sass           = require('gulp-sass'),
    autoprefixer   = require('gulp-autoprefixer'),
    ghPages        = require('gulp-gh-pages');

var ENV;
var customOpts = {
  entries: ['./app/scripts/app.js'],
  debug: true
};

var b = browserify(customOpts);

function bundle() {
  return b.bundle()
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe( gulpif(ENV === 'production', uglify().on('error', gutil.log)) )
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist/scripts'))
    .pipe( gulpif(ENV === 'development', browserSync.reload({ stream: true })) );
}

gulp.task('browserify', bundle);
b.on('update', bundle);
b.on('log', gutil.log);


/****************************************************/
// asset precompile tasks
/****************************************************/
gulp.task('sass', function(){
  gulp.src('./app/styles/**/*.{scss,sass,css}')
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemaps.write())
    .pipe(autoprefixer({ browsers: ['last 2 version'] }))
    .pipe(gulp.dest('./dist/styles'))
    .pipe( gulpif(ENV === 'development', browserSync.reload({ stream: true })) );
});

/****************************************************/
// Move files not involved in a precompile
/****************************************************/
gulp.task('move', function(){
  gulp.src('./app/*.{html,txt}')
    .pipe(gulp.dest('./dist'));

  // gulp.src('./node_modules/zurb-foundation-npm/css/foundation.min.css')
  //   .pipe(gulp.dest('./dist/styles'));

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

  gulp.watch(['./app/scripts/**/*.{js,hbs}'], ['browserify', browserSync.reload]);
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
gulp.task('build', ['browserify', 'sass', 'move']);

gulp.task('dev', ['development', 'build', 'serve', 'watch']);

gulp.task('deploy', ['production', 'build', 'gh-pages']);
