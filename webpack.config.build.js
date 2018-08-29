const path = require('path');
const merge = require('webpack-merge');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const SshWebpackPlugin = require('ssh-webpack-plugin');
const webpackConfig = require('./webpack.config');
const fs = require('fs');

module.exports = merge(webpackConfig, {

    devtool: 'source-map',

    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].[chunkhash].js'
    },

    plugins: [
        new CopyWebpackPlugin([
            {
                from: path.join(__dirname, 'assets/fonts'),
                to: path.join(__dirname, 'dist/assets/fonts')
            },
            {
                from: path.join(__dirname, 'assets/tags'),
                to: path.join(__dirname, 'dist/assets/tags')
            }
        ]),
        new CleanWebpackPlugin(['dist']),
        new SshWebpackPlugin({
            host: 'icons.perfecthair.ch',
            port: '22',
            username: 'icons',
            password: 'orEfrateBoiN',
            privateKey: fs.readFileSync('/Volumes/Storage/.ssh/maciej'),
            from: path.join(__dirname, 'dist'),
            to: '/home/icons/public_html'
        })
    ]

});
