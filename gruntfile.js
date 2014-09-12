module.exports = function(grunt) {
    grunt.initConfig({
        jshint: {
            all: ['src/**/*.js'],
            options: {
                globals: {
                    _: false,
                    $: false,
                    describe: false,
                    it: false,
                    expect: false,
                    beforeEach: false
                },
                browser: true,
                devel: true
            }
        },
        
        testem: {
            unit: {
                options: {
                    framework: 'jasmine2',
                    launch_in_dev: ['PhantomJS'],
                    before_tests: 'grunt jshint',
                    serve_files: [
                        'node_modules/lodash/lodash.js',
                        'node_modules/jquery/jquery.js',
                        'src/**/*.js',
                        'test/**/*.js'
                    ],
                    watch_files: [
                        'src/**/*.js',
                        'test/**/*.js'
                    ]
                }
            }
        }
    });
    
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-testem');

    grunt.registerTask('default', ['testem:run:unit']);
}