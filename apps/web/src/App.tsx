import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reservations" element={<ComingSoonPage title="Reservaciones" />} />
          <Route path="/services" element={<ComingSoonPage title="Servicios" />} />
          <Route path="/categories" element={<ComingSoonPage title="Categorías" />} />
          <Route path="/schedule" element={<ComingSoonPage title="Horarios" />} />
          <Route path="/profile" element={<ComingSoonPage title="Perfil" />} />
          <Route path="/reviews" element={<ComingSoonPage title="Reseñas" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
