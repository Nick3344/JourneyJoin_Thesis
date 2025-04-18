import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout"; // This layout includes the header
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
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
import { Navigate as Nav } from "react-router-dom";

function Logout() {
  localStorage.clear();
  return <Nav to="/login" />;
}

function RegisterAndLogout() {
  localStorage.clear();
  return <Register />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes (no layout) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterAndLogout />} />
        <Route path="/guide/login" element={<GuideLogin />} />
        <Route path="/guide/register" element={<GuideRegister />} />

        {/* Routes that require authentication go under Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="profile" element={<Profile />} />
          <Route path="find-people" element={<FindPeople />} />
          <Route path="matches" element={<Matches />} />
          <Route path="local-guides" element={<SearchLocalGuides />} />
          <Route path="local-guides/matches" element={<GuideMatches />} />
          <Route path="guide/home" element={<GuideHome />} />
          <Route path="guide/profile" element={<GuideProfile />} />
          <Route path="acs/chat/threads" element={<ChatThreads />} />
          <Route path="acs/chat/thread" element={<ThreadDetail />} />
        </Route>

        <Route path="/logout" element={<Logout />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
