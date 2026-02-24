import '../styles/Login.css';
import React from "react";
import userIcon from "../assets/User.png";
import lockIcon from "../assets/Lock.png";

const Login: React.FC = () => {
    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="profile-icon">
                        <img src={userIcon} alt="User Icon" />
                    </div>
                    <h1 className="login-title">Login</h1>
                </div>

                <div className="input-group">
                    <span className="input-icon">
  <img src={userIcon} alt="User" />
</span>
                    <input type="text" placeholder="Username" />
                </div>

                <div className="input-group">
                    <span className="input-icon">
  <img src={lockIcon} alt="Lock" />
</span>
                    <input type="password" placeholder="Password" />
                </div>

                <div className="remember-row">
                    <input type="checkbox" id="remember" />
                    <label htmlFor="remember">Remember me</label>
                </div>

                <div className="button-row">
                    <button className="btn-primary">Login</button>
                    <button className="btn-secondary">Sign up</button>
                </div>

                <p className="forgot-text">Forget Username / Password?</p>
            </div>
        </div>
    );
};

export default Login;