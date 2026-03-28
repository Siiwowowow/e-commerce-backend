/* eslint-disable no-useless-assignment */
import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import * as ProductService from "./products.service";
import { IQueryParams } from "../../interfaces/query.interface";
import { uploadFileToCloudinary, deleteFileFromCloudinary } from "../../../config/cloudinary.config";

export const ProductController = {
  getAllProducts: catchAsync(async (req: Request, res: Response) => {
    const query = req.query;
    const products = await ProductService.getAllProducts(query as IQueryParams);
    sendResponse(res, {
      httpCode: status.OK,
      success: true,
      message: "Products fetched successfully",
      data: products,
    });
  }),

  getProductById: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const product = await ProductService.getProductById(id as string);
    sendResponse(res, {
      httpCode: status.OK,
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  }),

  createProduct: catchAsync(async (req: Request, res: Response) => {
    let uploadedImageUrl: string | null = null;
    
    try {
      // Parse JSON data if sent as string
      let productData = req.body;
      if (req.body.data) {
        productData = JSON.parse(req.body.data);
      }

      // Handle file upload - check both field names
      let productPhotoUrl = null;
      const files = req.files as { 
        [fieldName: string]: Express.Multer.File[] | undefined 
      };

      // Check for productPhoto field first, then fall back to 'file'
      const uploadedFile = files?.productPhoto?.[0] || files?.file?.[0];
      
      if (uploadedFile) {
        const uploadResult = await uploadFileToCloudinary(
          uploadedFile.buffer,
          uploadedFile.originalname
        );
        productPhotoUrl = uploadResult.secure_url;
        uploadedImageUrl = productPhotoUrl; // Store for cleanup if needed
        console.log("📤 Image uploaded:", productPhotoUrl);
      }

      const payload = {
        ...productData,
        productPhoto: productPhotoUrl,
      };

      const product = await ProductService.createProduct(payload);
      
      sendResponse(res, {
        httpCode: status.CREATED,
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      // If image was uploaded but database operation failed, delete it
      if (uploadedImageUrl) {
        console.log("🗑️ Deleting orphaned image due to error:", uploadedImageUrl);
        await deleteFileFromCloudinary(uploadedImageUrl).catch(console.error);
        console.log("✅ Orphaned image deleted successfully");
      }
      throw error; // Re-throw to be handled by global error handler
    }
  }),

  updateProduct: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    let uploadedImageUrl: string | null = null;
    let oldImageUrl: string | null = null;
    
    try {
      // Parse JSON data if sent as string
      let productData = req.body;
      if (req.body.data) {
        productData = JSON.parse(req.body.data);
      }

      // Get existing product to get old image URL
      const existingProduct = await ProductService.getProductById(id as string);
      oldImageUrl = existingProduct.productPhoto || null;

      // Handle file upload for update
      let productPhotoUrl = undefined;
      const files = req.files as { 
        [fieldName: string]: Express.Multer.File[] | undefined 
      };

      const uploadedFile = files?.productPhoto?.[0] || files?.file?.[0];
      
      if (uploadedFile) {
        const uploadResult = await uploadFileToCloudinary(
          uploadedFile.buffer,
          uploadedFile.originalname
        );
        productPhotoUrl = uploadResult.secure_url;
        uploadedImageUrl = productPhotoUrl; // Store for cleanup if needed
        console.log("📤 New image uploaded:", productPhotoUrl);
      }

      const payload = {
        ...productData,
        ...(productPhotoUrl && { productPhoto: productPhotoUrl }),
      };

      const updatedProduct = await ProductService.updateProduct(id as string, payload);
      
      // If update successful and new image was uploaded, delete old image
      if (uploadedImageUrl && oldImageUrl) {
        console.log("🗑️ Deleting old image:", oldImageUrl);
        await deleteFileFromCloudinary(oldImageUrl).catch(console.error);
        console.log("✅ Old image deleted successfully");
      }
      
      sendResponse(res, {
        httpCode: status.OK,
        success: true,
        message: "Product updated successfully",
        data: updatedProduct,
      });
    } catch (error) {
      // If new image was uploaded but update failed, delete it
      if (uploadedImageUrl) {
        console.log("🗑️ Deleting newly uploaded image due to error:", uploadedImageUrl);
        await deleteFileFromCloudinary(uploadedImageUrl).catch(console.error);
        console.log("✅ Newly uploaded image deleted successfully");
      }
      throw error; // Re-throw to be handled by global error handler
    }
  }),

  deleteProduct: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    try {
      // Get product to get image URL before deletion
      const product = await ProductService.getProductById(id as string);
      const imageUrl = product.productPhoto;
      
      const result = await ProductService.deleteProduct(id as string);
      
      // Delete image from Cloudinary after successful deletion
      if (imageUrl) {
        console.log("🗑️ Deleting product image:", imageUrl);
        await deleteFileFromCloudinary(imageUrl).catch(console.error);
        console.log("✅ Product image deleted successfully");
      }
      
      sendResponse(res, {
        httpCode: status.OK,
        success: true,
        message: "Product deleted successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  }),
};