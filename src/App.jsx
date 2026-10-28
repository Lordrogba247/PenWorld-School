import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import ScrollToTop from './Landing/ScrollToTop'
import Navbar from './Landing/1Navbar/Navbar'
import Hero from './Landing/2Hero/Hero'
import Unique from './Landing/3Unique/Unique'
import Enrol from './Landing/4Enrol/Enrol'
import Footer from './Landing/5Footer/Footer'
import Policy from './Landing/5Footer/Policy'
import Terms from './Landing/5Footer/Terms'
import About from './Landing/About/About'
import Admissions from './Landing/Admissions/Admissions'
import Portal from './Portal/Portal'

import StudentLogin from './Portal/Student/1Login'
import StudentLayout from './Portal/Student/StudentLayout'
import StudentDashboard from './Portal/Student/2Dashboard'
import StudentAssignment from './Portal/Student/3Assignment'
import StudentOnlineClass from './Portal/Student/4Online'
import StudentResults from './Portal/Student/5Result'
import StudentCBT from './Portal/Student/6CBT'
import StudentProfile from './Portal/Student/7Profile'
import StudentCBTExam from './Portal/Student/8CBTExam'

import StaffLogin from './Portal/Staff/1Login'
import StaffLayout from './Portal/Staff/StaffLayout'
import StaffDashboard from './Portal/Staff/2Dashboard'
import StudentsList from './Portal/Staff/3Student'
import StaffAssignment from './Portal/Staff/5Assignment'
import StaffOnlineClass from './Portal/Staff/6OnlineClass'
import StaffResults from './Portal/Staff/7Result'
import StaffResultEntry from './Portal/Staff/8Result2'
import StaffCBT from './Portal/Staff/9CBT'
import StaffProfile from './Portal/Staff/10Profile'

import AdminLogin from './Portal/Admin/1Login'
import AdminLayout from './Portal/Admin/AdminLayout'
import AdminDashboard from './Portal/Admin/2Dashboard'
import AdminStudentsList from './Portal/Admin/3Student'
import AdminStaffList from './Portal/Admin/5Staff'
import AdminClasses from './Portal/Admin/6Classes'
import AdminAssignments from './Portal/Admin/7Assignment'
import AdminOnlineClass from './Portal/Admin/8OnlineClasses'
import AdminResultsList from './Portal/Admin/9Result'
import AdminResultView from './Portal/Admin/9Result2'
import AdminResultEntry from './Portal/Admin/9Result3'
import AdminCBT from './Portal/Admin/10CBT'
import AdminProfile from './Portal/Admin/11Profile';
import AdminBulkData from './Portal/Admin/12BulkData';

// Landing pages go use this wrapper — Navbar + Footer show here only
function LandingLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* ===== Landing ===== */}
        <Route path="/" element={
          <LandingLayout>
            <Hero />
            <Unique />
            <Enrol />
          </LandingLayout>
        } />
        <Route path="/about" element={<LandingLayout><About /></LandingLayout>} />
        <Route path="/admissions" element={<LandingLayout><Admissions /></LandingLayout>} />
        <Route path="/privacy-policy" element={<LandingLayout><Policy /></LandingLayout>} />
        <Route path="/terms-of-use" element={<LandingLayout><Terms /></LandingLayout>} />

        {/* ===== Portal — clean, no Navbar/Footer ===== */}
        <Route path="/portal" element={<Portal />} />
        <Route path="/portal/student/login" element={<StudentLogin />} />
        <Route path="/portal/staff/login" element={<StaffLogin />} />
        <Route path="/portal/admin/login" element={<AdminLogin />} />

        {/*  Student Portal  */}
        <Route path="/portal/student" element={<StudentLayout />}>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="assignments" element={<StudentAssignment />} />
          <Route path="online-classes" element={<StudentOnlineClass />} />
          <Route path="results" element={<StudentResults />} />
          <Route path="cbt" element={<StudentCBT />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>
        {/* CBT exam runs FULLSCREEN — outside StudentLayout so no sidebar/topbar shows */}
        <Route path="/portal/student/cbt/:testId" element={<StudentCBTExam />} />

        {/*  Staff Portal  */}
        <Route path="/portal/staff" element={<StaffLayout />}>
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="students" element={<StudentsList />} />
          <Route path="assignments" element={<StaffAssignment />} />
          <Route path="online-classes" element={<StaffOnlineClass />} />
          <Route path="results" element={<StaffResults />} />
          <Route path="results/:studentId" element={<StaffResultEntry />} />
          <Route path="cbt" element={<StaffCBT />} />
          <Route path="profile" element={<StaffProfile />} />
        </Route>
        {/*  Admin Portal  */}
        <Route path="/portal/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="students" element={<AdminStudentsList />} />
          <Route path="staff" element={<AdminStaffList />} />
          <Route path="classes" element={<AdminClasses />} />
          <Route path="assignments" element={<AdminAssignments />} />
          <Route path="online-classes" element={<AdminOnlineClass />} />
          <Route path="results" element={<AdminResultsList />} />
          <Route path="results/:studentId" element={<AdminResultView />} />
          <Route path="results/:studentId/edit" element={<AdminResultEntry />} />
          <Route path="cbt" element={<AdminCBT />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="bulk-data" element={<AdminBulkData />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App