import "./Admissions.css";

export default function Admissions() {
    return (
        <main className="admissions">
            <div className="admissions-container">
                <h1 className="admissions-title">Admission Procedure</h1>

                <p className="admissions-intro">The available classes are:</p>
                <ul className="admissions-intro-list">
                    <li>Creche; Nursery Classes and Primary 1-5</li>
                    <li>Jss 1-3 and SSS 1-3</li>
                </ul>

                <p className="admissions-subintro">
                    Admission Instructions for PenWorld College &amp; Primary School
                </p>

                <section className="admissions-section">
                    <h2>Admission Procedure</h2>
                    <ol>
                        <li>Obtain and complete the school's admission form from the administration office or online.</li>
                        <li>
                            Submit the completed form along with the following documents:
                            <ul>
                                <li>Two passport-sized photographs of the student.</li>
                                <li>Copy of the student's birth certificate.</li>
                                <li>Previous academic records (if applicable).</li>
                                <li>Medical fitness certificate from a recognized health institution.</li>
                            </ul>
                        </li>
                        <li>Pay the non-refundable admission form fee of N4,000. Proof of payment must be attached to the application.</li>
                        <li>Attend an interview and sit for the entrance examination on the assigned date.</li>
                        <li>Upon successful completion of the examination and interview, an offer of admission will be issued.</li>
                    </ol>
                </section>

                <section className="admissions-section">
                    <h2>Acceptance of Admission</h2>
                    <ul>
                        <li>Upon receipt of the provisional admission letter, fill out and sign the Acceptance of Admission form.</li>
                        <li>Pay the required school fees (detailed below) before the deadline to secure your spot.</li>
                    </ul>
                </section>

                <section className="admissions-section">
                    <h2>Payment Instructions</h2>
                    <ol>
                        <li>School fees must be paid by the second week of each term.</li>
                        <li>
                            Payment can be made via Online payment gateway and bank transfer to:

                        </li>
                        <li>Keep proof of payment as it must be presented during registration.</li>
                    </ol>
                </section>

                <section className="admissions-section">
                    <h2>School Fees Breakdown (New Intake)</h2>
                    <p style={{ color: "#1a1a2e", fontWeight: "500" }}> NEW INTAKE: JSS1, JSS2, JSS3, SS1, SS2, SS3</p>
                    <ul>
                        <li>JSS 1-2: N77,000 (Male), N82,000 (Female)</li>
                        <li>JSS 3: N219,000 (Male), N224,000 (Female) (Note: Three terms school fees, uniforms, Bece Examination fees, Graduation fee are not included)</li>

                        <li>SSS 1-2: N83,000 (Male), N89,000 (Female)</li>
                        <li>SSS 3: N298,000 (Male), N304,000 (Female) (Note: Three terms school fees, WAEC and NECO Examination fees, Graduation fees are not included)</li>
                        <li>Additional charges may apply for uniforms, practicals, and optional school bus services.</li>
                    </ul>

                    <h2>School Fees Breakdown (Returning)</h2>
                    <p style={{ color: "#1a1a2e", fontWeight: "500" }}> RETURNING STUDENTS: JSS2, JSS3, SS1, SS2, SS3</p>
                    <ul>
                        <li>JSS 2: N41,000</li>
                        <li>JSS 3: N183,000 (Note: These amounts contains three terms school fees, uniforms, Bece Examination fees, etc, BUT GRADUATION FEE NOT INCLUDED)</li>
                        <li>SSS 1: N64,000 (Male), N65,000 (Female)</li>
                        <li>SSS 2 (Arts/Commercial): N45,000</li>
                        <li>SSS 2 (Science): N46,000</li>
                        <li>SSS 3 : N260,000 (Note: These amounts contains three terms school fees, WAEC and NECO Examination fees, etc, BUT GRADUATION FEE NOT INCLUDED)</li>
                        <li>PLEASE NOTE, GRADUATION FEE WILL BE COMMUNICATED TO US AS WHEN DUE</li>
                        <li>PTA; N1,000 (For each student)</li>
                        <li>Additional charges may apply for uniforms, practicals, and optional school bus services.</li>
                    </ul>

                    <h2>Payment Method</h2>
                    <ul>
                        <li style={{ color: "#1a1a2e", fontWeight: "500" }}> For JSS1, JSS2, SS1 and SS2</li>
                        <li>FCMB Bank: Account Number: <span style={{ color: "#1a1a2e", fontWeight: "500" }}>9122722015</span> (PenWorld Nursery, Primary and Secondary School)</li>
                        <li>First Bank: Account Number: <span style={{ color: "#1a1a2e", fontWeight: "500" }}>2035749624</span> (PenWorld Nursery, Primary and Secondary School)</li>
                    </ul>

                    <ul>
                        <li style={{ color: "#1a1a2e", fontWeight: "500" }}> For JSS3 and SS3</li>
                        <li>KCM'B Micro Finance Bank: Account Number: <span style={{ color: "#1a1a2e", fontWeight: "500" }}>1100282794</span> (PenWorld Nursery, Primary and Secondary School)</li>
                    </ul>
                </section>

                <section className="admissions-section">
                    <h2>Uniforms and Materials</h2>
                    <ol>
                        <li>All students are required to purchase uniforms, sportswear, and cardigans directly from the school.</li>
                        <li>
                            Students must also have the following materials:
                            <ul>
                                <li>All required textbooks</li>
                                <li>Holy Bible (RSV)</li>
                                <li>Music manual, drawing sets, and stationery</li>
                            </ul>
                        </li>
                        <li>These will be checked by the class teacher at the beginning of the term.</li>
                    </ol>
                </section>

                <section className="admissions-section">
                    <h2>Resumption Date</h2>
                    <ul>
                        <li>The school will notify you of the exact resumption date following the completion of the admission process.</li>
                    </ul>
                </section>
            </div>
        </main >
    );
}
