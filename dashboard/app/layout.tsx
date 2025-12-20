'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Building2, FileText, TrendingUp, Linkedin, Sparkles, Users } from 'lucide-react';
import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <title>Social Trends Tracker</title>
        <meta name="description" content="Analyse des tendances de posts LinkedIn des entreprises luxembourgeoises" />
      </head>
      <body className="min-h-screen bg-background">
        <div className="flex">
          {/* Sidebar - Dark theme */}
          <aside className="fixed left-0 top-0 h-screen w-[240px] bg-sidebar-bg flex flex-col z-fixed">
            {/* Logo */}
            <div className="h-[56px] px-5 flex items-center border-b border-neutral-700/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                  <Linkedin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-white leading-tight">Social Trends</h1>
                  <p className="text-[10px] text-sidebar-text">Luxembourg</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
              <div className="px-4 mb-2">
                <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                  Analytics
                </span>
              </div>

              <NavLink href="/" icon={<BarChart3 className="w-5 h-5" />}>
                Dashboard
              </NavLink>
              <NavLink href="/companies" icon={<Building2 className="w-5 h-5" />}>
                Entreprises
              </NavLink>
              <NavLink href="/posts" icon={<FileText className="w-5 h-5" />}>
                Posts
              </NavLink>
              <NavLink href="/trends" icon={<TrendingUp className="w-5 h-5" />}>
                Tendances
              </NavLink>

              <div className="px-4 mt-4 mb-2">
                <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                  Creation
                </span>
              </div>

              <NavLink href="/tracker" icon={<Users className="w-5 h-5" />}>
                Tracker
              </NavLink>
              <NavLink href="/generate" icon={<Sparkles className="w-5 h-5" />}>
                Generateur
              </NavLink>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-700/20">
              <div className="text-[10px] text-neutral-500 text-center">
                v1.0.0
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 ml-[240px] min-h-screen">
            <div className="p-8">
              {children}
            </div>
          </main>
        </div>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 h-11 px-4 mx-2 rounded-md text-sm transition-colors duration-150
        ${isActive
          ? 'bg-sidebar-active text-white border-l-[3px] border-primary-500 ml-0 pl-[13px] rounded-l-none'
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
        }
      `}
    >
      <span className={isActive ? 'text-primary-400' : ''}>{icon}</span>
      <span className="font-medium">{children}</span>
    </Link>
  );
}
