import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import AppLayout from './apps/JumarProdukcjaApp/components/AppLayout';
import CalculatorPage from './apps/JumarProdukcjaApp/pages/CalculatorPage';
import HomePage from './apps/JumarProdukcjaApp/pages/HomePage';
import OrderFormPage from './apps/JumarProdukcjaApp/pages/OrderFormPage';
import OrdersDoingPage from './apps/JumarProdukcjaApp/pages/OrdersDoingPage';
import OrdersDoneCanceledPage from './apps/JumarProdukcjaApp/pages/OrdersDoneCanceledPage';
import OrdersPlanningPage from './apps/JumarProdukcjaApp/pages/OrdersPlanningPage';
import ProductionPage from './apps/JumarProdukcjaApp/pages/ProductionPage';
import ProductionRollFormPage from './apps/JumarProdukcjaApp/pages/ProductionRollFormPage';
import ReportsPage from './apps/JumarProdukcjaApp/pages/ReportsPage';
import UsersPage from './apps/JumarProdukcjaApp/pages/UsersPage';
import WytOrderedPage from './apps/JumarProdukcjaApp/pages/WytOrderedPage';
import MagazynPage from './apps/JumarMagazynApp/pages/MagazynPage';
import ProtectedRoute from './components/ProtectedRoute';
import RequirePermission from './components/RequirePermission';
import AppSelectorPage from './pages/AppSelectorPage';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/apps" element={<AppSelectorPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/orders/planning"
            element={
              <RequirePermission permission="can_edit_orders">
                <OrdersPlanningPage />
              </RequirePermission>
            }
          />
          <Route
            path="/orders/doing"
            element={
              <RequirePermission permission="can_edit_orders">
                <OrdersDoingPage />
              </RequirePermission>
            }
          />
          <Route
            path="/orders/done-canceled"
            element={
              <RequirePermission permission="can_edit_orders">
                <OrdersDoneCanceledPage />
              </RequirePermission>
            }
          />
          <Route
            path="/add_order"
            element={
              <RequirePermission permission="can_edit_orders">
                <OrderFormPage />
              </RequirePermission>
            }
          />
          <Route path="/orders/new" element={<Navigate to="/add_order" replace />} />
          <Route
            path="/orders/:id"
            element={
              <RequirePermission permission="can_edit_orders">
                <OrderFormPage />
              </RequirePermission>
            }
          />
          <Route
            path="/wyt_ordered"
            element={
              <RequirePermission permission="can_view_reports">
                <WytOrderedPage />
              </RequirePermission>
            }
          />
          <Route
            path="/production"
            element={
              <RequirePermission permission="can_manage_production">
                <ProductionPage />
              </RequirePermission>
            }
          />
          <Route
            path="/production/:id/roll/new"
            element={
              <RequirePermission permission="can_write_rolls">
                <ProductionRollFormPage />
              </RequirePermission>
            }
          />
          <Route
            path="/production/:id/roll/:rollId/edit"
            element={
              <RequirePermission permission="can_write_rolls">
                <ProductionRollFormPage />
              </RequirePermission>
            }
          />
          <Route
            path="/calculator"
            element={
              <RequirePermission permission="can_use_calculator">
                <CalculatorPage />
              </RequirePermission>
            }
          />
          <Route
            path="/reports_workers"
            element={
              <RequirePermission permission="can_view_reports">
                <ReportsPage />
              </RequirePermission>
            }
          />
          <Route
            path="/users"
            element={
              <RequirePermission permission="can_manage_users">
                <UsersPage />
              </RequirePermission>
            }
          />
        </Route>
        <Route path="/magazyn" element={<MagazynPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/apps" />} />
    </Routes>
  );
}

export default App;
