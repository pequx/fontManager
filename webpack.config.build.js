const path = require('path');
const merge = require('webpack-merge');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = reqire('copy-webpack-plugin');
const SshWebpackPlugin = require('ssh-webpack-plugin');
const webpackConfig = require('./webpack.config');

module.exports = merge(webpackConfig, {

    devtool: 'source-map',

    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].[chunkhash].js'
    },

    plugins: [
        new CleanWebpackPlugin(['dist']),
        new CopyWebpackPlugin([
            {
                from: path.join(__dirname, 'assets/fonts/*'),
                to: path.join(__dirname, 'dist/assets/fonts')
            },
            {
                from: path.join(__dirname, 'assets/tags/*'),
                to: path.join(__dirname, 'dist/assets/fonts')
            }
        ]),
        new SshWebpackPlugin([
            {
                host: 'fonts.perfecthair.ch',
                port: '22',
                username: 'maciej',
                password: '***',
                privateKey: require('fs').readFileSync('/Volumes/Storage/.ssh/maciej'),
                from: path.join(__dirname, 'dist'),
                to: '/'
            }
        ])
    ]

});
