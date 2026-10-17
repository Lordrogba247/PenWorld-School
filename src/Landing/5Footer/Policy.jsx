import "./Policy.css";

export default function Policy() {
    return (
        <main className="terms">
            <div className="terms-container">
                <h1 className="terms-title">Privacy Policy</h1>
                <p className="terms-effective">Effective Date: 15th June, 2026</p>

                <p className="terms-intro">
                    PenWorld College ("we," "our," or "us") is committed to protecting
                    the privacy of students, parents, guardians, staff, and all users
                    of our website and online services, including our CBT examination
                    and result portal.
                </p>

                <p className="terms-intro">
                    This Privacy Policy explains how we collect, use, and protect your
                    information when you use our website and digital services.
                </p>

                <section className="terms-section">
                    <h2>1. Information We Collect</h2>
                    <p>We may collect the following information:</p>

                    <p className="terms-subheading">a. Personal Information</p>
                    <ul>
                        <li>Student full name</li>
                        <li>Admission number or registration ID</li>
                        <li>Class and academic records</li>
                        <li>Parent/guardian contact details</li>
                        <li>Email address and phone number</li>
                        <li>Login credentials for portal access</li>
                    </ul>

                    <p className="terms-subheading">b. Academic Information</p>
                    <ul>
                        <li>CBT test results and scores</li>
                        <li>Continuous assessment records</li>
                        <li>Examination performance data</li>
                    </ul>

                    <p className="terms-subheading">c. Technical Information</p>
                    <ul>
                        <li>IP address</li>
                        <li>Device type and browser</li>
                        <li>Portal usage logs and activity</li>
                    </ul>
                </section>

                <section className="terms-section">
                    <h2>2. How We Use Your Information</h2>
                    <p>We use collected information to:</p>
                    <ul>
                        <li>Administer CBT examinations and assessments</li>
                        <li>Provide access to student results</li>
                        <li>Manage academic records</li>
                        <li>Communicate important school updates</li>
                        <li>Improve our website and digital services</li>
                        <li>Ensure security of the portal</li>
                    </ul>
                </section>

                <section className="terms-section">
                    <h2>3. Data Protection and Security</h2>
                    <p>
                        We take appropriate security measures to protect your personal
                        data from unauthorized access, alteration, disclosure, or
                        destruction. However, no online system is completely secure,
                        and users are encouraged to keep login details confidential.
                    </p>
                </section>

                <section className="terms-section">
                    <h2>4. Sharing of Information</h2>
                    <p>We do not sell or rent personal information.</p>
                    <p>We may share data only:</p>
                    <ul>
                        <li>With authorized school staff and exam administrators</li>
                        <li>When required by law or government authorities</li>
                        <li>With approved educational service providers supporting our systems</li>
                    </ul>
                </section>

                <section className="terms-section">
                    <h2>5. Student Portal Access</h2>
                    <p>
                        Users are responsible for maintaining the confidentiality of
                        their login details. Any activity carried out under a user's
                        account is the responsibility of the account holder.
                    </p>
                </section>

                <section className="terms-section">
                    <h2>6. Cookies and Usage Tracking</h2>
                    <p>
                        Our website may use cookies to improve user experience, track
                        performance, and enhance portal functionality.
                    </p>
                </section>

                <section className="terms-section">
                    <h2>7. Children's Privacy</h2>
                    <p>
                        We collect information for educational purposes under the
                        supervision of parents/guardians and school authority. We do
                        not knowingly collect data from students outside academic
                        needs.
                    </p>
                </section>

                <section className="terms-section">
                    <h2>8. Contact Information</h2>
                    <p>For questions about this Privacy Policy, please contact:</p>

                    <p className="terms-address-label">PenWorld College &amp; Primary School, Gaa-Akanbi Address</p>
                    <p>
                        No 84, Gaa-Akanbi Road, Behind Erin-Ile Junction, Ilorin, Kwara
                        State, Nigeria (College &amp; Primary School)
                    </p>

                    <p className="terms-address-label">PenWorld College Amoyo Address</p>
                    <p>Redemption Road, Gbagede, Amoyo, Kwara State, Nigeria (College Only)</p>

                    <p className="terms-contact-line">
                        Email: <a href="mailto:PenWorldglobal@gmail.com">PenWorldglobal@gmail.com</a>
                    </p>
                    <p className="terms-contact-line">
                        Phone Number: <a href="tel:+2348038607740">+234 803 860 7740</a>
                    </p>
                </section>
            </div>
        </main>
    );
}
