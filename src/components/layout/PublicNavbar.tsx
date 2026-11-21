import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { BrandLogo } from '../ui/BrandLogo';
import { Button } from '../ui/Button';

const NAV_LINKS = [
  { path: '/', label: 'হোম' },
  { path: '/about', label: 'আমাদের সম্পর্কে' },
  { path: '/register', label: 'প্রতিষ্ঠান নিবন্ধন' },
];

const HERO_BACKDROP_PATHS = new Set(['/', '/about', '/register']);

export const PublicNavbar: React.FC = () => {
  const { user, actingInstitutionId, theme, toggleTheme } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const currentPath = location.pathname;
  const hasHeroBackdrop = HERO_BACKDROP_PATHS.has(currentPath);
  const transparentOverHero = hasHeroBackdrop && !scrolled && !drawerOpen;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [currentPath]);

  const effectiveRole =
    user?.role === 'super_admin' && actingInstitutionId ? 'institution_admin' : user?.role;

  const dashboardEntry = effectiveRole
    ? `/dashboard/${effectiveRole}/${
        effectiveRole === 'teacher'
          ? 'classes'
          : effectiveRole === 'student' || effectiveRole === 'parent'
          ? 'results'
          : 'overview'
      }`
    : '/login';

  return (
    <header
      className={`${
        hasHeroBackdrop ? 'fixed top-0 left-0 right-0' : 'sticky top-0'
      } z-40 w-full transition-all duration-300 no-print ${
        transparentOverHero
          ? 'bg-gradient-to-b from-[#0B1437]/75 via-[#0B1437]/35 to-transparent border-b border-transparent'
          : 'bg-white/95 dark:bg-[#141B34]/95 backdrop-blur-md border-b border-[#E2E6F3] dark:border-[#262F52] shadow-sm'
      }`}
    >
      <div className="max-w-[1250px] mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between gap-6">
        <Link
          to="/"
          onClick={() => setDrawerOpen(false)}
          className="shrink-0 whitespace-nowrap"
          aria-label="একাডেমিয়া হোম"
        >
          <BrandLogo onDark={transparentOverHero} />
        </Link>

        <nav className="hidden min-[860px]:flex items-center gap-7" aria-label="প্রধান মেনু">
          {NAV_LINKS.map((link) => {
            const active = currentPath === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative py-2 text-[15px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  transparentOverHero
                    ? active
                      ? 'text-white'
                      : 'text-white/85 hover:text-white'
                    : active
                    ? 'text-[#4F46E5] dark:text-[#A5B4FC]'
                    : 'text-[#111936] dark:text-[#E8ECFB] hover:text-[#4F46E5] dark:hover:text-[#A5B4FC]'
                }`}
              >
                {link.label}
                <span
                  className={`absolute left-0 right-0 bottom-0 h-[2px] rounded-full transition-transform duration-300 origin-left ${
                    transparentOverHero ? 'bg-[#5EEAD4]' : 'bg-brand-gradient'
                  } ${active ? 'scale-x-100' : 'scale-x-0'}`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="hidden min-[860px]:flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="থিম পরিবর্তন করুন"
            title={theme === 'dark' ? 'লাইট মোড চালু করুন' : 'ডার্ক মোড চালু করুন'}
            className={`p-2 rounded-[10px] border transition-colors cursor-pointer ${
              transparentOverHero
                ? 'border-white/25 text-white hover:bg-white/15'
                : 'border-[#E2E6F3] dark:border-[#262F52] text-[#111936] dark:text-[#E8ECFB] hover:bg-[#4F46E5]/10'
            }`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Button size="sm" onClick={() => navigate(dashboardEntry)}>
            {user ? 'ড্যাশবোর্ড' : 'লগইন'}
          </Button>
        </div>

        <div className="min-[860px]:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="থিম পরিবর্তন করুন"
            className={`p-2 rounded-[10px] border transition-colors cursor-pointer ${
              transparentOverHero
                ? 'border-white/25 text-white hover:bg-white/15'
                : 'border-[#E2E6F3] dark:border-[#262F52] text-[#111936] dark:text-[#E8ECFB] hover:bg-[#4F46E5]/10'
            }`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setDrawerOpen((p) => !p)}
            aria-label={drawerOpen ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন'}
            className={`p-2 rounded-[10px] transition-colors cursor-pointer ${
              transparentOverHero
                ? 'text-white hover:bg-white/15'
                : 'text-[#111936] dark:text-[#E8ECFB] hover:bg-[#4F46E5]/10'
            }`}
          >
            {drawerOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div className="min-[860px]:hidden border-t border-[#E2E6F3] dark:border-[#262F52] bg-white dark:bg-[#141B34] px-5 py-4 space-y-2 shadow-lg">
          {NAV_LINKS.map((link) => {
            const active = currentPath === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setDrawerOpen(false)}
                className={`block px-3 py-2.5 rounded-[10px] text-sm font-semibold ${
                  active
                    ? 'bg-[#4F46E5]/12 text-[#4F46E5] dark:text-[#A5B4FC]'
                    : 'text-[#111936] dark:text-[#E8ECFB]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2">
            <Button
              className="w-full"
              onClick={() => {
                setDrawerOpen(false);
                navigate(dashboardEntry);
              }}
            >
              {user ? 'ড্যাশবোর্ড' : 'লগইন'}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
