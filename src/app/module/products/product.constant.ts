// Fields we want to allow searching
export const productSearchableFields = [
  'name',
  'description',
  'slug',
];

// Fields we want to allow filtering
export const productFilterableFields = [
  'price',
  'stockQuantity',
  'isFeatured',
  'isOnSale',
  'discount',
  'slug',
];

// Since there are no relations, include config can be empty
export const productIncludeConfig = {}; 