import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Login from './Login';
import Book from './Book';
import Dealers from './Admin/Dealers';
import Admin from './Admin/Admin';
import Protected from './Protected';
import Report from './Admin/Report';

const AllRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<Admin />} />

      <Route element={<Protected />}>
        <Route path="/dealers" element={<Dealers />} />
        <Route path="/report" element={<Report />} />
      </Route>
      
      <Route element={<ProtectedRoute />}>
        <Route path="/booking" element={<Book />} />
      </Route>
    </Routes>
  );
};

export default AllRoutes;
