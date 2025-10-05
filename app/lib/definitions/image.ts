// app/lib/definitions/image.ts

import { Types } from "mongoose";

// Each variant (original, small, medium, etc.)
export interface ImageVariant {
  size: string;
  filename: string;
  width: number;
  height: number;
  url?: string;
}

// DB document representation
export interface ImageDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  username: string;
  alt?: string;
  variants: ImageVariant[];
  createdAt: Date;
  updatedAt: Date;
}

// Client-facing image object
export interface Image {
  id: string;
  userId: string;
  username: string;
  alt?: string;
  variants: {
    url: string;
    size: string;
    width: number;
    height: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface UploadedImage {
    id: string;
    userId: string;
    username: string;
    alt: string;
    variants: {
      url: string;
      size: string;
      width: number;
      height: number;
    }[]
    createdAt: string;
    updatedAt: string;
}  

// Optional smaller types for API responses or sockets
export type SanitizedImage = {
  id: string;
  userId: string;
  username: string;
  variants: ImageVariant[];
  url: string;
  alt?: string;
};

export type SocketImage = {
  id: string;
  userId: string;
  username: string;
  variants: ImageVariant[];
  alt?: string;
};

export interface GalleryImage {
    id: string;
    url: string;
    title?: string;
    createdAt?: string;
}