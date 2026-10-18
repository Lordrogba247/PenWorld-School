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
                        <li>Obtain form from the School</li>
                        <li>Sit for entrance and placement exam</li>
                        <li>Admission and acceptance/Payment of school fees</li>
                        <li>Upon successful completion of the examination and interview, an offer of admission will be issued.</li>
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
