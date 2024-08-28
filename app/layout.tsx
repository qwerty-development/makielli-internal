import './globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Management System',
  description: 'Your comprehensive management solution',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-gray-800 p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link href="/" className="text-white font-bold text-xl">
              Home
            </Link>
            <div className="space-x-4">
              <Link href="/clients" className="text-white hover:text-gray-300">
                Clients
              </Link>
              <Link href="/inventory" className="text-white hover:text-gray-300">
                Inventory
              </Link>
              <Link href="/suppliers" className="text-white hover:text-gray-300">
                Suppliers
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}