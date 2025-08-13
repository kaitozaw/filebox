import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosConfig';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axiosInstance.post('/auth/login', formData);
            login(response.data);
            navigate('/folders');
        } catch (error) {
            alert('Login failed. Please try again.');
        }
    };

    return (
        <div className="max-w-lg mx-auto mt-20 px-6">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                <h1 className="text-3xl font-extrabold tracking-wide text-slate-900 text-center mb-2">Login</h1>
                <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-300"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-300"
                />
                <button type="submit" className="w-full bg-pink-500 text-white px-5 py-2.5 rounded-full hover:bg-pink-700 transition duration-300">
                    Login
                </button>
            </form>
        </div>
    );
};

export default Login;
