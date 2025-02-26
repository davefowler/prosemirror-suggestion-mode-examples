const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        'index': './src/index.ts',
        'examples/simple/simple': './src/examples/simple/simple.ts',
        'examples/replace/replace': './src/examples/replace/replace.ts'
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
