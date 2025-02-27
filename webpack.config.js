const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        'examples/simple/simple': './src/examples/simple/simple.ts',
        'examples/suggestEdit/suggestEdit': './src/examples/suggestEdit/suggestEdit.ts',
        'examples/inkAndSwitch/inkAndSwitch': './src/examples/inkAndSwitch/inkAndSwitch.ts'
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
            { from: 'src/examples', to: 'examples', globOptions: {
              ignore: ['**/*.ts']
            }},
            { from: 'src/index.html', to: 'index.html' },
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
