// Kept in its own module so it can be unit-tested without a database.
function validateProduct(body, partial) {
  const errors = [];
  const has = (field) => body[field] !== undefined;

  if (!partial || has('name')) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      errors.push('name is required and must be a non-empty string');
    }
  }
  if (!partial || has('sku')) {
    if (typeof body.sku !== 'string' || !/^[A-Za-z0-9-]{3,20}$/.test(body.sku)) {
      errors.push('sku is required and must be 3-20 letters, digits or hyphens');
    }
  }
  if (!partial || has('price')) {
    if (typeof body.price !== 'number' || Number.isNaN(body.price) || body.price < 0) {
      errors.push('price is required and must be a number >= 0');
    }
  }
  if (!partial || has('stock')) {
    if (!Number.isInteger(body.stock) || body.stock < 0) {
      errors.push('stock is required and must be an integer >= 0');
    }
  }
  if (!partial || has('category')) {
    if (typeof body.category !== 'string' || body.category.trim() === '') {
      errors.push('category is required and must be a non-empty string');
    }
  }

  return errors;
}

module.exports = { validateProduct };
