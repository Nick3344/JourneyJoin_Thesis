import react from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Home from "./pages/Home"
import NotFound from "./pages/NotFound"
import ProtectedRoute from "./components/ProtectedRoute"
import Profile from "./pages/Profile";
import FindPeople from "./pages/FindPeople";
import Matches from "./pages/Matches";
import GuideRegister from "./pages/GuideRegister";
import GuideLogin from "./pages/GuideLogin"; 
import GuideHome from "./pages/GuideHome";
import GuideProfile from "./pages/GuideProfile";
import SearchLocalGuides from "./pages/SearchLocalGuides";
import GuideMatches from "./pages/GuideMatches";
import ChatThreads from "./pages/ChatThreads";
import ThreadDetail from "./pages/ThreadDetail";



function Logout() {
  localStorage.clear()
  return <Navigate to="/login" />
}

function RegisterAndLogout() {
  localStorage.clear()
  return <Register />
}

console.log("ENV API URL:", import.meta.env.VITE_API_URL);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<RegisterAndLogout />} />
        <Route path="*" element={<NotFound />}></Route>
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/find-people"
          element={
            <ProtectedRoute>
              <FindPeople />
            </ProtectedRoute>
          }
        />
        <Route
          path="/matches"
          element={
            <ProtectedRoute>
              <Matches />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guide/home"
          element={<GuideHome />}
        />
        <Route
          path="/guide/profile"
          element={
            <GuideProfile />
          }
        />
        <Route path="*" element={<NotFound />} />
        <Route path="/guide/register/" element={<GuideRegister />} />
        <Route path="/guide/login" element={<GuideLogin />} />
        <Route path="/local-guides" element={<SearchLocalGuides />} />
        <Route path="/local-guides/matches" element={<GuideMatches />} />
        <Route path="/acs/chat/threads" element={<ChatThreads />} />
        <Route path="/acs/chat/thread" element={<ThreadDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App