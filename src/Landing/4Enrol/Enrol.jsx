import "./Enrol.css";
import boyImage from '../../assets/boy.png';
import girlImage from '../../assets/girl.png';
import { Link, useNavigate, useLocation } from "react-router-dom";
export default function Enrol() {
    return (
        <section className="enrol">
            <div className="enrol-inner">
                <div className="enrol-content">
                    <h2 className="enrol-heading">
                        Give Your Child/Ward the opportunity to learn in a school
                        defined by excellence, creativity.
                    </h2>

                    <p className="enrol-text">
                        PenWorld College &amp; Primary School is not only an excellent
                        choice but the right foundation for your child's academic and
                        personal growth.
                    </p>

                    <Link to="/admissions" className="enrol-cta">
                        Enrol now <span className="enrol-cta-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 15 15">
                            <path d="M0 0h15v15H0z" fill="none" />
                            <path fill="currentColor" d="M11.5 3a.5.5 0 0 1 .5.5V9l-.01.102a.5.5 0 0 1-.98-.001L11 9V4.707l-6.647 6.647a.5.5 0 0 1-.707-.707L10.293 4H6a.5.5 0 0 1 0-1z" />
                        </svg></span>
                    </Link>
                </div>

                <div className="enrol-collage">
                    <div className="enrol-backdrop enrol-backdrop-red" />
                    <img
                        src={boyImage}
                        alt="PenWorld College student in classroom"
                        className="enrol-photo enrol-photo-1"
                    />

                    <div className="enrol-backdrop enrol-backdrop-navy" />
                    <img
                        src={girlImage}
                        alt="PenWorld College student portrait"
                        className="enrol-photo enrol-photo-2"
                    />
                </div>
            </div>
        </section>
    );
}
