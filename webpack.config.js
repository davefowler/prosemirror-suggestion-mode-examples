const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        'examples/simple/simple': './examples/simple/simple.ts',
        'examples/suggestEdit/suggestEditDemo': './examples/suggestEdit/suggestEditDemo.ts',
        'examples/inkAndSwitch/inkAndSwitch': './examples/inkAndSwitch/inkAndSwitch.ts',
        'examples/advanced/advanced': './examples/advanced/advanced.ts'
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            // Create aliases so examples can find the source files but also work for npm users
            'prosemirror-suggestion-mode': path.resolve(__dirname, 'src')
        }
    },
    plugins: [
        new CopyWebpackPlugin({
          patterns: [
            { from: 'src/styles', to: 'styles' },
            { from: 'examples', to: 'examples', globOptions: {
              ignore: ['**/*.ts']
            }},
            { from: 'examples/index.html', to: 'index.html' },
          ]
        })
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        hot: true,
        open: true,
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: 'ts-loader'
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    }
};
