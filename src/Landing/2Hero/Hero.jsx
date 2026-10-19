import "./Hero.css";
// Add these imports at the very top of your component file
import PenWorldImage from '../../assets/heroesimage1.png';
import { Link } from "react-router-dom";
export default function Hero() {
    return (
        <section className="hero">
            <div className="hero-inner">
                <div className="hero-content">
                    <h1 className="hero-heading">
                        Committed <span className="hero-heading-accent">to</span>
                        <br />
                        Excellence
                    </h1>

                    <p className="hero-text">
                        PenWorld Schools foster academic, spiritual, and social growth.
                        From Nursery to Secondary, we provide a strong foundation in
                        faith and learning. Our goal is to raise students who serve both
                        God and humanity. Excellence in all aspects of life is our
                        guiding principle.
                    </p>

                    <Link to="/about" className="hero-cta">
                        Read more <span className="hero-cta-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 15 15">
                            <path d="M0 0h15v15H0z" fill="none" />
                            <path fill="currentColor" d="M11.5 3a.5.5 0 0 1 .5.5V9l-.01.102a.5.5 0 0 1-.98-.001L11 9V4.707l-6.647 6.647a.5.5 0 0 1-.707-.707L10.293 4H6a.5.5 0 0 1 0-1z" />
                        </svg>
                        </span>
                    </Link>
                </div>

                <div className="hero-collage">
                    {/* The single flattened collage photo (already cut into the bolt shape in Figma) */}
                    <img
                        src={PenWorldImage}
                        alt="PenWorld College students and campus life"
                        className="hero-img-main"
                    />
                </div>
            </div>
        </section>
    );
}

