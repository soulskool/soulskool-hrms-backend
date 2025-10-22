// // utils/bunnyCdn.js
// import axios from 'axios';
// import multer from 'multer';

// // Configure multer to use memory storage
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// const uploadToBunny = async (fileBuffer, fileName) => {
//   const storageZone = process.env.BUNNY_STORAGE_ZONE;
//   const accessKey = process.env.BUNNY_ACCESS_KEY;
//   const cdnUrl = process.env.BUNNY_CDN_URL;

  
//   const uploadUrl = `https://storage.bunnycdn.com/${storageZone}/${fileName}`;
// console.log("upload url", uploadUrl)
//   try {
//     await axios.put(uploadUrl, fileBuffer, {
//       headers: {
//         AccessKey: accessKey,
//         'Content-Type': 'application/octet-stream',
//       },
//     });
//     // Return the public URL for the file
//     return `${cdnUrl}/${fileName}`;
//   } catch (error) {
//     console.error('BunnyCDN Upload Error:', error.response?.data || error.message);
//     throw new Error('Failed to upload file to BunnyCDN');
//   }
// };

// export { upload, uploadToBunny };



// utils/bunnyCdn.js
import axios from 'axios';
import multer from 'multer';
import path from 'path'; // Import path module

// Configure multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * Uploads a file buffer to a specific folder within your BunnyCDN storage zone.
 * @param {Buffer} fileBuffer - The file content as a Buffer.
 * @param {string} desiredFileName - The name you want the file to have in BunnyCDN.
 * @param {string} [folder=''] - Optional. The folder path within the storage zone (e.g., 'employee-pictures').
 * @returns {Promise<string>} - The public CDN URL of the uploaded file.
 * @throws {Error} - If the upload fails.
 */
const uploadToBunny = async (fileBuffer, desiredFileName, folder = '') => {
  const storageZone = process.env.BUNNY_STORAGE_ZONE;
  const accessKey = process.env.BUNNY_ACCESS_KEY;
  const cdnUrl = process.env.BUNNY_CDN_URL;
  const baseUrl = process.env.BUNNY_BASE_URL; // Get base URL from .env

  // Validate required environment variables
  if (!storageZone || !accessKey || !cdnUrl || !baseUrl) {
    console.error('BunnyCDN environment variables are missing!');
    throw new Error('BunnyCDN configuration is incomplete. Check .env file.');
  }

  // Construct the full path within the storage zone, handling potential leading/trailing slashes
  const storagePath = path.join(folder, desiredFileName).replace(/\\/g, '/'); // Use path.join and ensure forward slashes

  // Construct the correct upload URL using the base URL
  const uploadUrl = `${baseUrl}/${storageZone}/${storagePath}`;

  console.log("Uploading to BunnyCDN URL:", uploadUrl); // Log for debugging

  try {
    const response = await axios.put(uploadUrl, fileBuffer, {
      headers: {
        AccessKey: accessKey,
        'Content-Type': 'application/octet-stream', // Standard for file uploads
      },
    });

    // BunnyCDN returns 201 Created on success
    if (response.status === 201) {
      // Return the public CDN URL
      console.log(`Successfully uploaded ${desiredFileName} to ${folder || 'root'}`);
      return `${cdnUrl}/${storagePath}`;
    } else {
      // Should not happen with PUT if no error, but good practice
      throw new Error(`BunnyCDN upload failed with status: ${response.status}`);
    }
  } catch (error) {
    // Log detailed error information
    console.error('BunnyCDN Upload Error:', error.response?.status, error.response?.data || error.message);
    // Provide a more specific error based on status code if available
    if (error.response?.status === 401) {
         throw new Error('Failed to upload file: BunnyCDN Unauthorized (Check Access Key and Base URL/Region).');
    }
    throw new Error('Failed to upload file to BunnyCDN.');
  }
};

export { upload, uploadToBunny };