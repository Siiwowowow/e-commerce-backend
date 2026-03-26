import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import * as ProductService from "./products.service";
import { IQueryParams } from "../../interfaces/query.interface";


export const ProductController = {
  getAllProducts: catchAsync(async (req: Request, res: Response) => {
    const query=req.query
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
    const payload = {
            ...req.body,
            productPhoto : req.file?.path
        };
    const product = await ProductService.createProduct(payload);
    
    sendResponse(res, {
      httpCode: status.CREATED,
      success: true,
      message: "Product created successfully",
      data: product,
    });
  }),

  updateProduct: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const payload = req.body;
    const updatedProduct = await ProductService.updateProduct(id as string, payload);
    sendResponse(res, {
      httpCode: status.OK,
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  }),

  deleteProduct: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await ProductService.deleteProduct(id as string);
    sendResponse(res, {
      httpCode: status.OK,
      success: true,
      message: "Product deleted successfully",
      data: result,
    });
  }),
};