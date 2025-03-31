import path from 'path';
import { fileURLToPath } from 'url';
import CopyPlugin from 'copy-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  entry: {
    simple: './src/simple/simple.ts',
    applySuggestion: './src/applySuggestion/applySuggestion.ts',
    basic: './src/basic/basic.ts',
  },
  output: {
    filename: '[name]/[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.css'],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
      watch: true,
    },
    hot: true,
    open: true,
  },
  devtool: process.env.NODE_ENV === 'development' ? 'eval-source-map' : false,
  watchOptions: {
    followSymlinks: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              sourceMap: true
            }
          }
        },
        exclude: /node_modules\/(?!prosemirror-suggestion-mode)/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: '**/index.html',
          to: '[path][name][ext]',
          context: 'src/',
        },
      ],
    }),
  ],
};
