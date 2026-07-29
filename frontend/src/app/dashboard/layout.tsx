'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  QrCode, 
  Send, 
  History, 
  FileText, 
  Settings as SettingsIcon, 
  LogOut,
  User,
  Users,
  MessageSquare
} from 'lucide-react';

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SidebarLink({ href, icon, children }: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
        isActive 
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-500/10 font-semibold shadow-sm shadow-emerald-500/5' 
          : 'text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900'
      }`}
    >
      <span className={`transition-transform duration-200 ${isActive ? 'scale-105 text-emerald-600' : 'text-zinc-400'}`}>
        {icon}
      </span>
      {children}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('USER');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token) {
      router.replace('/login');
    } else {
      setCheckingAuth(false);
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setUserName(user.name || '');
          setUserRole(user.role || 'USER');
        } catch {
          // ignore
        }
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/login');
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col justify-between p-5 shadow-[4px_0_24px_rgba(0,0,0,0.015)] z-20">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/10 transition-transform hover:scale-105 duration-200">
              <MessageSquare size={16} className="fill-white/10" />
            </div>
            <span className="font-extrabold tracking-tight text-base bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              Mensajes Web
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <SidebarLink href="/dashboard" icon={<LayoutDashboard size={18} />}>
              Dashboard
            </SidebarLink>
            <SidebarLink href="/dashboard/connect" icon={<QrCode size={18} />}>
              Conectar
            </SidebarLink>
            <SidebarLink href="/dashboard/schedule" icon={<Send size={18} />}>
              Programar Envíos
            </SidebarLink>
            <SidebarLink href="/dashboard/history" icon={<History size={18} />}>
              Historial
            </SidebarLink>
            <SidebarLink href="/dashboard/templates" icon={<FileText size={18} />}>
              Plantillas
            </SidebarLink>
            <SidebarLink href="/dashboard/settings" icon={<SettingsIcon size={18} />}>
              Configuración
            </SidebarLink>
            {userRole === 'ADMIN' && (
              <SidebarLink href="/dashboard/users" icon={<Users size={18} />}>
                Usuarios
              </SidebarLink>
            )}
          </nav>
        </div>

        {/* User Info / Logout */}
        <div className="border-t border-border pt-4 space-y-2.5">
          <div className="flex items-center gap-3 px-3 py-2 bg-muted/40 rounded-xl border border-border/30">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
              <User size={16} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate text-zinc-800">{userName || 'Usuario'}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                {userRole === 'ADMIN' ? 'Administrador' : 'Estándar'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-500 transition-all hover:bg-red-500/10 cursor-pointer"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-zinc-50/50 via-background to-background py-6 px-7">
        <div className="w-full space-y-5">
          {children}
        </div>
      </main>
    </div>
  );
}
