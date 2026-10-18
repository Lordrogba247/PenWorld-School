import "./Footer.css";
import logo from "../../assets/logo3.png"; // same logo used in the Navbar
import { Link } from "react-router-dom";
export default function Footer() {
    return (
        <footer className="footer" id="contact">
            <div className="footer-top">
                {/* Brand + addresses */}
                <div className="footer-col">
                    <div className="footer-brand">
                        <img src={logo} alt="PenWorld College logo" className="footer-logo" />
                        <div className="footer-brand-titles">
                            <span className="footer-brand-title">PenWorld College</span>
                            <span className="footer-brand-subtitle">& Primary School</span>
                        </div>
                    </div>

                    <div className="footer-block">
                        <p className="footer-label">
                            College &amp; Primary School,
                        </p>
                        <p className="footer-text">
                            School address, Ilorin, Kwara
                            State, Nigeria.
                        </p>
                    </div>
                </div>

                {/* Contact + socials */}
                <div className="footer-col">
                    <div className="footer-block">
                        <p className="footer-label">Phone Number</p>
                        <p className="footer-text">
                            <a href="tel:+2348010001111">+234 801 000 1111</a>
                        </p>
                    </div>

                    <div className="footer-block">
                        <p className="footer-label">Email Address:</p>
                        <p className="footer-text">
                            <a href="mailto:schoolname@gmail.com">
                                schoolname@gmail.com
                            </a>
                        </p>
                    </div>

                    <div className="footer-social">
                        <a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noreferrer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                                <path d="M0 0h24v24H0z" fill="none" />
                                <path fill="currentColor" d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396z" />
                            </svg>

                        </a>
                        <a href="https://x.com" aria-label="X (Twitter)" target="_blank" rel="noreferrer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 14 14">
                                <path d="M0 0h14v14H0z" fill="none" />
                                <g fill="none">
                                    <g clip-path="url(#SVGG1Ot4cAD)">
                                        <path fill="currentColor" d="M11.025.656h2.147L8.482 6.03L14 13.344H9.68L6.294 8.909l-3.87 4.435H.275l5.016-5.75L0 .657h4.43L7.486 4.71zm-.755 11.4h1.19L3.78 1.877H2.504z" />
                                    </g>
                                    <defs>
                                        <clipPath id="SVGG1Ot4cAD">
                                            <path fill="#fff" d="M0 0h14v14H0z" />
                                        </clipPath>
                                    </defs>
                                </g>
                            </svg>

                        </a>
                        <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noreferrer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
                                <path d="M0 0h256v256H0z" fill="none" />
                                <path fill="currentColor" d="M128 82a46 46 0 1 0 46 46a46.06 46.06 0 0 0-46-46m0 80a34 34 0 1 1 34-34a34 34 0 0 1-34 34m48-136H80a54.06 54.06 0 0 0-54 54v96a54.06 54.06 0 0 0 54 54h96a54.06 54.06 0 0 0 54-54V80a54.06 54.06 0 0 0-54-54m42 150a42 42 0 0 1-42 42H80a42 42 0 0 1-42-42V80a42 42 0 0 1 42-42h96a42 42 0 0 1 42 42ZM190 76a10 10 0 1 1-10-10a10 10 0 0 1 10 10" />
                            </svg>

                        </a>
                        <a href="https://youtube.com" aria-label="YouTube" target="_blank" rel="noreferrer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                                <path d="M0 0h24v24H0z" fill="none" />
                                <path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="1.5" d="M22.54 6.42a2.77 2.77 0 0 0-1.945-1.957C18.88 4 12 4 12 4s-6.88 0-8.595.463A2.77 2.77 0 0 0 1.46 6.42C1 8.148 1 11.75 1 11.75s0 3.602.46 5.33a2.77 2.77 0 0 0 1.945 1.958C5.121 19.5 12 19.5 12 19.5s6.88 0 8.595-.462a2.77 2.77 0 0 0 1.945-1.958c.46-1.726.46-5.33.46-5.33s0-3.602-.46-5.33ZM9.75 15.021V8.48l5.75 3.271z" />
                            </svg>

                        </a>
                    </div>
                </div>
            </div>

            <div className="footer-divider" />

            <div className="footer-bottom">
                <p className="footer-copyright">
                    © {new Date().getFullYear()} PenWorld College &amp; Primary School
                </p>
                <div className="footer-legal-links">
                    <Link to="/">Privacy Policy</Link>
                    {/* <Link to="/privacy-policy">Privacy Policy</Link> */}
                    <Link to="/">Term of Use</Link>
                    {/* <Link to="/terms-of-use">Term of Use</Link> */}
                </div>
            </div>
        </footer>
    );
}
