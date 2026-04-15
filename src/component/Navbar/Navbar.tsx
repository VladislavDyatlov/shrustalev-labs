// components/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  name: string;
  href: string;
}

const navItems: NavItem[] = [
  { name: 'Первая лабораторная', href: '/' },
  { name: 'Вторая лабораторная', href: '/lab2' },
  { name: 'Третья лабораторная', href: '/lab3' },
  { name: 'Четвертая лабораторная', href: '/lab4' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-16">
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    relative px-3 py-2 text-sm font-medium transition-colors duration-200
                    ${isActive 
                      ? 'text-indigo-600' 
                      : 'text-gray-700 hover:text-indigo-500'
                    }
                  `}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full" />
                  )}
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-full scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}