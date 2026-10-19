import "./About.css";
import groupPhoto1 from "../../assets/group2.jpeg";
import groupPhoto2 from "../../assets/group1.jpeg";
import proprietorPhoto from "../../assets/oga1.jpeg";

export default function About() {
    return (
        <main className="about">
            <div className="about-container">
                <h1 className="about-title">
                    ABOUT THE <span className="about-title-accent">SCHOOL</span>
                </h1>

                <div className="about-top">
                    <div className="about-top-text">
                        <p>
                            PenWorld College was founded in April 2014 by Mr. and Mrs.
                            John Doe with a clear vision to cultivate God-fearing,
                            disciplined, and academically excellent leaders who will
                            serve God and humanity. The school was established to
                            nurture students into diligent, hardworking individuals
                            equipped with strong academic foundations and the values
                            needed to become solution providers in society.
                        </p>
                        <p>
                            The college officially commenced operations on October 15,
                            2014, beginning its journey at PenWorld International
                            School, Ilorin, with just thirteen students
                            and a committed team of four staff members under the
                            leadership of Principal Mr. Lorem Ipsom. By 2015,
                            the school had begun participating successfully in WAEC
                            and NECO examinations, marking a strong start in external
                            academic performance.
                        </p>
                    </div>

                    <div className="about-top-images">
                        <img src={groupPhoto2} alt="PenWorld College students group photo" />
                        <img src={groupPhoto1} alt="PenWorld College students event photo" />
                    </div>
                </div>

                <div className="about-middle">
                    <div className="about-proprietor-col">
                        <img
                            src={proprietorPhoto}
                            alt="Mr. David Mobolaji, Proprietor"
                            className="about-proprietor-photo"
                        />
                        <div className="about-proprietor-caption">
                            <p className="about-proprietor-name">Mr. John Doe</p>
                            <p className="about-proprietor-role">
                                Proprietor, PenWorld College &amp; Primary School
                            </p>
                        </div>
                    </div>

                    <div className="about-middle-text">
                        <p>
                            In September 2015, approval was granted by inspectors
                            from the Ministry of Education for the conduct of WASSCE
                            and NECO Senior Examinations, further strengthening the
                            institution's credibility. Since then, PenWorld College
                            has consistently recorded excellent results in both
                            state and SSCE examinations, reflecting its commitment
                            to academic excellence and character development.
                        </p>
                        <p>
                            Guided by the vision of its proprietor, John Doe,
                            PenWorld College continues to uphold a nurturing
                            environment where students are encouraged to unlock
                            their potential, embrace challenges, and grow into
                            confident leaders. The school remains dedicated to
                            building a community where creativity, collaboration,
                            and critical thinking thrive, empowering every student
                            to become a "hero" in their own story.
                        </p>
                        <p>
                            At PenWorld College, we remain committed to shaping lives
                            for excellence, service, and lasting impact—all for the
                            glory of God.
                        </p>
                    </div>
                </div>

                <div className="about-divider" />

                <div className="about-mv">
                    <div className="about-mv-item">
                        <div className="about-mv-icon about-mv-icon-mission">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                                <path d="M0 0h24v24H0z" fill="none" />
                                <path fill="currentColor" d="m18.003 13.068l2.26-2.261A9 9 0 0 0 22.9 4.443V1.1h-3.343a9 9 0 0 0-6.364 2.636l-2.261 2.26l-5.657-.707L1.04 9.524L14.475 22.96l4.235-4.235zm-1.792 1.791l.393 3.143l-2.129 2.129l-1.768-1.768zm-7.07-7.071l-3.505 3.504L3.87 9.524l2.129-2.129zm-3.505 9.16l-3.535 3.536L.687 19.07l3.535-3.535zm2.829 2.83l-3.536 3.535l-1.414-1.414l3.535-3.536z" />
                            </svg>

                        </div>
                        <div>
                            <h2>Our Mission</h2>
                            <p>
                                To provide quality education that shapes character,
                                inspires purpose, and empowers students to serve God
                                and humanity.
                            </p>
                        </div>
                    </div>

                    <div className="about-mv-item">
                        <div className="about-mv-icon about-mv-icon-vision">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
                                <circle cx="12" cy="12" r="3.2" />
                            </svg>
                        </div>
                        <div>
                            <h2>Our Vision</h2>
                            <p>
                                To raise a generation of PenWorld—faith-driven,
                                compassionate, and committed to making a positive
                                impact in the world.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
