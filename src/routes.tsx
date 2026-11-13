import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AccountLayout } from './components/layout/AccountLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { RequireAuth, RequireStaff } from './components/auth/RouteGuards';
import { Skeleton } from './components/ui/Primitives';

const HomePage = lazy(() => import('./pages/public/HomePage').then((m) => ({ default: m.HomePage })));
const BikesCatalogPage = lazy(() =>
  import('./pages/public/BikesCatalogPage').then((m) => ({ default: m.BikesCatalogPage }))
);
const BikeDetailPage = lazy(() =>
  import('./pages/public/BikeDetailPage').then((m) => ({ default: m.BikeDetailPage }))
);
const ComparePage = lazy(() =>
  import('./pages/public/ComparePage').then((m) => ({ default: m.ComparePage }))
);
const EmiCalculatorPage = lazy(() =>
  import('./pages/public/EmiCalculatorPage').then((m) => ({ default: m.EmiCalculatorPage }))
);
const FindPerfectBikePage = lazy(() =>
  import('./pages/public/FindPerfectBikePage').then((m) => ({ default: m.FindPerfectBikePage }))
);
const NewsListPage = lazy(() =>
  import('./pages/public/NewsPages').then((m) => ({ default: m.NewsListPage }))
);
const NewsDetailPage = lazy(() =>
  import('./pages/public/NewsPages').then((m) => ({ default: m.NewsDetailPage }))
);
const BookBikePage = lazy(() =>
  import('./pages/public/BookBikePage').then((m) => ({ default: m.BookBikePage }))
);
const TestRidePage = lazy(() =>
  import('./pages/public/TestRidePage').then((m) => ({ default: m.TestRidePage }))
);
const InquiryPage = lazy(() =>
  import('./pages/public/InquiryPage').then((m) => ({ default: m.InquiryPage }))
);
const TradeInPage = lazy(() =>
  import('./pages/public/TradeInPage').then((m) => ({ default: m.TradeInPage }))
);
const AccessoriesPage = lazy(() =>
  import('./pages/public/AccessoriesPage').then((m) => ({ default: m.AccessoriesPage }))
);
const AccessoryDetailPage = lazy(() =>
  import('./pages/public/AccessoryDetailPage').then((m) => ({ default: m.AccessoryDetailPage }))
);
const CartPage = lazy(() =>
  import('./pages/public/CartPage').then((m) => ({ default: m.CartPage }))
);
const CheckoutPage = lazy(() =>
  import('./pages/public/CheckoutPage').then((m) => ({ default: m.CheckoutPage }))
);
const OrderConfirmationPage = lazy(() =>
  import('./pages/public/OrderConfirmationPage').then((m) => ({ default: m.OrderConfirmationPage }))
);
const ServiceBookingPage = lazy(() =>
  import('./pages/public/ServiceBookingPage').then((m) => ({ default: m.ServiceBookingPage }))
);
const StaticContentPage = lazy(() =>
  import('./pages/public/StaticContentPages').then((m) => ({ default: m.StaticContentPage }))
);
const BranchesPage = lazy(() =>
  import('./pages/public/StaticContentPages').then((m) => ({ default: m.BranchesPage }))
);
const FaqPage = lazy(() =>
  import('./pages/public/StaticContentPages').then((m) => ({ default: m.FaqPage }))
);
const ContactPage = lazy(() =>
  import('./pages/public/StaticContentPages').then((m) => ({ default: m.ContactPage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/public/StaticContentPages').then((m) => ({ default: m.NotFoundPage }))
);
const LoginPage = lazy(() =>
  import('./pages/public/AuthPages').then((m) => ({ default: m.LoginPage }))
);
const SignupPage = lazy(() =>
  import('./pages/public/AuthPages').then((m) => ({ default: m.SignupPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('./pages/public/AuthPages').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('./pages/public/AuthPages').then((m) => ({ default: m.ResetPasswordPage }))
);

// Customer account pages
const AccountOverviewPage = lazy(() =>
  import('./pages/account/AccountOverviewPage').then((m) => ({ default: m.AccountOverviewPage }))
);
const AccountBookingsPage = lazy(() =>
  import('./pages/account/AccountBookingsPages').then((m) => ({ default: m.AccountBookingsPage }))
);
const AccountBookingDetailPage = lazy(() =>
  import('./pages/account/AccountBookingsPages').then((m) => ({ default: m.AccountBookingDetailPage }))
);
const AccountOrdersPage = lazy(() =>
  import('./pages/account/AccountOrdersPages').then((m) => ({ default: m.AccountOrdersPage }))
);
const AccountOrderDetailPage = lazy(() =>
  import('./pages/account/AccountOrdersPages').then((m) => ({ default: m.AccountOrderDetailPage }))
);
const AccountInquiriesPage = lazy(() =>
  import('./pages/account/AccountEngagementPages').then((m) => ({ default: m.AccountInquiriesPage }))
);
const AccountTestRidesPage = lazy(() =>
  import('./pages/account/AccountEngagementPages').then((m) => ({ default: m.AccountTestRidesPage }))
);
const AccountServicePage = lazy(() =>
  import('./pages/account/AccountEngagementPages').then((m) => ({ default: m.AccountServicePage }))
);
const AccountWishlistPage = lazy(() =>
  import('./pages/account/AccountEngagementPages').then((m) => ({ default: m.AccountWishlistPage }))
);
const AccountComparisonsPage = lazy(() =>
  import('./pages/account/AccountEngagementPages').then((m) => ({ default: m.AccountComparisonsPage }))
);
const AccountLoyaltyPage = lazy(() =>
  import('./pages/account/AccountEngagementPages').then((m) => ({ default: m.AccountLoyaltyPage }))
);
const AccountProfilePage = lazy(() =>
  import('./pages/account/AccountProfilePages').then((m) => ({ default: m.AccountProfilePage }))
);
const AccountAddressesPage = lazy(() =>
  import('./pages/account/AccountProfilePages').then((m) => ({ default: m.AccountAddressesPage }))
);

// Admin pages
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminBikesPage = lazy(() =>
  import('./pages/admin/AdminCatalogPages').then((m) => ({ default: m.AdminBikesPage }))
);
const AdminBikeEditorPage = lazy(() =>
  import('./pages/admin/AdminCatalogPages').then((m) => ({ default: m.AdminBikeEditorPage }))
);
const AdminStockPage = lazy(() =>
  import('./pages/admin/AdminCatalogPages').then((m) => ({ default: m.AdminStockPage }))
);
const AdminAccessoriesPage = lazy(() =>
  import('./pages/admin/AdminCatalogPages').then((m) => ({ default: m.AdminAccessoriesPage }))
);
const AdminAccessoryEditorPage = lazy(() =>
  import('./pages/admin/AdminCatalogPages').then((m) => ({ default: m.AdminAccessoryEditorPage }))
);
const AdminBookingsPage = lazy(() =>
  import('./pages/admin/AdminSalesPages').then((m) => ({ default: m.AdminBookingsPage }))
);
const AdminBookingDetailPage = lazy(() =>
  import('./pages/admin/AdminSalesPages').then((m) => ({ default: m.AdminBookingDetailPage }))
);
const AdminInquiriesPage = lazy(() =>
  import('./pages/admin/AdminSalesPages').then((m) => ({ default: m.AdminInquiriesPage }))
);
const AdminTestRidesPage = lazy(() =>
  import('./pages/admin/AdminSalesPages').then((m) => ({ default: m.AdminTestRidesPage }))
);
const AdminTradeInsPage = lazy(() =>
  import('./pages/admin/AdminSalesPages').then((m) => ({ default: m.AdminTradeInsPage }))
);
const AdminOrdersPage = lazy(() =>
  import('./pages/admin/AdminOperationsPages').then((m) => ({ default: m.AdminOrdersPage }))
);
const AdminOrderDetailPage = lazy(() =>
  import('./pages/admin/AdminOperationsPages').then((m) => ({ default: m.AdminOrderDetailPage }))
);
const AdminPaymentsPage = lazy(() =>
  import('./pages/admin/AdminOperationsPages').then((m) => ({ default: m.AdminPaymentsPage }))
);
const AdminReturnsPage = lazy(() =>
  import('./pages/admin/AdminOperationsPages').then((m) => ({ default: m.AdminReturnsPage }))
);
const AdminServicePage = lazy(() =>
  import('./pages/admin/AdminOperationsPages').then((m) => ({ default: m.AdminServicePage }))
);
const AdminCustomersPage = lazy(() =>
  import('./pages/admin/AdminOperationsPages').then((m) => ({ default: m.AdminCustomersPage }))
);
const AdminCustomerDetailPage = lazy(() =>
  import('./pages/admin/AdminOperationsPages').then((m) => ({ default: m.AdminCustomerDetailPage }))
);
const AdminBannersPage = lazy(() =>
  import('./pages/admin/AdminContentPages').then((m) => ({ default: m.AdminBannersPage }))
);
const AdminOffersPage = lazy(() =>
  import('./pages/admin/AdminContentPages').then((m) => ({ default: m.AdminOffersPage }))
);
const AdminNewsPage = lazy(() =>
  import('./pages/admin/AdminContentPages').then((m) => ({ default: m.AdminNewsPage }))
);
const AdminFaqsPage = lazy(() =>
  import('./pages/admin/AdminContentPages').then((m) => ({ default: m.AdminFaqsPage }))
);
const AdminPagesPage = lazy(() =>
  import('./pages/admin/AdminContentPages').then((m) => ({ default: m.AdminPagesPage }))
);
const AdminBranchesPage = lazy(() =>
  import('./pages/admin/AdminContentPages').then((m) => ({ default: m.AdminBranchesPage }))
);
const AdminCouponsPage = lazy(() =>
  import('./pages/admin/AdminContentPages').then((m) => ({ default: m.AdminCouponsPage }))
);
const AdminDeliveryZonesPage = lazy(() =>
  import('./pages/admin/AdminContentPages').then((m) => ({ default: m.AdminDeliveryZonesPage }))
);
const AdminReportsPage = lazy(() =>
  import('./pages/admin/AdminSystemPages').then((m) => ({ default: m.AdminReportsPage }))
);
const AdminSettingsPage = lazy(() =>
  import('./pages/admin/AdminSystemPages').then((m) => ({ default: m.AdminSettingsPage }))
);
const AdminStaffPage = lazy(() =>
  import('./pages/admin/AdminSystemPages').then((m) => ({ default: m.AdminStaffPage }))
);
const AdminAuditLogPage = lazy(() =>
  import('./pages/admin/AdminSystemPages').then((m) => ({ default: m.AdminAuditLogPage }))
);

function RouteFallback() {
  return (
    <div className="mx-auto max-w-[1140px] px-4 sm:px-6 py-10 space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/bikes" element={<BikesCatalogPage />} />
          <Route path="/bikes/:slug" element={<BikeDetailPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/emi-calculator" element={<EmiCalculatorPage />} />
          <Route path="/find-your-perfect-bike" element={<FindPerfectBikePage />} />
          <Route path="/book/:bikeSlug" element={<BookBikePage />} />
          <Route path="/test-ride" element={<TestRidePage />} />
          <Route path="/trade-in" element={<TradeInPage />} />
          <Route path="/inquiry" element={<InquiryPage />} />
          <Route path="/accessories" element={<AccessoriesPage />} />
          <Route path="/accessories/:slug" element={<AccessoryDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmationPage />} />
          <Route path="/service-booking" element={<ServiceBookingPage />} />
          <Route path="/news" element={<NewsListPage />} />
          <Route path="/news/:slug" element={<NewsDetailPage />} />
          <Route path="/about" element={<StaticContentPage slug="about" />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/branches" element={<BranchesPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/privacy-policy" element={<StaticContentPage slug="privacy-policy" />} />
          <Route path="/terms" element={<StaticContentPage slug="terms" />} />
          <Route path="/return-policy" element={<StaticContentPage slug="return-policy" />} />
          <Route
            path="/warranty-service-policy"
            element={<StaticContentPage slug="warranty-service-policy" />}
          />
          <Route path="/disclaimer" element={<StaticContentPage slug="disclaimer" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Customer Account */}
        <Route
          path="/account"
          element={
            <RequireAuth>
              <AccountLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AccountOverviewPage />} />
          <Route path="bookings" element={<AccountBookingsPage />} />
          <Route path="bookings/:bookingNumber" element={<AccountBookingDetailPage />} />
          <Route path="inquiries" element={<AccountInquiriesPage />} />
          <Route path="test-rides" element={<AccountTestRidesPage />} />
          <Route path="orders" element={<AccountOrdersPage />} />
          <Route path="orders/:orderNumber" element={<AccountOrderDetailPage />} />
          <Route path="service" element={<AccountServicePage />} />
          <Route path="wishlist" element={<AccountWishlistPage />} />
          <Route path="comparisons" element={<AccountComparisonsPage />} />
          <Route path="loyalty" element={<AccountLoyaltyPage />} />
          <Route path="profile" element={<AccountProfilePage />} />
          <Route path="addresses" element={<AccountAddressesPage />} />
        </Route>

        {/* Admin Authentication */}
        <Route path="/admin/login" element={<LoginPage adminMode />} />

        {/* Admin Console */}
        <Route
          path="/admin"
          element={
            <RequireStaff>
              <AdminLayout />
            </RequireStaff>
          }
        >
          <Route
            index
            element={
              <RequireStaff module="dashboard">
                <AdminDashboardPage />
              </RequireStaff>
            }
          />
          <Route
            path="bikes"
            element={
              <RequireStaff module="bikes">
                <AdminBikesPage />
              </RequireStaff>
            }
          />
          <Route
            path="bikes/new"
            element={
              <RequireStaff module="bikes">
                <AdminBikeEditorPage />
              </RequireStaff>
            }
          />
          <Route
            path="bikes/:id"
            element={
              <RequireStaff module="bikes">
                <AdminBikeEditorPage />
              </RequireStaff>
            }
          />
          <Route
            path="stock"
            element={
              <RequireStaff module="stock">
                <AdminStockPage />
              </RequireStaff>
            }
          />
          <Route
            path="accessories"
            element={
              <RequireStaff module="accessories">
                <AdminAccessoriesPage />
              </RequireStaff>
            }
          />
          <Route
            path="accessories/new"
            element={
              <RequireStaff module="accessories">
                <AdminAccessoryEditorPage />
              </RequireStaff>
            }
          />
          <Route
            path="accessories/:id"
            element={
              <RequireStaff module="accessories">
                <AdminAccessoryEditorPage />
              </RequireStaff>
            }
          />
          <Route
            path="bookings"
            element={
              <RequireStaff module="bookings">
                <AdminBookingsPage />
              </RequireStaff>
            }
          />
          <Route
            path="bookings/:id"
            element={
              <RequireStaff module="bookings">
                <AdminBookingDetailPage />
              </RequireStaff>
            }
          />
          <Route
            path="inquiries"
            element={
              <RequireStaff module="inquiries">
                <AdminInquiriesPage />
              </RequireStaff>
            }
          />
          <Route
            path="test-rides"
            element={
              <RequireStaff module="test_rides">
                <AdminTestRidesPage />
              </RequireStaff>
            }
          />
          <Route
            path="trade-ins"
            element={
              <RequireStaff module="trade_ins">
                <AdminTradeInsPage />
              </RequireStaff>
            }
          />
          <Route
            path="service-appointments"
            element={
              <RequireStaff module="service">
                <AdminServicePage />
              </RequireStaff>
            }
          />
          <Route
            path="orders"
            element={
              <RequireStaff module="orders">
                <AdminOrdersPage />
              </RequireStaff>
            }
          />
          <Route
            path="orders/:id"
            element={
              <RequireStaff module="orders">
                <AdminOrderDetailPage />
              </RequireStaff>
            }
          />
          <Route
            path="payments"
            element={
              <RequireStaff module="payments">
                <AdminPaymentsPage />
              </RequireStaff>
            }
          />
          <Route
            path="returns"
            element={
              <RequireStaff module="returns">
                <AdminReturnsPage />
              </RequireStaff>
            }
          />
          <Route
            path="customers"
            element={
              <RequireStaff module="customers">
                <AdminCustomersPage />
              </RequireStaff>
            }
          />
          <Route
            path="customers/:id"
            element={
              <RequireStaff module="customers">
                <AdminCustomerDetailPage />
              </RequireStaff>
            }
          />
          <Route
            path="banners"
            element={
              <RequireStaff module="content">
                <AdminBannersPage />
              </RequireStaff>
            }
          />
          <Route
            path="offers"
            element={
              <RequireStaff module="content">
                <AdminOffersPage />
              </RequireStaff>
            }
          />
          <Route
            path="news"
            element={
              <RequireStaff module="content">
                <AdminNewsPage />
              </RequireStaff>
            }
          />
          <Route
            path="faqs"
            element={
              <RequireStaff module="content">
                <AdminFaqsPage />
              </RequireStaff>
            }
          />
          <Route
            path="pages"
            element={
              <RequireStaff module="content">
                <AdminPagesPage />
              </RequireStaff>
            }
          />
          <Route
            path="branches"
            element={
              <RequireStaff module="content">
                <AdminBranchesPage />
              </RequireStaff>
            }
          />
          <Route
            path="coupons"
            element={
              <RequireStaff module="content">
                <AdminCouponsPage />
              </RequireStaff>
            }
          />
          <Route
            path="delivery-zones"
            element={
              <RequireStaff module="content">
                <AdminDeliveryZonesPage />
              </RequireStaff>
            }
          />
          <Route
            path="reports"
            element={
              <RequireStaff module="reports">
                <AdminReportsPage />
              </RequireStaff>
            }
          />
          <Route
            path="settings"
            element={
              <RequireStaff module="settings">
                <AdminSettingsPage />
              </RequireStaff>
            }
          />
          <Route
            path="staff"
            element={
              <RequireStaff module="staff">
                <AdminStaffPage />
              </RequireStaff>
            }
          />
          <Route
            path="audit-log"
            element={
              <RequireStaff module="audit_log">
                <AdminAuditLogPage />
              </RequireStaff>
            }
          />
        </Route>

        {/* Fallback 404 */}
        <Route element={<PublicLayout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
