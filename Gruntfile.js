/* jshint esversion: 11 */

module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);

    // vendor files copied into every build target
    const vendorJs = [
        { expand: true, flatten: true, src: 'node_modules/jquery/dist/jquery.min.js', dest: '', filter: 'isFile' },
        { expand: true, flatten: true, src: 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js', dest: '', filter: 'isFile' },
        { expand: true, flatten: true, src: 'node_modules/@fortawesome/fontawesome-free/js/fontawesome.min.js', dest: '', filter: 'isFile' },
        { expand: true, flatten: true, src: 'node_modules/@fortawesome/fontawesome-free/js/solid.min.js', dest: '', filter: 'isFile' },
        { expand: true, flatten: true, src: 'node_modules/@fortawesome/fontawesome-free/js/brands.min.js', dest: '', filter: 'isFile' }
    ];

    /**
     * Build the copy file list for a browser target.
     * @param {string} target - 'firefox' or 'chromium'
     * @param {string} excludedEventPage - the other browser's background entry
     */
    function targetFiles(target, excludedEventPage) {
        return vendorJs.map(f => Object.assign({}, f, { dest: `dist/${target}/content/js` })).concat([
            // source js (excluding the other browser's background entry)
            { expand: true, flatten: false, cwd: 'src', src: ['**/*.js', `!${excludedEventPage}`], dest: `dist/${target}`, filter: 'isFile' },

            // html
            { expand: true, flatten: true, cwd: 'src', src: '*.html', dest: `dist/${target}`, filter: 'isFile' },

            // content css (tailwind.css is a build input, compiled separately by shell:tailwind_*)
            { expand: true, flatten: true, src: 'src/content/css/content_script.css', dest: `dist/${target}/content/css`, filter: 'isFile' },

            // images
            { expand: true, flatten: false, cwd: 'src/content/assets/images', src: '**', dest: `dist/${target}/content/assets/images` },

            // manifest
            { expand: true, flatten: true, src: `src/manifest-${target}/manifest.json`, dest: `dist/${target}`, filter: 'isFile' }
        ]);
    }

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: {
            debug: {
                src: ['dist/*']
            },
            release: {
                src: ['dist/*', 'Publish']
            }
        },

        copy: {
            firefox: {
                files: targetFiles('firefox', 'eventPage.chrome.js')
            },
            chromium: {
                files: targetFiles('chromium', 'eventPage.js')
            }
        },

        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            files: ['Gruntfile.js', 'src/content/**/*.js']
        },

        watch: {
            files: ['Gruntfile.js', 'src/**/*.*'],
            tasks: ['debug'],
            options: {
                spawn: false
            }
        },

        shell: {
            tailwind_firefox: {
                command: 'npx @tailwindcss/cli -i ./src/content/css/tailwind.css -o ./dist/firefox/content/css/tailwind.css --minify'
            },
            tailwind_chromium: {
                command: 'npx @tailwindcss/cli -i ./src/content/css/tailwind.css -o ./dist/chromium/content/css/tailwind.css --minify'
            },
            ps: {
                command: 'pwsh -NoProfile -ExecutionPolicy Bypass -File ./CreatePackage_Grunt.ps1'
            },
            sh: {
                command: './create_package_Grunt.sh'
            }
        }
    });

    // Playwright loads the extension from dist/chromium in a fresh profile where
    // optional permissions can't be granted through the browser UI. Promote the
    // optional host permissions to required for the test build only, so the same
    // registration code path runs with the permission already granted.
    grunt.registerTask('manifest_test_permissions', 'Promote optional host permissions for the Playwright build', function () {
        const path = 'dist/chromium/manifest.json';
        const manifest = grunt.file.readJSON(path);

        manifest.host_permissions = (manifest.host_permissions || []).concat(manifest.optional_host_permissions || []);
        delete manifest.optional_host_permissions;

        grunt.file.write(path, JSON.stringify(manifest, null, 2));

        grunt.log.writeln('dist/chromium/manifest.json: optional host permissions promoted to required (test build only).');
    });

    const build = ['copy:firefox', 'copy:chromium', 'shell:tailwind_firefox', 'shell:tailwind_chromium'];

    // debug group task
    grunt.registerTask('debug', ['jshint', 'clean:debug', ...build]);

    // build for Playwright integration tests (no lint, no packaging, test-permission manifest)
    grunt.registerTask('playwright', ['clean:debug', ...build, 'manifest_test_permissions']);

    // release group task; packaging script is platform-specific
    grunt.registerTask('release', ['jshint', 'clean:release', ...build, process.platform === 'win32' ? 'shell:ps' : 'shell:sh']);

    // release build without lint or packaging, e.g. for PR review
    grunt.registerTask('review', ['clean:release', ...build]);
};
