import { Building2, Users, FileText, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";

interface LayoutProps {
children: React.ReactNode;
currentView: string;
onNavigate: (view: string) => void;
}

export default function Layout({ children, currentView, onNavigate }: LayoutProps) {
const { signOut } = useAuth();
const [menuOpen, setMenuOpen] = useState(false);

const navItems = [
{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
{ id: "company", label: "Empresa", icon: Building2 },
{ id: "clients", label: "Clientes", icon: Users },
{ id: "invoices", label: "Facturas", icon: FileText },
];

const handleSignOut = async () => {
try {
await signOut();
} catch (error) {
console.error("Error signing out:", error);
}
};

return ( <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">

```
  {/* HEADER */}

  <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
    <div className="flex items-center justify-between px-4 py-3">
      <h1 className="text-xl font-bold text-gray-900">Facturación</h1>

      <div className="flex items-center gap-2">

        <button
          onClick={handleSignOut}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

      </div>
    </div>

    {/* NAV DESKTOP */}

    <nav className={`${menuOpen ? "block" : "hidden"} md:block border-t border-gray-200`}>
      <div className="flex flex-col md:flex-row md:justify-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMenuOpen(false);
              }}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  </header>

  {/* CONTENT */}

  <main className="flex-1 max-w-7xl w-full mx-auto p-4 pb-24 overflow-x-hidden">
    {children}
  </main>

  {/* MOBILE BOTTOM NAV */}

  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden">
    <div className="flex justify-around py-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center text-xs ${
              isActive ? "text-blue-600" : "text-gray-500"
            }`}
          >
            <Icon className="w-5 h-5" />
            {item.label}
          </button>
        );
      })}
    </div>
  </nav>

</div>


);
}
