import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Login from './Login';
import Book from './Book';
import Dealers from './Admin/Dealers';
import Admin from './Admin/Admin';
import Protected from './Protected';
import Report from './Admin/Report';
import StockIn from './Admin/StockIn';
import Direct from './Admin/Direct'
import Localcustomer from './Admin/Localcustomer';
import Ledger from './Admin/Ledger';
import Dispatch from './Admin/Dipatch';
import Tracking from './Admin/Tracking';
import PendingPayments from './Admin/PendingPayments';
import Quotation from './Admin/Quotation';
import Receipt from './Admin/Receipt';

const AllRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<Admin />} />

      <Route element={<Protected />}>
        <Route path="/dealers" element={<Dealers />} />
        <Route path="/report" element={<Report />} />
        <Route path="/stock" element={<StockIn />} />
        <Route path="/direct-customer" element={<Localcustomer />} />
        <Route path="/direct-enquiry" element={<Direct />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/dispatch" element={<Dispatch />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/pending" element={<PendingPayments />} />
        <Route path="/quotation" element={<Quotation />} />
        <Route path="/receipt" element={<Receipt />} />
      </Route>
      
      <Route element={<ProtectedRoute />}>
        <Route path="/booking" element={<Book />} />
      </Route>
    </Routes>
  );
};

export default AllRoutes;
