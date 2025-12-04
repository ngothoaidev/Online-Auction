import { useNavigate } from 'react-router-dom';

export default function Login() {
    const navigate = useNavigate();
    return (
        <div className="flex flex-row h-screen w-full">
            {/* Left Half - Brand Name */}
            <div className="w-1/2 bg-[#120A1F] flex items-center justify-center">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
                    <span className="text-[#E0B84C]">AURUM</span> <span className="text-white">AUCTIONS</span>
                </h1>
            </div>

            {/* Right Half - Login Form */}
            <div className="w-1/2 bg-[#1A1225] flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <h2 className="text-3xl font-bold text-white mb-8">Login</h2>
                    <form className="space-y-6" onSubmit={(e) => {
                        e.preventDefault();
                        navigate('/');
                    }}>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">Email</label>
                            <input 
                                type="email" 
                                placeholder="Enter your email" 
                                className="w-full px-4 py-3 rounded-lg bg-[#120A1F] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E0B84C] transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">Password</label>
                            <input 
                                type="password" 
                                placeholder="Enter your password" 
                                className="w-full px-4 py-3 rounded-lg bg-[#120A1F] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E0B84C] transition-colors"
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="w-full py-3 rounded-lg bg-[#E0B84C] text-[#120A1F] font-semibold hover:brightness-110 transition-all"
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export function Register() {
    const navigate = useNavigate();
    return (
        <div className="flex flex-row h-screen w-full">
            {/* Left Half - Brand Name */}
            <div className="w-1/2 bg-[#120A1F] flex items-center justify-center">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
                    <span className="text-[#E0B84C]">AURUM</span> <span className="text-white">AUCTIONS</span>
                </h1>
            </div>

            {/* Right Half - Register Form */}
            <div className="w-1/2 bg-[#1A1225] flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <h2 className="text-3xl font-bold text-white mb-8">Register</h2>
                    <form className="space-y-6" 
                        onSubmit={(e) => {
                            e.preventDefault();
                            // Handle registration logic here
                            navigate('/');
                        }}
                        >
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">Full Name</label>
                            <input 
                                type="text" 
                                placeholder="Enter your full name" 
                                className="w-full px-4 py-3 rounded-lg bg-[#120A1F] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E0B84C] transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">Email</label>
                            <input
                                type="email" 
                                placeholder="Enter your email" 
                                className="w-full px-4 py-3 rounded-lg bg-[#120A1F] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E0B84C] transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">Password</label>
                            <input 
                                type="password" 
                                placeholder="Enter your password" 
                                className="w-full px-4 py-3 rounded-lg bg-[#120A1F] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E0B84C] transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">Confirm Password</label>
                            <input 
                                type="password" 
                                placeholder="Confirm your password" 
                                className="w-full px-4 py-3 rounded-lg bg-[#120A1F] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E0B84C] transition-colors"
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="w-full py-3 rounded-lg bg-[#E0B84C] text-[#120A1F] font-semibold hover:brightness-110 transition-all"
                        >
                            Register
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}