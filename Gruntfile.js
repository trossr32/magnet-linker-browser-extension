/* jshint esversion: 6 */

/// <binding BeforeBuild='default' />
module.exports = function (grunt) {
    const sass = require('sass');
    
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: { 
            debug: {
                src: ["Test/dist/*"] 
            },
            release: {
                src: ["Test/dist/*", "Publish"]
            }
        },

        sass: {
            options: {
                implementation: sass,
                sourceMap: false, // Create source map
                outputStyle: 'compressed' // Minify output
            },
            dist: {
                files: [{
                    expand: true, // Recursive
                    cwd: "src/content/sass", // The startup directory
                    src: ["*.scss"], // Source files
                    dest: "Test/dist/content/css", // Destination
                    ext: ".min.css", // File extension
                }]
            }
        },

        'string-replace': {
            inline: {
                files: {
                    'Test/dist/content/css/bootstrap-isolated.min.css': 'Test/dist/content/css/bootstrap-isolated.min.css',
                },
                options: {
                    replacements: [
                        {
                            pattern: /\.bootstrap-iso body/g,
                            replacement: '.bootstrap-iso'
                        },
                        {
                            pattern: /\.bootstrap-iso html/g,
                            replacement: '.bootstrap-iso'
                        }
                    ]
                }
            }
        },

        copy: {
            release: {
                files: [
                    // js
                    { expand: true, flatten: true, src: 'node_modules/@fortawesome/fontawesome-free/js/all.min.js', dest: 'Test/dist/content/js', filter: 'isFile' },
                    { expand: true, flatten: true, src: 'node_modules/bootstrap/dist/js/bootstrap.bundle.min.js', dest: 'Test/dist/content/js', filter: 'isFile' },
                    //{ expand: true, flatten: true, src: 'node_modules/popper.js/dist/popper.min.js', dest: 'Test/dist/content/js', filter: 'isFile' },
                    { expand: true, flatten: true, src: 'node_modules/jquery/dist/jquery.min.js', dest: 'Test/dist/content/js', filter: 'isFile' },
                    { expand: true, flatten: true, src: 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js', dest: 'Test/dist', filter: 'isFile' },

                    // css
                    { expand: true, flatten: true, src: 'node_modules/bootstrap/dist/css/bootstrap.min.css', dest: 'Test/dist/content/css', filter: 'isFile' },

                    // content
                    { expand: true, flatten: true, src: 'src/*.html', dest: 'Test/dist', filter: 'isFile' },
                    { expand: true, flatten: true, src: 'src/manifest.json', dest: 'Test/dist', filter: 'isFile' },
                    
                    // images
                    { expand: true, flatten: true, src: 'src/content/assets/images/*', dest: 'Test/dist/content/assets/images', filter: 'isFile' },
                    
                    // fonts
                    { expand: true, flatten: true, src: 'src/content/fonts/*', dest: 'Test/dist/content/fonts', filter: 'isFile' },
                ]
            },
            debug: {
                files: [
                    // debug
                    { expand: true, flatten: false, cwd: "src", src: '**/*.js', dest: 'Test/dist', filter: 'isFile' },
                ]
            }
        },

        uglify: {
            options: {
                compress: {
                    //beautify: true,
                    drop_console: false
                }
            },
            dist: {
                files: [{
                        expand: true, // Recursive
                        cwd: "src", // The startup directory
                        src: ["**/*.js"], // Source files
                        dest: "Test/dist", // Destination
                    }]
            }
        },

        cssmin: {
            target: {
                files: [{
                    expand: true,
                    flatten: true,
                    src: ['src/content/css/*.css'],
                    dest: 'Test/dist/content/css',
                    filter: 'isFile'
                }]
            }
        },

        jshint: {
            all: ['Gruntfile.js', 'src/content/**/*.js'] 
        },

        watch: {
            debug: {
                files: [
                    'Gruntfile.js',
                    'src/**/*.*'
                ],
                tasks: ['debug'],
                options: {
                    spawn: false,
                },
            }
        },

        shell: {
            ps: {
                options: {
                    stdout: true
                },
                command: 'powershell.exe -File CreatePackage.ps1'
            }
        }
    });

    // Default task(s).
    grunt.registerTask('debug', ['clean:debug', 'sass', 'string-replace', 'copy', 'cssmin']);
    grunt.registerTask('release', ['clean:release', 'sass', 'string-replace', 'copy:release', 'uglify', 'cssmin', 'shell:ps']);
};