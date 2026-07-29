'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Search, 
  X, 
  AlertCircle, 
  CheckCircle2,
  Shield,
  User as UserIcon
} from 'lucide-react';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

export default function UserManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [modalError, setModalError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'ADMIN') {
          setIsAdmin(true);
          fetchUsers();
          return;
        }
      } catch (e) {
        // ignore
      }
    }
    // If not admin, redirect
    router.push('/dashboard');
  }, [router]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/auth/users');
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setCreating(true);

    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        json: { name, email, password, role },
      });

      setSuccess('Usuario creado con éxito.');
      setIsModalOpen(false);
      
      // Clear form
      setName('');
      setEmail('');
      setPassword('');
      setRole('USER');
      
      // Refresh list
      fetchUsers();
      
      // Auto-dismiss success message
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setModalError(err.message || 'Error al crear el usuario.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario ${email}?`)) {
      setError(null);
      setSuccess(null);
      try {
        await apiFetch(`/auth/users/${id}`, {
          method: 'DELETE',
        });
        setSuccess(`Usuario ${email} eliminado con éxito.`);
        fetchUsers();
        setTimeout(() => setSuccess(null), 5000);
      } catch (err: any) {
        setError(err.message || 'Error al eliminar el usuario.');
      }
    }
  };

  // Filter users based on query
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      (u.name?.toLowerCase().includes(query) || false) ||
      u.email.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query)
    );
  });

  if (!isAdmin) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="mx-auto text-destructive" size={36} />
          <h3 className="text-lg font-semibold">Acceso Denegado</h3>
          <p className="text-sm text-muted-foreground">Redireccionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Administra el acceso al sistema, crea nuevas cuentas y gestiona permisos
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <UserPlus size={16} />
          Crear Usuario
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-600 flex items-center gap-3">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 max-w-md bg-card border border-border rounded-lg px-3 py-2 shadow-sm">
        <Search className="text-muted-foreground" size={18} />
        <input
          type="text"
          placeholder="Buscar por nombre, correo o rol..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm focus:outline-none text-foreground placeholder-muted-foreground"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
            <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground space-y-2">
            <Users size={32} className="mx-auto opacity-45" />
            <p className="text-sm">
              {searchQuery ? 'No se encontraron usuarios coincidentes' : 'No hay usuarios en el sistema'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Correo Electrónico</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">Creado el</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
                          {user.role === 'ADMIN' ? <Shield size={14} className="text-amber-500" /> : <UserIcon size={14} />}
                        </div>
                        <span>{user.name || 'Sin Nombre'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        user.role === 'ADMIN' 
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' 
                          : 'bg-zinc-500/10 text-zinc-600 border border-zinc-500/20'
                      }`}>
                        {user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Eliminar usuario"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Crear Nuevo Usuario</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Error */}
            {modalError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateUser} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modal-name">
                  Nombre Completo
                </label>
                <input
                  id="modal-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Julio Cesar"
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modal-email">
                  Correo Electrónico
                </label>
                <input
                  id="modal-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@correo.com"
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modal-password">
                  Contraseña
                </label>
                <input
                  id="modal-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (mínimo 6 caracteres)"
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modal-role">
                  Rol del Sistema
                </label>
                <select
                  id="modal-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="USER">Usuario estándar</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? 'Creando...' : 'Crear Usuario'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
