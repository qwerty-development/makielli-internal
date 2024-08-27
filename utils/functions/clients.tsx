import { supabase } from '../supabase';

export interface Client {
  client_id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  group_id: number;
  balance: number;
}

export interface ClientGroup {
  group_id: number;
  name: string;
}

export const clientFunctions = {
  async getAllClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('Clients')
      .select('*');
    
    if (error) throw error;
    return data || [];
  },

  async getClientById(id: number): Promise<Client | null> {
    const { data, error } = await supabase
      .from('Clients')
      .select('*')
      .eq('client_id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAllClientGroups(): Promise<ClientGroup[]> {
    const { data, error } = await supabase
      .from('ClientGroups')
      .select('*');
    
    if (error) throw error;
    return data || [];
  },

  async getClientGroupById(id: number): Promise<ClientGroup | null> {
    const { data, error } = await supabase
      .from('ClientGroups')
      .select('*')
      .eq('group_id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getClientsByGroup(groupId: number): Promise<Client[]> {
    const { data, error } = await supabase
      .from('Clients')
      .select('*')
      .eq('group_id', groupId);
    
    if (error) throw error;
    return data || [];
  }
};