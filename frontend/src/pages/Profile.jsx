import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/Profile.css"; 

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState([]); 
  const [selectedFile, setSelectedFile] = useState(null);
  
  // For the production now We assume successfulTrips and credibilityScore might be read-only or user-editable
  const [successfulTrips, setSuccessfulTrips] = useState(0);
  const [credibilityScore, setCredibilityScore] = useState(0.0);

  // Possible interest options for checkboxes
  const interestOptions = [
    "Hiking",
    "City Tours",
    "Beach Vacations",
    "Adventure Sports",
    "Party",
    "Foodie",
    "Nightlife",
    "Culture",
    "Shopping",
    "Spa & Wellness"
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/profile");
      setUser(res.data);

      // Populate local state with existing profile fields
      setUsername(res.data.username || "");
      setCity(res.data.city || "");
      setBio(res.data.bio || "");
      setInterests(res.data.interests || []);
      setSuccessfulTrips(res.data.successful_trips || 0);
      setCredibilityScore(res.data.credibility_score || 0);
    } catch (error) {
      console.error(error);
      setErrorMessage("Error fetching profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (interest) => {
    
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      // Build the data object based on what user can update
      const body = {
        username,
        city,
        bio,
        interests,
        // if password is empty, we won't update it
        ...(password ? { password } : {}),
        // If you allow user to edit these:
        successful_trips: successfulTrips,
        credibility_score: credibilityScore,
      };

      const res = await api.put("/profile", body);
      alert("Profile updated successfully!");
      // Re-fetch profile to see changes
      fetchProfile();
      setPassword(""); // clear password field
    } catch (err) {
      console.error(err);
      alert("Error updating profile.");
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadPicture = async () => {
    if (!selectedFile) {
      alert("No file selected!");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      await api.post("/profile/upload-pic", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Profile picture uploaded successfully!");
      // Re-fetch to update user.profile_pic path
      fetchProfile();
    } catch (error) {
      console.error(error);
      alert("Error uploading picture.");
    }
  };

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  if (errorMessage) {
    return <div className="profile-error">{errorMessage}</div>;
  }

  if (!user) {
    return <div className="profile-error">User not found or error fetching profile.</div>;
  }

  return (
    <div className="profile-container">
      <h1>Profile</h1>

      {/* Display current profile pic if exists */}
      <div className="profile-pic-section">
        {user.profile_pic ? (
          <img
            src={`http://127.0.0.1:5000/${user.profile_pic}`} 
            alt="Profile"
            className="profile-pic"
          />
        ) : (
          <div className="no-pic">No Profile Picture</div>
        )}
      </div>

      {/* Upload new picture */}
      <div className="upload-pic-section">
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUploadPicture}>Upload Picture</button>
      </div>

      {/* Display read-only or editable stats (successful trips, credibility) */}
      <div className="stats-section">
        <p>Successful Trips: {successfulTrips}</p>
        <p>Credibility Score: {credibilityScore.toFixed(1)}</p>
      </div>

      {/* Form to edit profile fields */}
      <div className="profile-form">
        <label>Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label>New Password (leave empty to keep existing)</label>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label>Destination</label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />

        <label>Bio</label>
        <textarea
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />

        <label>Interests</label>
        <div className="interests-checkboxes">
          {interestOptions.map((option) => (
            <div key={option}>
              <input
                type="checkbox"
                checked={interests.includes(option)}
                onChange={() => handleCheckboxChange(option)}
              />
              <span>{option}</span>
            </div>
          ))}
        </div>

        {/* If you decide to let user update these fields manually: */}
        <label>Successful Trips</label>
        <input
          type="number"
          min="0"
          value={successfulTrips}
          onChange={(e) => setSuccessfulTrips(Number(e.target.value))}
        />

        <label>Credibility Score (0 - 5)</label>
        <input
          type="number"
          step="0.1"
          min="0"
          max="5"
          value={credibilityScore}
          onChange={(e) => setCredibilityScore(Number(e.target.value))}
        />

        <button onClick={handleUpdateProfile}>Update Profile</button>
      </div>

      <button className="back-home" onClick={() => navigate("/")}>
        Back to Home
      </button>
    </div>
  );
}

export default Profile;
