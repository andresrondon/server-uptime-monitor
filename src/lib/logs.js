/*
* Library for storing and rotating logs
*
*/

// Dependencies
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Container for the module
var lib = {};

// Base directory of the data folder
const rootPath = path.resolve();
lib.baseDir = path.join(rootPath, rootPath.substr(rootPath.length - 3, 3) === "src" ? '' : 'src', '/.logs/');

//Append a string to a file
lib.append = (fileName, str, callback) => {
  // Open the file for appending
  fs.open(lib.baseDir + fileName + '.log', 'a', (err, fileDescriptor) => {
    if (!err) {
      fs.appendFile(fileDescriptor, str+'\n', (err) => {
        if (!err) {
          fs.close(fileDescriptor, (err) => {
            if (!err) {
              callback(false);
            } else {
              callback("Error closing file that was being appended.");
            }
          });
        } else {
          callback('Error appending to file.');
        }
      })
    } else {
      callback("Could not open file for appending.");
    }
  });
}

lib.list = (includeComprressedLogs, callback) => {
  fs.readdir(lib.baseDir, (err, files) => {
    if (!err && files && files.length) {
      let trimmedFileNames = files
      .map(fileName => {
        if (fileName.includes('.log')) return fileName.replace('.log', '');
        else if (fileName.includes('.gz.b64') && includeComprressedLogs) return fileName.replace('.gz.b64', '');
      })
      .filter(fileName => fileName);
      callback(false, trimmedFileNames);
    } else {
      callback(err, files);
    }
  });
}

lib.compress = (logId, newFileId, callback) => {
  let sourceFile = logId + '.log';
  let destFile = newFileId + '.gz.b64';

  fs.readFile(lib.baseDir + sourceFile, 'utf8', (err, inputString) => {
    if (!err && inputString) {
      // Compress the data using gzip
      zlib.gzip(inputString, (err, buffer) => {
        if (!err && buffer) {
          // Send the data to the destination file
          fs.open(lib.baseDir + destFile, 'wx', (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
              fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
                if (!err) {
                  fs.close(fileDescriptor, callback);
                } else {
                  callback(err);
                }
              });
            } else {
              callback(err);
            }
          });
        } else {
          callback(err);
        }
      });
    } else {
      callback(err)
    }
  });
}

lib.decompress = (fileId, callback) => {
  let fileName = fileId + '.gz.b64';
  fs.readFile(lib.baseDir + fileName, 'utf8', (err, str) => {
    if (!err && str) {
      // Decompress the data
      let inputBuffer = Buffer.from(str, 'base64');
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if (!err, outputBuffer) {
          let outputString = outputBuffer.toString();
          callback(false, outputString);
        } else {
          callback(err);
        }
      })
    } else {
      callback(err);
    }
  });
}

lib.truncate = (logId, callback) => {
  fs.truncate(lib.baseDir + logId + '.log', 0, callback);
}

export default lib;