import * as moderation from "../services/moderation.js";
import { keyFrom } from "../services/idempotency.js";
import categoryService from "../services/category.js";
import authService from "../services/auth.js";

const controller = {
    
    // GET /categories
    listCategories: async function(req, res, next) {
        try {
            const categories = await categoryService.findAll();
            res.json(categories);
        } catch (error) {
            next(error);
        }
    },

    // GET /categories/admin - Get all categories with product counts for admin
    listCategoriesAdmin: async function(req, res, next) {
        try {
            const categories = await categoryService.findAllWithProductCount();
            res.json(categories);
        } catch (error) {
            next(error);
        }
    },

    // POST /categories - Create a new category
    createCategory: async function(req, res, next) {
        try {
            const { name, parentId, description } = req.body ?? {};
            const result = await moderation.createCategory({ actor: req.user, key: keyFrom(req), name, parentId: parentId ? Number(parentId) : null, description });
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    },

    // PUT /categories/:id - Update a category
    updateCategory: async function(req, res, next) {
        try {
            const result = await moderation.updateCategory({ actor: req.user, key: keyFrom(req), categoryId: Number(req.params.id), name: req.body?.name, description: req.body?.description });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    // DELETE /categories/:id - Delete a category
    deleteCategory: async function(req, res, next) {
        try {
            const result = await moderation.deleteCategory({ actor: req.user, key: keyFrom(req), categoryId: Number(req.params.id) });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },
}

export default controller;