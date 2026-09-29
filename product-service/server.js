// Lab 6 - Product Service. Owns the Product resource and its own database (product-db).

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const promBundle = require('express-prom-bundle');

const connectDB = require('./db');
const Product = require('./models/Product');
const { validateProduct } = require('./validation');

const app = express();
const PORT = Number(process.env.PORT || 3002);
const SERVICE = 'product-service';

// Lab 8: Prometheus metrics on GET /metrics (probe traffic on /health is left out).
app.use(promBundle({ includeMethod: true, includePath: true, excludeRoutes: [/^\/health/], promClient: { collectDefaultMetrics: {} } }));
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${SERVICE}] ${req.method} ${req.originalUrl} -> ${res.statusCode}`);
  });
  next();
});

const badRequest = (res, details) =>
  res.status(400).json({ status: 400, service: SERVICE, error: 'Bad Request', message: 'Validation failed', details });

const notFound = (res, id) =>
  res.status(404).json({ status: 404, service: SERVICE, error: 'Not Found', message: `Product with id ${id} does not exist` });

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const isDuplicateSku = (err) => err && err.code === 11000;

app.get('/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const db = states[mongoose.connection.readyState] || 'unknown';
  res.status(db === 'connected' ? 200 : 503).json({ status: 'ok', service: SERVICE, port: PORT, db });
});

app.get('/products', async (req, res, next) => {
  try {
    res.status(200).json(await Product.find().sort({ _id: 1 }));
  } catch (err) {
    next(err);
  }
});

app.get('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return notFound(res, id);

    const product = await Product.findById(id);
    if (!product) return notFound(res, id);

    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
});

app.post('/products', async (req, res, next) => {
  try {
    const errors = validateProduct(req.body, false);
    if (errors.length > 0) return badRequest(res, errors);

    const product = await Product.create({
      name: req.body.name,
      sku: req.body.sku,
      price: req.body.price,
      stock: req.body.stock,
      category: req.body.category
    });

    res.status(201).location(`/products/${product.id}`).json(product);
  } catch (err) {
    if (isDuplicateSku(err)) return badRequest(res, ['sku is already used by another product']);
    next(err);
  }
});

app.put('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return notFound(res, id);

    const errors = validateProduct(req.body, false);
    if (errors.length > 0) return badRequest(res, errors);

    const product = await Product.findById(id);
    if (!product) return notFound(res, id);

    product.name = req.body.name;
    product.sku = req.body.sku;
    product.price = req.body.price;
    product.stock = req.body.stock;
    product.category = req.body.category;
    await product.save();

    res.status(200).json(product);
  } catch (err) {
    if (isDuplicateSku(err)) return badRequest(res, ['sku is already used by another product']);
    next(err);
  }
});

// PATCH /products/:id/stock  { "delta": -2 }
// Called by Order Service to reserve stock. Kept as an API so Order Service
// never writes to product-db itself.
app.patch('/products/:id/stock', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return notFound(res, id);
    if (!Number.isInteger(req.body.delta)) return badRequest(res, ['delta is required and must be an integer']);

    const product = await Product.findById(id);
    if (!product) return notFound(res, id);

    const updated = product.stock + req.body.delta;
    if (updated < 0) {
      return res.status(409).json({
        status: 409,
        service: SERVICE,
        error: 'Conflict',
        message: `Insufficient stock for product ${id}: available ${product.stock}, requested ${-req.body.delta}`
      });
    }

    product.stock = updated;
    await product.save();

    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
});

app.delete('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return notFound(res, id);

    const product = await Product.findByIdAndDelete(id);
    if (!product) return notFound(res, id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ status: 400, service: SERVICE, error: 'Bad Request', message: 'Request body is not valid JSON' });
  }
  console.error(err);
  res.status(500).json({ status: 500, service: SERVICE, error: 'Internal Server Error', message: 'Unexpected server-side failure' });
});

app.use((req, res) => {
  res.status(404).json({ status: 404, service: SERVICE, error: 'Not Found', message: `No route for ${req.method} ${req.originalUrl}` });
});

connectDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`${SERVICE} listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error(`${SERVICE} failed to connect to its database:`, err.message);
    process.exit(1);
  });
