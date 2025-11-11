import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default";
import { Spinner } from "./components/ui/spinner";

// Import critical pages normally (shown immediately)
import AuthCallback from "./pages/auth/Callback";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load all other pages for better performance
const Dashboard = lazy(() => import("./pages/dashboard/page"));
const Revenues = lazy(() => import("./pages/revenues/page"));
const Expenses = lazy(() => import("./pages/expenses/page"));
const Bonus = lazy(() => import("./pages/bonus/page"));
const EmployeeRequests = lazy(() => import("./pages/employee-requests/page"));
const MyRequests = lazy(() => import("./pages/my-requests/page"));
const ManageRequests = lazy(() => import("./pages/manage-requests/page"));
const ProductOrders = lazy(() => import("./pages/product-orders/page"));
const Migration = lazy(() => import("./pages/migration"));
const BackupsPage = lazy(() => import("./pages/backups/page"));
const AIAssistant = lazy(() => import("./pages/ai-assistant/page"));
const SystemSupport = lazy(() => import("./pages/system-support/page"));
const Employees = lazy(() => import("./pages/employees/page"));
const AdvancesDeductions = lazy(() => import("./pages/advances-deductions/page"));
const Payroll = lazy(() => import("./pages/payroll/page"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-4">
        <Spinner size="lg" className="text-primary-500" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 animate-pulse">
          جارٍ التحميل...
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/revenues" element={<Revenues />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/bonus" element={<Bonus />} />
            <Route path="/employee-requests" element={<EmployeeRequests />} />
            <Route path="/my-requests" element={<MyRequests />} />
            <Route path="/manage-requests" element={<ManageRequests />} />
            <Route path="/product-orders" element={<ProductOrders />} />
            <Route path="/migration" element={<Migration />} />
            <Route path="/backups" element={<BackupsPage />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/system-support" element={<SystemSupport />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/advances-deductions" element={<AdvancesDeductions />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DefaultProviders>
  );
}
