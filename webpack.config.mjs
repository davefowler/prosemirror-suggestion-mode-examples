import path from 'path';
import { fileURLToPath } from 'url';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  experiments: {
    outputModule: true,
  },
  entry: {
    'examples/simple/simple': './examples/simple/simple.ts',
    'examples/applySuggestion/applySuggestionDemo':
      './examples/applySuggestion/applySuggestionDemo.ts',
    'examples/basic/basic': './examples/basic/basic.ts',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'module',
    },
  },
  resolve: {
    extensions: ['.ts', '.js'],
    extensionAlias: {
      '.js': ['.js', '.ts'],
    },
    alias: {
      // Create aliases so examples can find the source files but also work for npm users
      'prosemirror-suggestion-mode': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/styles', to: 'styles' },
        {
          from: 'examples',
          to: 'examples',
          globOptions: {
            ignore: ['**/*.ts'],
          },
        },
        { from: 'examples/index.html', to: 'index.html' },
      ],
    }),
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
        use: 'ts-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};
