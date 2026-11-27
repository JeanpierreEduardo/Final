import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import PageShell from './components/PageShell.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/public/HomePage.jsx';
import CatalogPage from './pages/public/CatalogPage.jsx';
import HowPage from './pages/public/HowPage.jsx';
import LocationPage from './pages/public/LocationPage.jsx';
import LoginPage from './pages/public/LoginPage.jsx';
import BookingPage from './pages/user/BookingPage.jsx';
import PurchasesPage from './pages/user/PurchasesPage.jsx';
import EditPurchasePage from './pages/user/EditPurchasePage.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminClientsPage from './pages/admin/AdminClientsPage.jsx';
import AdminMoviesPage from './pages/admin/AdminMoviesPage.jsx';
import AdminWorkersPage from './pages/admin/AdminWorkersPage.jsx';
import AdminPurchasesPage from './pages/admin/AdminPurchasesPage.jsx';
import EmployeeSellPage from './pages/employee/EmployeeSellPage.jsx';
import EmployeeCashPage from './pages/employee/EmployeeCashPage.jsx';
import EmployeeValidatePage from './pages/employee/EmployeeValidatePage.jsx';
import EmployeeAvailabilityPage from './pages/employee/EmployeeAvailabilityPage.jsx';
import EmployeeSalesPage from './pages/employee/EmployeeSalesPage.jsx';
import EmployeeProfilePage from './pages/employee/EmployeeProfilePage.jsx';
import SunatRequestsPage from './pages/sunat/SunatRequestsPage.jsx';
import SunatFiscalizationPage from './pages/sunat/SunatFiscalizationPage.jsx';
import SunatReceiptsPage from './pages/sunat/SunatReceiptsPage.jsx';

function PublicLayout() { return <PageShell><Outlet /></PageShell>; }
function AdminLayout() { return <PageShell area="admin"><Outlet /></PageShell>; }
function EmployeeLayout() { return <PageShell area="employee"><Outlet /></PageShell>; }
function SunatLayout() { return <PageShell area="sunat"><Outlet /></PageShell>; }
function RoleHome() { return <Navigate to="/" replace />; }

export default function App() {
  return <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/cartelera" element={<CatalogPage />} />
      <Route path="/como-funciona" element={<HowPage />} />
      <Route path="/ubicacion" element={<LocationPage />} />
      <Route path="/login" element={<LoginPage />} />
    </Route>
    <Route element={<ProtectedRoute roles={['usuario', 'administrador']} />}>
      <Route element={<PublicLayout />}>
        <Route path="/reservar" element={<BookingPage />} />
      </Route>
    </Route>
    <Route element={<ProtectedRoute roles={['usuario']} />}>
      <Route element={<PublicLayout />}>
        <Route path="/usuario" element={<Navigate to="/usuario/compras" replace />} />
        <Route path="/usuario/compras" element={<PurchasesPage />} />
        <Route path="/usuario/compras/:id/editar" element={<EditPurchasePage />} />
      </Route>
    </Route>
    <Route element={<ProtectedRoute roles={['administrador']} />}>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/clientes" element={<AdminClientsPage />} />
        <Route path="/admin/peliculas" element={<AdminMoviesPage />} />
        <Route path="/admin/trabajadores" element={<AdminWorkersPage />} />
        <Route path="/admin/compras" element={<AdminPurchasesPage />} />
      </Route>
    </Route>
    <Route element={<ProtectedRoute roles={['administrador', 'empleado']} />}>
      <Route element={<EmployeeLayout />}>
        <Route path="/empleado/ventas" element={<EmployeeSellPage />} />
        <Route path="/empleado/caja" element={<EmployeeCashPage />} />
        <Route path="/empleado/validar" element={<EmployeeValidatePage />} />
        <Route path="/empleado/cartelera" element={<EmployeeAvailabilityPage />} />
        <Route path="/empleado/mis-ventas" element={<EmployeeSalesPage />} />
        <Route path="/empleado/perfil" element={<EmployeeProfilePage />} />
      </Route>
    </Route>
    <Route element={<ProtectedRoute roles={['usuario', 'administrador', 'empleado']} />}>
      <Route element={<SunatLayout />}>
        <Route path="/sunat/clave-sol" element={<SunatRequestsPage />} />
        <Route path="/sunat/comprobantes" element={<SunatReceiptsPage />} />
        <Route path="/sunat/fiscalizacion" element={<SunatFiscalizationPage />} />
      </Route>
    </Route>
    <Route path="*" element={<RoleHome />} />
  </Routes>;
}
