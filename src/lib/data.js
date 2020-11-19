/*
* Library for storing and editing data
* CRUD for json files
*
*/

// @TODO: to refactor file

// Dependencies
import fs from 'fs';
import path from 'path';
import helpers from './helpers.js';

// Container for the module (to be exported)
var lib = {};

// Base directory of the data folder
const rootPath = path.resolve();
lib.baseDir = path.join(rootPath, rootPath.substr(rootPath.length - 3, 3) === "src" ? '' : 'src', '/.data/');

// Write data to a file
lib.create = (dir, fileName, data, callback) => {
    // Open the file for writing
    fs.open(`${lib.baseDir}${dir}/${fileName}.json`, 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // Convert data to string
            let stringData = JSON.stringify(data);

            // Write to file and close it
            fs.writeFile(fileDescriptor, stringData, err => {
                if (!err) {
                    fs.close(fileDescriptor, err => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing to new file.' + err);
                        }
                    })
                } else { 
                    callback('Error writing to new file.' + err);
                }
            });
        } else {
            callback('Could not create new file, it may already exist.' + err);
        }
    });
}

// Read data from a file
lib.read = (dir, fileName, callback) => {
    fs.readFile(`${lib.baseDir}${dir}/${fileName}.json`, 'utf8', (err, data) => {
        if (!err && data) {
            let parsedData = helpers.parse(data);
            callback(false, parsedData);
        } else {
            callback(err, data);
        }
    })
}

// Update data inside a file
lib.update = (dir, fileName, data, callback) => {
    // Open the file for writing
    fs.open(`${lib.baseDir}${dir}/${fileName}.json`, 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            let stringData = JSON.stringify(data);

            fs.ftruncate(fileDescriptor, err => {
                if (!err) {
                    fs.writeFile(fileDescriptor, stringData, err => {
                        if (!err) {
                            fs.close(fileDescriptor, err => {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback(err);
                                }
                            })
                        } else {
                            callback(err);
                        }
                    })
                } else {
                    callback(err);
                }
            })
        } else {
            callback(err)
        }
    })
}

// Delete a file
lib.delete = (dir, fileName, callback) => {
    // Unlink the file
    console.log(`${lib.baseDir}${dir}/${fileName}.json`)
    fs.unlink(`${lib.baseDir}${dir}/${fileName}.json`, (err) => {
        if (!err) {
            callback(false);
        } else {
            callback(err);
        }
    })
}

// List all items in a directory
lib.list = (dir, callback) => {
    fs.readdir(lib.baseDir + dir + '/', (err, data) => {
        if (!err && data && data.length > 0) {
            let trimmedFileNames = data.map(fileName => fileName.replace('.json', ''));
            callback(false, trimmedFileNames);
        } else {
            callback(err, data);
        }
    });
}

// Export the module
export default lib;