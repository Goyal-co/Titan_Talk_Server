const { storage } = require('../config/firebase');
const { ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');
const fs = require('fs');
const path = require('path');

/**
 * Upload audio file to Firebase Storage
 * @param {string} localFilePath - Path to the local file
 * @param {string} fileName - Name for the file in Firebase Storage
 * @returns {Promise<string>} - Download URL of the uploaded file
 */
async function uploadAudioToFirebase(localFilePath, fileName) {
  try {
    // Read the file
    const fileBuffer = fs.readFileSync(localFilePath);
    
    // Create a reference to the file location in Firebase Storage
    const storageRef = ref(storage, `recordings/${fileName}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, fileBuffer, {
      contentType: getContentType(fileName)
    });
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('✅ File uploaded to Firebase Storage:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading to Firebase Storage:', error);
    throw error;
  }
}

/**
 * Delete audio file from Firebase Storage
 * @param {string} fileName - Name of the file to delete
 */
async function deleteAudioFromFirebase(fileName) {
  try {
    const storageRef = ref(storage, `recordings/${fileName}`);
    await deleteObject(storageRef);
    console.log('✅ File deleted from Firebase Storage:', fileName);
  } catch (error) {
    console.error('❌ Error deleting from Firebase Storage:', error);
    throw error;
  }
}

/**
 * Get content type based on file extension
 * @param {string} fileName - File name
 * @returns {string} - MIME type
 */
function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.webm': 'audio/webm',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac'
  };
  return mimeTypes[ext] || 'audio/mpeg';
}

/**
 * Extract file name from Firebase Storage URL
 * @param {string} url - Firebase Storage URL
 * @returns {string} - File name
 */
function getFileNameFromUrl(url) {
  try {
    const urlParts = url.split('/');
    const fileNameWithParams = urlParts[urlParts.length - 1];
    const fileName = fileNameWithParams.split('?')[0];
    return decodeURIComponent(fileName.replace('recordings%2F', ''));
  } catch (error) {
    console.error('❌ Error extracting filename from URL:', error);
    return null;
  }
}

module.exports = {
  uploadAudioToFirebase,
  deleteAudioFromFirebase,
  getFileNameFromUrl
};
