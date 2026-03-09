import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AppSelectorPage from './pages/AppSelectorPage';
import CalculatorPage from './pages/CalculatorPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MagazynPage from './pages/MagazynPage';
import OrderFormPage from './pages/OrderFormPage';
import OrdersPage from './pages/OrdersPage';
import ProductionPage from './pages/ProductionPage';
import ReportsPage from './pages/ReportsPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/apps" element={<AppSelectorPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/new" element={<OrderFormPage />} />
          <Route path="/orders/:id" element={<OrderFormPage />} />
          <Route path="/production" element={<ProductionPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
        <Route path="/magazyn" element={<MagazynPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/apps" />} />
    </Routes>
  );
}

export default App;
