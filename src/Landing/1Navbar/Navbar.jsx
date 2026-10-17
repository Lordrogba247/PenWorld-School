import { useState } from "react";
import "./Navbar.css";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/logo2.png"; // drop your exported Figma logo here

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const scrollToContact = (e) => {
        e.preventDefault();
        setMenuOpen(false);

        if (location.pathname !== "/") {
            navigate("/");
            setTimeout(() => {
                document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        } else {
            document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <header className="navbar">
            <div className="navbar-inner">
                <a href="/" className="navbar-brand">
                    <img src={logo} alt="PenWorld College logo" className="navbar-logo" />
                    <div className="navbar-titles">
                        <span className="navbar-title">PenWorld College</span>
                        <span className="navbar-subtitle">&amp; Primary School</span>
                    </div>
                </a>

                <button
                    className="navbar-toggle"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-label="Toggle menu"
                    aria-expanded={menuOpen}
                >
                    <span />
                    <span />
                    <span />
                </button>

                <nav className={`navbar-nav ${menuOpen ? "is-open" : ""}`}>
                    <ul className="navbar-links">
                        <li><Link to="/about">About</Link></li>
                        <li><Link to="/admissions">Admissions</Link></li>
                        <li><a href="#contact" onClick={scrollToContact}>Contact</a></li>
                    </ul>
                    <Link to="/portal" className="navbar-cta">
                        Portal Login
                    </Link>
                </nav>
            </div>
        </header>
    );
}
