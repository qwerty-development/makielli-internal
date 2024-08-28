import './globals.css';
import { Inter } from 'next/font/google';
import Navbar from '../components/Navbar';  // We'll create this component next

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
        <Navbar />
        {children}
      </body>
    </html>
  );
}