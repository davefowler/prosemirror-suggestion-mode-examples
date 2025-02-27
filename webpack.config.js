const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        'examples/simple/simple': './examples/simple/simple.ts',
        'examples/suggestEdit/suggestEdit': './examples/suggestEdit/suggestEdit.ts',
        'examples/inkAndSwitch/inkAndSwitch': './examples/inkAndSwitch/inkAndSwitch.ts'
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['.ts', '.js'],
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
