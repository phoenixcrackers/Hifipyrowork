import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Login from './Login';
import Book from './Book';

const AllRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/booking" element={<Book />} />
      </Route>
    </Routes>
  );
};

export default AllRoutes;
