'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Search, User, CheckCircle2, UserCheck, Check } from 'lucide-react';

interface Contact {
  id: string;
  jid: string;
  name: string | null;
  pushName: string | null;
}

interface ContactSelectorProps {
  selectedContacts: Contact[];
  onChange: (contacts: Contact[]) => void;
}

export default function ContactSelector({ selectedContacts, onChange }: ContactSelectorProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchContacts = async (query = '') => {
    setLoading(true);
    try {
      const data = await apiFetch(`/whatsapp/contacts?search=${encodeURIComponent(query)}`);
      setContacts(data);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initially
    fetchContacts();
  }, []);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchContacts(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const toggleSelectContact = (contact: Contact) => {
    const isSelected = selectedContacts.some((c) => c.jid === contact.jid);
    if (isSelected) {
      onChange(selectedContacts.filter((c) => c.jid !== contact.jid));
    } else {
      onChange([...selectedContacts, contact]);
    }
  };

  return (
    <div className="flex flex-col h-[400px] border border-border rounded-xl bg-card text-card-foreground overflow-hidden shadow-sm">
      {/* Search Header */}
      <div className="p-3 bg-muted/40 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar o empezar un nuevo chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background pl-10 pr-4 py-2 text-sm rounded-lg border border-input text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring transition-colors"
          />
        </div>
      </div>

      {/* Selected Header indicator */}
      {selectedContacts.length > 0 && (
        <div className="bg-muted/20 px-4 py-2 border-b border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>{selectedContacts.length} seleccionados</span>
          <button 
            type="button"
            onClick={() => onChange([])} 
            className="text-muted-foreground hover:text-foreground font-medium"
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60 p-1">
        {loading && contacts.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {searchQuery ? 'No se encontraron contactos' : 'Conecta tu WhatsApp para ver tus contactos'}
          </div>
        ) : (
          contacts.map((contact) => {
            const isSelected = selectedContacts.some((c) => c.jid === contact.jid);
            const displayName = contact.name || contact.pushName || contact.jid.split('@')[0];
            const displaySub = contact.name && contact.pushName ? `@${contact.pushName}` : `+${contact.jid.split('@')[0]}`;

            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => toggleSelectContact(contact)}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all ${
                  isSelected 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'border border-transparent hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* WhatsApp Profile Avatar representation */}
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center border transition-colors ${
                    isSelected 
                      ? 'bg-primary/10 border-primary/20 text-primary' 
                      : 'bg-secondary border-border text-muted-foreground'
                  }`}>
                    <User size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                      {displayName}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px] mt-0.5">
                      {displaySub}
                    </p>
                  </div>
                </div>

                {/* Selection Check Circle */}
                <div className={`h-5 w-5 rounded-full flex items-center justify-center border transition-all ${
                  isSelected 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-input bg-transparent'
                }`}>
                  {isSelected && <Check size={12} className="stroke-[3]" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
