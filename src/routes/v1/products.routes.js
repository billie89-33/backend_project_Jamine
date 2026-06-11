import express from "express";
import {
    getProducts,
    getProduct,
    getCategories,
    getBrands,
    getSpecKeys,
    getSpecFilters
} from "../../controllers/v1/products.controller.js";
import { validateMongoId } from "../../middlewares/validateId.middleware.js";
import { queryValidationMiddleware } from "../../middlewares/validate.middleware.js";

const router = express.Router();

router.get("/", queryValidationMiddleware, getProducts);
router.get("/categories", getCategories);
router.get("/brands", getBrands);
router.get("/spec-keys", getSpecKeys);
router.get("/spec-filters", getSpecFilters);
router.get("/:id", validateMongoId, getProduct);

export default router;
