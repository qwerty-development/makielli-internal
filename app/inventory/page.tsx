'use client'

import React, { useState, useEffect } from 'react';
import { productFunctions, Product, ProductVariant } from '../../utils/functions/products';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id' | 'variants'>>({
    name: '',
    photo: '',
    price: 0
  });
  const [newVariants, setNewVariants] = useState<Omit<ProductVariant, 'id' | 'product_id'>[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const productsData = await productFunctions.getAllProducts();
      setProducts(productsData);
      setError(null);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await productFunctions.addProduct(newProduct, newVariants);
      setShowProductForm(false);
      setNewProduct({ name: '', photo: '', price: 0 });
      setNewVariants([]);
      fetchProducts();
    } catch (error) {
      console.error('Error creating product:', error);
      setError('Failed to create product. Please try again.');
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const { id, variants, ...productData } = editingProduct;
      await productFunctions.updateProduct(id, productData, variants);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      setError('Failed to update product. Please try again.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productFunctions.deleteProduct(id);
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        setError('Failed to delete product. Please try again.');
      }
    }
  };

  const addVariant = () => {
    setNewVariants([...newVariants, { size: '', color: '', quantity: 0 }]);
  };

  const updateVariant = (index: number, field: keyof Omit<ProductVariant, 'id' | 'product_id'>, value: string | number) => {
    const updatedVariants = [...newVariants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };
    setNewVariants(updatedVariants);
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        Product Management
      </h1>
      
      <button
        onClick={() => setShowProductForm(!showProductForm)}
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mb-4"
      >
        {showProductForm ? 'Cancel' : 'Add New Product'}
      </button>

      {showProductForm && (
        <form onSubmit={handleCreateProduct} className="mb-8 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Add New Product</h2>
          <input
            type="text"
            placeholder="Name"
            value={newProduct.name}
            onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
            className="w-full p-2 mb-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Photo URL"
            value={newProduct.photo}
            onChange={(e) => setNewProduct({...newProduct, photo: e.target.value})}
            className="w-full p-2 mb-2 border rounded"
          />
          <input
            type="number"
            placeholder="Price (in cents)"
            value={newProduct.price}
            onChange={(e) => setNewProduct({...newProduct, price: parseInt(e.target.value)})}
            className="w-full p-2 mb-2 border rounded"
            required
          />
          <h3 className="text-lg font-semibold mt-4 mb-2">Variants</h3>
          {newVariants.map((variant, index) => (
            <div key={index} className="flex space-x-2 mb-2">
              <input
                type="text"
                placeholder="Size"
                value={variant.size}
                onChange={(e) => updateVariant(index, 'size', e.target.value)}
                className="flex-1 p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Color"
                value={variant.color}
                onChange={(e) => updateVariant(index, 'color', e.target.value)}
                className="flex-1 p-2 border rounded"
              />
              <input
                type="number"
                placeholder="Quantity"
                value={variant.quantity}
                onChange={(e) => updateVariant(index, 'quantity', parseInt(e.target.value))}
                className="flex-1 p-2 border rounded"
              />
              <button
                type="button"
                onClick={() => setNewVariants(newVariants.filter((_, i) => i !== index))}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addVariant}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded mt-2"
          >
            Add Variant
          </button>
          <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mt-4 block w-full">
            Create Product
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow-md p-6">
            <img src={product.photo} alt={product.name} className="w-full h-48 object-cover mb-4 rounded" />
            <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
            <p className="text-gray-600 mb-4">Price: ${(product.price ).toFixed(2)}</p>
            <h3 className="font-semibold mb-2">Variants:</h3>
            <ul className="mb-4">
              {product.variants.map((variant, index) => (
                <li key={index} className="text-sm text-gray-600">
                  {variant.size} - {variant.color}: {variant.quantity} in stock
                </li>
              ))}
            </ul>
            <div className="flex justify-between">
              <button
                onClick={() => setEditingProduct(product)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteProduct(product.id)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
          <div className="relative top-20 mx-auto p-5 border w-3/4 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Edit Product</h3>
            <form onSubmit={handleUpdateProduct}>
              <input
                type="text"
                placeholder="Name"
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                className="w-full p-2 mb-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder="Photo URL"
                value={editingProduct.photo}
                onChange={(e) => setEditingProduct({...editingProduct, photo: e.target.value})}
                className="w-full p-2 mb-2 border rounded"
              />
              <input
                type="number"
                placeholder="Price (in cents)"
                value={editingProduct.price}
                onChange={(e) => setEditingProduct({...editingProduct, price: parseInt(e.target.value)})}
                className="w-full p-2 mb-2 border rounded"
                required
              />
              <h4 className="font-semibold mt-4 mb-2">Variants:</h4>
              {editingProduct.variants.map((variant, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="Size"
                    value={variant.size}
                    onChange={(e) => {
                      const newVariants = [...editingProduct.variants];
                      newVariants[index] = { ...newVariants[index], size: e.target.value };
                      setEditingProduct({ ...editingProduct, variants: newVariants });
                    }}
                    className="flex-1 p-2 border rounded"
                  />
                  <input
                    type="text"
                    placeholder="Color"
                    value={variant.color}
                    onChange={(e) => {
                      const newVariants = [...editingProduct.variants];
                      newVariants[index] = { ...newVariants[index], color: e.target.value };
                      setEditingProduct({ ...editingProduct, variants: newVariants });
                    }}
                    className="flex-1 p-2 border rounded"
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={variant.quantity}
                    onChange={(e) => {
                      const newVariants = [...editingProduct.variants];
                      newVariants[index] = { ...newVariants[index], quantity: parseInt(e.target.value) };
                      setEditingProduct({ ...editingProduct, variants: newVariants });
                    }}
                    className="flex-1 p-2 border rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newVariants = editingProduct.variants.filter((_, i) => i !== index);
                      setEditingProduct({ ...editingProduct, variants: newVariants });
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newVariants = [...editingProduct.variants, { id: '', product_id: '', size: '', color: '', quantity: 0 }];
                  setEditingProduct({ ...editingProduct, variants: newVariants });
                }}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded mt-2"
              >
                Add Variant
              </button>
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded mr-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}