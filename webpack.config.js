const path = require('path');

module.exports = {
    entry: './src/index.ts',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    plugins: [
        new CopyWebpackPlugin({
          patterns: [
            { from: 'src/styles', to: 'styles' }
          ]
        })
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'src'),
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
        ]
    }
};
