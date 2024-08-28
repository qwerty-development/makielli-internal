import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">Welcome to Your Management System</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/clients">
          <div className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-8 px-6 rounded-lg text-center transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105">
            <h2 className="text-2xl mb-2">Clients</h2>
            <p>Manage your client database</p>
          </div>
        </Link>
        <Link href="/inventory">
          <div className="bg-green-500 hover:bg-green-600 text-white font-bold py-8 px-6 rounded-lg text-center transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105">
            <h2 className="text-2xl mb-2">Inventory</h2>
            <p>Control your product inventory</p>
          </div>
        </Link>
        <Link href="/suppliers">
          <div className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-8 px-6 rounded-lg text-center transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105">
            <h2 className="text-2xl mb-2">Suppliers</h2>
            <p>Manage your supplier relationships</p>
          </div>
        </Link>
      </div>
    </main>
  );
}