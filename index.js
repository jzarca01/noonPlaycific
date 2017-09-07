#!/usr/bin/env node

/**
 * Module dependencies.
 */

const program = require('commander');
const Api = require('./lib/noon-pacific-api');
const api = new Api();

const Spotify = require('./lib/spotify');

program
  .version('0.1.0')
  .option('-l, --list', 'Retrieve all the mixtapes available')
  .option('-m, --mixtape <number>', 'Retrieve the tracks in selected mixtape')
  .option('-p --provider <type>', 'Select music provider [spotify]')
  .parse(process.argv);

if (program.list) {
    return api.getMixtapes()
    .then(response => console.log(response));
}

if (program.mixtape) {
    return api.getTracks(program.mixtape)
    .then(response => response.results)
    .then(results => results.map(e => e.stream_url))
    .then(tracksArray => {
        switch(program.provider) {
            case 'spotify':
                new Spotify(`NOON // ${program.mixtape}`, tracksArray, false)
                break;
            default:
                console.log("no default provider");
                new Spotify(`NOON // ${program.mixtape}`, tracksArray, false)
                break;  
        }
    })
    .catch(error => console.log(error));
}
