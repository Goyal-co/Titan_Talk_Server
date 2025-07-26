const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Download a file from a URL to a local path
function downloadFile(fileUrl, destPath) {
  return new Promise((resolve, reject) => {
    const url = new URL(fileUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    const file = fs.createWriteStream(destPath);
    protocol.get(fileUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${fileUrl}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(destPath));
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => reject(err));
    });
  });
}

module.exports = downloadFile;
