import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from './components/Header';
import { RoleProvider } from './components/role-context'; // 👈 Correct relative path

export const metadata = {
  title: 'FreightOS Gemini Edition',
  description: 'Enterprise Freight Dispatch & Fleet Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className="bg-gray-950 text-gray-100 flex min-h-screen flex-col font-sans antialiased md:flex-row"
        suppressHydrationWarning
      >
        {/* Wrap everything in RoleProvider */}
        <RoleProvider>
          {/* Fixed Left Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
            {/* Top Header with Notification Bell */}
            <Header />

            {/* Page Content */}
            <main className="flex-1 p-6 md:p-8">{children}</main>
          </div>
        </RoleProvider>
      </body>
    </html>
  );
}