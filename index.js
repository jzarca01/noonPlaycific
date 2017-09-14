#!/usr/bin/env node

/**
 * Module dependencies.
 */

const program = require('commander');
const Api = require('./lib/noon-pacific-api');
const api = new Api();

const Spotify = require('./lib/spotify');
const Deezer = require('./lib/deezer');

program
  .version('0.1.0')
  .option('-l, --list <type>', 'Retrieve all the mixtapes available [los-angeles|new-york|london|singles]')
  .option('-m, --mixtape <number>', 'Retrieve the tracks in selected mixtape')
  .option('-p --provider <type>', 'Select music provider [spotify]')
  .parse(process.argv);

if (program.list) {
    return api.getMixtapes(program.list)
    .then(response => console.log(response));
}

if (program.mixtape) {
    return api.getTracks(program.mixtape)
    .then(response => response.results)
    .then(results => {
        switch(program.provider) {
            case 'spotify':
                new Spotify(`NOON // ${program.mixtape}`, results.map(e => e.stream_url), false);
                break;
            case 'deezer':
                new Deezer(`NOON // ${program.mixtape}`, results, false);
                break;
            default:
                console.log("no default provider");
                new Spotify(`NOON // ${program.mixtape}`, results.map(e => e.stream_url), false);
                break;  
        }
    })
    .catch(error => console.log(error));
}
