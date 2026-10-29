import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import type { Options } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// multer-storage-cloudinary's types derive its params from cloudinary v1; with the v2 override (package.json) they
// collapse to an empty type. The options below are what the v2 upload API accepts.
const storageParams = (p: Record<string, unknown>) => p as unknown as Options['params'];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- 1. Storage for Auction Products ---
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: storageParams({
    folder: 'Aurum/auctions',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }] // Keep original aspect ratio, max 1000px
  }),
});

// --- 2. Storage for User Avatars ---
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: storageParams({
    folder: 'Aurum/avatars', // Specific folder for profiles
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    // Avatars usually look best as squares. 'fill' ensures exact dimensions.
    transformation: [{ width: 500, height: 500, crop: 'fill', gravity: 'face' }] 
  }),
});

export const uploadProductImage = multer({ storage: productStorage });
export const uploadAvatar = multer({ storage: avatarStorage });