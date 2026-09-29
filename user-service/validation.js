// Kept in its own module so it can be unit-tested without a database.
function validateUser(body, partial) {
  const errors = [];
  const has = (field) => body[field] !== undefined;

  if (!partial || has('name')) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      errors.push('name is required and must be a non-empty string');
    }
  }
  if (!partial || has('email')) {
    if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.push('email is required and must be a valid email address');
    }
  }
  if (!partial || has('course')) {
    if (typeof body.course !== 'string' || body.course.trim() === '') {
      errors.push('course is required and must be a non-empty string');
    }
  }
  if (!partial || has('semester')) {
    if (!Number.isInteger(body.semester) || body.semester < 1 || body.semester > 8) {
      errors.push('semester is required and must be an integer between 1 and 8');
    }
  }

  return errors;
}

module.exports = { validateUser };
