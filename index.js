#!/usr/bin/env node

/**
 * Module dependencies.
 */

const program = require('commander');
const Api = require('./api');
const api = new Api();

program
  .version('0.1.0')
  .option('-l, --list', 'Retrieve all the mixtapes available')
  .option('-m, --mixtape [number]', 'Retrieve the tracks in selected mixtape')
  .parse(process.argv);

if (program.list) {
    return api.getMixtapes()
    .then(response => console.log(response));
}

if (program.mixtape) {
    return api.getTracks(program.mixtape)
    .then(response => console.log(response));
}
