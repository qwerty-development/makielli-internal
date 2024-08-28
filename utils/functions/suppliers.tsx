import { supabase } from '../supabase';

export interface Supplier {
  id: string;
  name: string;
  location: string;
  phone: string;
  balance: number;
}

export const supplierFunctions = {
  async getAllSuppliers(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('Suppliers')
      .select('*');
    
    if (error) throw error;
    return data || [];
  },

  async getSupplierById(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase
      .from('Suppliers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async addSupplier(supplier: Omit<Supplier, 'id'>): Promise<Supplier> {
    const { data, error } = await supabase
      .from('Suppliers')
      .insert([supplier])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    const { data, error } = await supabase
      .from('Suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteSupplier(id: string): Promise<void> {
    const { error } = await supabase
      .from('Suppliers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};