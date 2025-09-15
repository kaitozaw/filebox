import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white p-4 flex justify-between items-center shadow-lg">
            <Link to="/" className="text-3xl font-extrabold tracking-wide">Filebox</Link>
            <div className="flex items-center space-x-4">
                {user ? (
                    <>
                        <Link to="/folders" className="mr-4 hover:text-yellow-200 transition duration-300">Folders</Link>
                        <Link to="/recents" className="mr-4 hover:text-yellow-200 transition duration-300">Recents</Link>
                        <Link to="/profile" className="mr-4 hover:text-yellow-200 transition duration-300">Profile</Link>
                        <button
                            onClick={handleLogout}
                            className="bg-pink-500 px-4 py-2 rounded-full hover:bg-pink-700 transition duration-300"
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="mr-4 hover:text-yellow-200 transition duration-300">Login</Link>
                        <Link
                            to="/register"
                            className="bg-green-500 px-4 py-2 rounded-full hover:bg-green-700 transition duration-300"
                        >
                            Register
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
