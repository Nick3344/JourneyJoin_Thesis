import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/GuideProfile.css";

function GuideProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    username: "",
    full_name: "",
    contact_email: "",
    contact_phone: "",
    city: "",
    country: "",
    bio: "",
    experience_years: 0,
    rating: 0,
    service_offerings: [], 
    tour_details: ""
  });
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicURL, setProfilePicURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const possibleServices = [
    "City Tours",
    "Food Tours",
    "Historical Tours",
    "Adventure Activities",
    "Nightlife Guiding",
    "Cultural Experiences",
    "Shopping Assistance",
    "Transportation Services",
    "Photography Guide",
    "Custom Private Tours"
  ];

  useEffect(() => {
    fetchGuideProfile();
  }, []);

  const fetchGuideProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/guide/profile");
      console.log("Guide profile GET response:", res.data);
      const data = res.data;
      setProfile({
        username: data.username || "",
        full_name: data.full_name || "",
        contact_email: data.contact_email || "",
        contact_phone: data.contact_phone || "",
        city: data.city || "",
        country: data.country || "",
        bio: data.bio || "",
        experience_years: data.experience_years || 0,
        rating: data.rating || 0,
        service_offerings: data.service_offerings || [],
        tour_details: data.tour_details || ""
      });
      if (data.profile_pic) {
        setProfilePicURL(data.profile_pic);
      }
    } catch (err) {
      console.error("Error fetching guide profile:", err);
      setError("Failed to fetch guide profile.");
    } finally {
      setLoading(false);
    }
  };

  // Generic change handler for text/number fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // For checkboxes: toggle the service in the array
  const handleCheckboxChange = (service) => {
    setProfile((prev) => {
      const current = prev.service_offerings;
      if (current.includes(service)) {
        return { ...prev, service_offerings: current.filter((s) => s !== service) };
      } else {
        return { ...prev, service_offerings: [...current, service] };
      }
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const payload = {
        full_name: profile.full_name,
        contact_email: profile.contact_email,
        contact_phone: profile.contact_phone,
        city: profile.city,
        country: profile.country,
        bio: profile.bio,
        experience_years: Number(profile.experience_years),
        rating: Number(profile.rating),
        service_offerings: profile.service_offerings, // sending array
        tour_details: profile.tour_details
      };
      console.log("PUT payload:", payload);
      await api.put("/guide/profile", payload);
      setSuccessMsg("Guide profile updated successfully!");
    } catch (err) {
      console.error("Error updating guide profile:", err);
      setError("Failed to update guide profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setProfilePicFile(e.target.files[0]);
    }
  };

  const handleUploadProfilePic = async () => {
    if (!profilePicFile) {
      alert("Please select a file to upload.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", profilePicFile);
      await api.post("/guide/profile/upload-pic", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      fetchGuideProfile();
    } catch (err) {
      console.error("Error uploading profile pic:", err);
      setError("Failed to upload profile picture.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="guide-profile-container">
      <h2>Guide Profile</h2>
      {loading && <p className="loading-indicator">Loading...</p>}
      {error && <p className="error-message">{error}</p>}
      {successMsg && <p className="success-message">{successMsg}</p>}

      <form onSubmit={handleUpdateProfile} className="guide-profile-form">
        <div className="form-group">
          <label>Username (read-only):</label>
          <input type="text" value={profile.username} readOnly />
        </div>
        <div className="form-group">
          <label>Full Name:</label>
          <input
            type="text"
            name="full_name"
            value={profile.full_name}
            onChange={handleChange}
            placeholder="Full Name"
          />
        </div>
        <div className="form-group">
          <label>Contact Email:</label>
          <input
            type="email"
            name="contact_email"
            value={profile.contact_email}
            onChange={handleChange}
            placeholder="Email"
          />
        </div>
        <div className="form-group">
          <label>Contact Phone:</label>
          <input
            type="text"
            name="contact_phone"
            value={profile.contact_phone}
            onChange={handleChange}
            placeholder="Phone Number"
          />
        </div>
        <div className="form-group">
          <label>City:</label>
          <input
            type="text"
            name="city"
            value={profile.city}
            onChange={handleChange}
            placeholder="City"
          />
        </div>
        <div className="form-group">
          <label>Country:</label>
          <input
            type="text"
            name="country"
            value={profile.country}
            onChange={handleChange}
            placeholder="Country"
          />
        </div>
        <div className="form-group">
          <label>Bio:</label>
          <textarea
            name="bio"
            rows={3}
            value={profile.bio}
            onChange={handleChange}
            placeholder="Short bio or description"
          />
        </div>
        <div className="form-group">
          <label>Years of Experience:</label>
          <input
            type="number"
            name="experience_years"
            value={profile.experience_years}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Rating (0-5):</label>
          <input
            type="number"
            step="0.1"
            name="rating"
            value={profile.rating}
            onChange={handleChange}
          />
        </div>

        {/* Service Offerings Checkboxes */}
        <div className="form-group">
          <label>Service Offerings:</label>
          <div className="checkbox-list">
            {possibleServices.map((service) => (
              <label key={service} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={profile.service_offerings.includes(service)}
                  onChange={() => handleCheckboxChange(service)}
                />
                {service}
              </label>
            ))}
          </div>
        </div>

        {/* Tour Details as a text area */}
        <div className="form-group">
          <label>Tour Details:</label>
          <textarea
            name="tour_details"
            rows={3}
            value={profile.tour_details}
            onChange={handleChange}
            placeholder="Describe your main tour offering or highlight"
          />
        </div>

        <button type="submit" className="submit-button">
          Save Profile
        </button>
      </form>

      {/* Profile Picture Upload Section */}
      <div className="profile-pic-section">
        <h3>Profile Picture</h3>
        {profilePicURL && (
          <img
            src={`http://127.0.0.1:5000/${profilePicURL}`}
            alt="Profile"
            className="profile-pic"
          />
        )}
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUploadProfilePic} className="upload-button">
          Upload Picture
        </button>
      </div>
    </div>
  );
}

export default GuideProfile;
