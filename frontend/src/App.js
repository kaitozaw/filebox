import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Folders from './pages/Folders';
import FileList from './pages/FileList';
import PrivateRoute from './routes/PrivateRoute';
import Recents from './pages/Recents';
import Preview from './pages/Preview';

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="mt-20 text-center">Checking session...</div>;
    }
    
    return (
        <Router>
            <Navbar />
            <Routes>
                <Route path="/" element={user ? <Navigate to="/folders" replace /> : <Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                <Route path="/folders" element={<PrivateRoute><Folders /></PrivateRoute>} />
                <Route path="/files/in-folder/:folderId" element={<PrivateRoute><FileList /></PrivateRoute>} />
                <Route path="/files/:fileId/preview" element={<PrivateRoute><Preview /></PrivateRoute>} />
                <Route path="/recents" element={<PrivateRoute><Recents /></PrivateRoute>} />
            </Routes>
        </Router>
    );
}

export default App;