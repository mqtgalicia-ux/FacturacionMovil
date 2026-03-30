import { NavLink } from "react-router-dom";
import { FaHome, FaUsers, FaFileInvoice, FaBuilding } from "react-icons/fa";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-inner sm:hidden">
      <ul className="flex justify-around items-center h-16">
        <li>
          <NavLink to="/dashboard" className={({ isActive }) =>
            `flex flex-col items-center justify-center text-xs ${
              isActive ? "text-blue-600" : "text-gray-500"
            }`
          }>
            <FaHome className="text-xl" />
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/clients" className={({ isActive }) =>
            `flex flex-col items-center justify-center text-xs ${
              isActive ? "text-blue-600" : "text-gray-500"
            }`
          }>
            <FaUsers className="text-xl" />
            Clientes
          </NavLink>
        </li>
        <li>
          <NavLink to="/invoices" className={({ isActive }) =>
            `flex flex-col items-center justify-center text-xs ${
              isActive ? "text-blue-600" : "text-gray-500"
            }`
          }>
            <FaFileInvoice className="text-xl" />
            Facturas
          </NavLink>
        </li>
        <li>
          <NavLink to="/company" className={({ isActive }) =>
            `flex flex-col items-center justify-center text-xs ${
              isActive ? "text-blue-600" : "text-gray-500"
            }`
          }>
            <FaBuilding className="text-xl" />
            Empresa
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}