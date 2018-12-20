var gulp = require("gulp");
var htmlmin = require("gulp-htmlmin"); // html处理
var cleanCss = require("gulp-clean-css"); // css
var less = require("gulp-less"); // css
var uglify = require("gulp-uglify"); // js
var imagemin = require("gulp-imagemin"); // image
var concat = require("gulp-concat"); // 压缩
var clean = require("gulp-clean"); // 清空文件夹
var browserSync = require("browser-sync").create(); // 启动本地服务
var watch = require("gulp-watch"); // 监听文件变化
var runSequence = require("run-sequence").use(gulp); // 实现逐个执行任务
var gulpif = require("gulp-if"); // 条件判断
var uglify = require("gulp-uglify"); // js 压缩
var rev = require('gulp-rev-dxb');	// 生成版本号清单
var revCollector = require('gulp-rev-collector-dxb');   // 替换成版本号文件
var pump = require("pump");

var rootPath = "src/";

var fs = require("fs");

var env = "dev"; // 用于执行gulp任务时的判断
function set_env(type) {
    env = type || "dev";
    // 生成env.js文件，用于开发页面时，判断环境
    fs.writeFile("./env.js", "export default " + env + ";", function(err) {
        err && console.log(err);
    });
}

// 生成版本号清单
gulp.task('rev', function() {
    return gulp.src(['./dist/js/**', './dist/css/**'])
        .pipe(rev())
        .pipe(rev.manifest())
        .pipe(gulp.dest("./"));
});
// 添加版本号（路径替换）
gulp.task('add_version', function() {
    return gulp.src(['./rev-manifest.json', './dist/*.html'])
        .pipe(revCollector())   // 根据.json文件 执行文件内js/css名的替换
        .pipe(gulp.dest('./dist'));
});

gulp.task("browser", function() {
    browserSync.init({
        server: "./dist" // 访问目录
        // proxy: "你的域名或IP"    // 设置代理
    });
});

gulp.task("browser_reload", function() {
    browserSync.reload();
});

gulp.task("watch", function() {
    w("./src/**/*.html", "html");
    w("./src/js/**", "js_main");
    w("./src/libs/**/*.js", "js_libs");
    w("./src/css/**", "css_main");
    w("./src/libs/css/*.css", "css_libs");
    w("./src/images/**", "images");

    function w(path, task) {
        watch(path, function() {
            /**
             * 打包完成后，再刷新浏览器
             * 监听任务不要带cb参数，否则会报错：回调次数太多
             */
            runSequence(task, "browser_reload");
        });
    }
});

//转换html文件
gulp.task("html", function() {
    return gulp
        .src(rootPath + "*.html")
        .pipe(htmlmin({ 
            removeComments: true,       // 清除HTML注释
            collapseWhitespace: true,   // 压缩HTML
            minifyJS: true,             // 压缩页面JS
            minifyCSS: true             // 压缩页面CSS
        }))
        .pipe(gulp.dest("./dist")); //写入命令
});

// 打包css
gulp.task("css_main", function() {
    return gulp
        .src("./src/css/**/*.css")
        .pipe(concat("main.min.css"))
        .pipe(gulpif(env === "build", cleanCss({compatibility: 'ie8'}))) // 判断是否压缩压缩css
        .pipe(gulp.dest("./dist/css"));
});
gulp.task("css_libs", function() {
    return gulp.src("./src/libs/**/*.css").pipe(gulp.dest("./dist/libs"));
});

// 打包js
gulp.task("js_libs", function() {
    return gulp.src(rootPath + "libs/*.js").pipe(gulp.dest("./dist/js"));
});
gulp.task("uglify_check", function(cb) {
    pump([gulp.src("./src/js/*.js"), uglify()], cb);
});
gulp.task("js_main", ["uglify_check"], function() {
    return gulp
        .src("./src/js/*.js")
        .pipe(concat("main.min.js")) // 合并文件并命名
        .pipe(gulpif(env === "build", uglify())) // 判断是否压缩压缩js
        .pipe(gulp.dest("./dist/js"));
});

// 打包其他资源
gulp.task("images", function() {
    return gulp
        .src(rootPath + "images/*.*")
        .pipe(
            gulpif(
                env === "build",
                imagemin({
                    // 判断是否压缩压缩images
                    progressive: true
                })
            )
        )
        .pipe(gulp.dest("./dist/images"));
});

// 清空dist文件夹
gulp.task("clean", function() {
    return gulp.src(["dist/*"]).pipe(clean());
});

// 开发环境
gulp.task("dev", function(cb) {
    set_env("dev"); // 改变env的值
    runSequence(
        ["clean"],
        ["html", "js_libs", "js_main", "css_libs", "css_main", "images"],
        ["browser", "watch"],
        cb
    );
});

// 生产环境
gulp.task("build", function(cb) {
    set_env("build"); // 改变env的值
    runSequence(
        ["clean"],
        ["html", "js_libs", "js_main", "css_libs", "css_main", "images"],
        ['rev'], // 所有文件打包完毕之后开始生成版本清单文件
        ['add_version'], // 根据清单文件替换html里的资源文件
        cb
    );
});
