import "./Terms.css";

export default function Terms() {
    return (
        <main className="terms">
            <div className="terms-container">
                <h1 className="terms-title">Term of Use</h1>
                <p className="terms-effective">Effective Date: 15th June, 2026</p>

                <p className="terms-intro">
                    Welcome to the PenWorld College website and student portal. By
                    accessing or using our website, CBT system, or result-checking
                    portal, you agree to comply with these Terms of Use.
                </p>

                <section className="terms-section">
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By using this website, you agree to be bound by these Terms. If
                        you do not agree, please do not use the platform.
                    </p>
                </section>

                <section className="terms-section">
                    <h2>2. Use of the Website</h2>
                    <p>The website is intended for:</p>
                    <ul>
                        <li>Students</li>
                        <li>Parents/guardians</li>
                        <li>Staff and authorized administrators</li>
                    </ul>
                    <p>Users must use the platform responsibly and only for educational purposes.</p>
                </section>

                <section className="terms-section">
                    <h2>3. Student CBT and Examination Rules</h2>
                    <p>Users agree that:</p>
                    <ul>
                        <li>CBT exams must be taken honestly without cheating or malpractice</li>
                        <li>Any attempt to manipulate scores or system integrity is prohibited</li>
                        <li>The school reserves the right to invalidate results obtained through misconduct</li>
                    </ul>
                </section>

                <section className="terms-section">
                    <h2>4. Result Checking</h2>
                    <ul>
                        <li>Results displayed on the portal are for academic reference only</li>
                        <li>Official results remain subject to school verification and approval</li>
                        <li>Errors in result display should be reported immediately</li>
                    </ul>
                </section>

                <section className="terms-section">
                    <h2>5. User Accounts</h2>
                    <ul>
                        <li>Users must keep login details confidential</li>
                        <li>The school is not responsible for unauthorized access due to user negligence</li>
                        <li>Accounts may be suspended for suspicious activity</li>
                    </ul>
                </section>

                <section className="terms-section">
                    <h2>6. Intellectual Property</h2>
                    <p>
                        All content on this website, including logos, text, exam
                        materials, and software, belongs to PenWorld College unless
                        otherwise stated. Users may not copy or distribute materials
                        without permission.
                    </p>
                </section>

                <section className="terms-section">
                    <h2>7. Limitation of Liability</h2>
                    <p>PenWorld College is not liable for:</p>
                    <ul>
                        <li>Temporary website downtime</li>
                        <li>Technical errors during CBT exams</li>
                        <li>Loss of data due to internet or device issues</li>
                        <li>Unauthorized access caused by user negligence</li>
                    </ul>
                </section>

                <section className="terms-section">
                    <h2>8. Website Availability</h2>
                    <p>We strive to ensure continuous access but may suspend the website temporarily for:</p>
                    <ul>
                        <li>Maintenance</li>
                        <li>Updates</li>
                        <li>Security improvements</li>
                    </ul>
                </section>

                <section className="terms-section">
                    <h2>9. Modification of Terms</h2>
                    <p>
                        PenWorld College reserves the right to update these Terms at any
                        time. Continued use of the website implies acceptance of the
                        updated terms.
                    </p>
                </section>

                <section className="terms-section">
                    <h2>10. Contact Information</h2>
                    <p>For inquiries or complaints:</p>

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
