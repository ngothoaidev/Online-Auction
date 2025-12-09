import productService from "../services/product.service.js";
const controller = {
  /**
   * GET all products with optional filters
   */
  listProducts: function (req, res, next) {
    // const filters = {
    //   status: req.query.status,
    //   category: req.query.category,
    //   sellerId: req.query.sellerId
    // };
    
    // // Remove undefined filters
    // Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

    productService.findAll().then((products) => {
      res.json({
        success: true,
        message: 'Products retrieved successfully',
        data: products,
        count: products.length
      });
    }).catch(next);
  },

  /**
   * GET product by ID
   */
  getProduct: function (req, res, next) {
    const id = Number(req.params.id);
    productService.findById(id).then((product) => {
      if (product) {
        res.json({
          success: true,
          message: 'Product retrieved successfully',
          data: product
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }
    }).catch(next);
  },

  /**
   * POST create a new product
   */
  createProduct: function (req, res, next) {
    productService.create(req.body).then((newProduct) => {
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: newProduct
      });
    }).catch(next);
  },

  /**
   * PUT update a product
   */
  updateProduct: function(req, res, next) {
    const id = Number(req.params.id);
    const product = req.body;
    
    productService.findById(id).then((found) => {
      if (!found) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      } else {
        productService.update(id, product).then((updatedProduct) => {
          res.json({
            success: true,
            message: 'Product updated successfully',
            data: updatedProduct
          });
        }).catch(next);
      }
    }).catch(next);
  },

  /**
   * DELETE a product
   */
  deleteProduct: function (req, res, next) {
    const id = Number(req.params.id);
    productService.findById(id).then((product) => {
      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      } else {
        productService.delete(id).then((deletedProduct) => {
          res.json({
            success: true,
            message: 'Product deleted successfully',
            data: deletedProduct
          });
        }).catch(next);
      }
    }).catch(next);
  },

  // /**
  //  * GET products by seller ID
  //  */
  // getProductsBySeller: function (req, res, next) {
  //   const sellerId = Number(req.params.sellerId);
  //   productService.findBySellerId(sellerId).then((products) => {
  //     res.json({
  //       success: true,
  //       message: 'Seller products retrieved successfully',
  //       data: products,
  //       count: products.length
  //     });
  //   }).catch(next);
  // },

  // /**
  //  * GET active products only
  //  */
  // getActiveProducts: function (req, res, next) {
  //   productService.findActive().then((products) => {
  //     res.json({
  //       success: true,
  //       message: 'Active products retrieved successfully',
  //       data: products,
  //       count: products.length
  //     });
  //   }).catch(next);
  // }
}

export default controller;